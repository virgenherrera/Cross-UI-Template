#!/usr/bin/env bash
set -euo pipefail

# Pipeline orchestrator — builds, captures, and validates the full pipeline.
# Usage: ./scripts/pipeline.sh [capture|validate|full]
# Default: full (capture + validate)

STORYBOOK_PORT="${STORYBOOK_PORT:-6006}"
APP_PORT="${APP_PORT:-8080}"
MODE="${1:-full}"
PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  PIDS=()
}
trap cleanup EXIT

wait_for_port() {
  local port="$1" label="$2" retries=30
  while ! curl -sf "http://localhost:${port}" >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "ERROR: ${label} did not start on port ${port}" >&2
      exit 1
    fi
    sleep 1
  done
  echo "  ${label} ready on :${port}"
}

run_capture() {
  echo "=== Step 1: Build Storybook ==="
  pnpm run spec:build

  echo "=== Step 2: Serve Storybook ==="
  pnpm dlx http-server .generated/reports/storybook-static -p "$STORYBOOK_PORT" -c-1 &
  PIDS+=($!)
  wait_for_port "$STORYBOOK_PORT" "Storybook"

  echo "=== Step 3: Capture golden PNGs ==="
  STORYBOOK_URL="http://localhost:${STORYBOOK_PORT}" pnpm run artifacts:capture

  echo "  Killing Storybook server"
  kill "${PIDS[-1]}" 2>/dev/null || true
  PIDS=("${PIDS[@]:0:${#PIDS[@]}-1}")

  echo "=== Capture complete ==="
}

run_validate() {
  echo "=== Step 4: Start web app ==="
  pnpm run app:dev &
  PIDS+=($!)
  wait_for_port "$APP_PORT" "Web app"

  echo "=== Step 5: Run E2E visual regression ==="
  APP_URL="http://localhost:${APP_PORT}" pnpm run e2e:web

  echo "  Killing web app server"
  kill "${PIDS[-1]}" 2>/dev/null || true
  PIDS=("${PIDS[@]:0:${#PIDS[@]}-1}")

  echo "=== Validation complete ==="
}

case "$MODE" in
  capture)  run_capture ;;
  validate) run_validate ;;
  full)     run_capture && run_validate ;;
  *)        echo "Usage: $0 [capture|validate|full]" >&2; exit 1 ;;
esac

echo "=== Pipeline finished ==="
