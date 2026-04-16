#!/usr/bin/env bash
#
# Post-clone initialization script for the Cross UI Template.
#
# Replaces the @cross-ui/ scope with the user's project name across all files
# in the repo, regenerates the lockfile, then deletes itself.
#
# Usage:
#   ./scripts/init.sh <project-name>
#   ./scripts/init.sh --dry-run [project-name]
#   pnpm run init
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SCOPE_PREFIX="@cross-ui/"
ROOT_NAME="cross-ui-template"

# -- Parse arguments -----------------------------------------------------------

DRY_RUN=false
PROJECT_NAME=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [project-name]"
      echo ""
      echo "Personalizes the template by replacing @cross-ui/ scope and"
      echo "cross-ui-template with your project name."
      echo ""
      echo "Options:"
      echo "  --dry-run   Show what would change without modifying files"
      echo "  --help      Show this help message"
      exit 0
      ;;
    *) PROJECT_NAME="$arg" ;;
  esac
done

# -- Detect project name -------------------------------------------------------

if [ -z "$PROJECT_NAME" ]; then
  FOLDER_NAME="$(basename "$ROOT_DIR")"
  if [ "$FOLDER_NAME" != "cross-ui-template" ] && [[ "$FOLDER_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
    PROJECT_NAME="$FOLDER_NAME"
    echo "Using folder name as project name: $PROJECT_NAME"
  fi
fi

if [ -z "$PROJECT_NAME" ]; then
  printf "Enter project name: "
  read -r PROJECT_NAME
fi

# -- Validate ------------------------------------------------------------------

if [ -z "$PROJECT_NAME" ]; then
  echo "Error: project name is required." >&2
  exit 1
fi

if ! [[ "$PROJECT_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: Invalid project name \"$PROJECT_NAME\"." >&2
  echo "Must be lowercase, start with a letter, and contain only letters, numbers, and hyphens." >&2
  exit 1
fi

NEW_SCOPE="@${PROJECT_NAME}/"

echo ""
echo "Initializing template as \"$PROJECT_NAME\"..."
echo ""

# -- Directories to skip -------------------------------------------------------

SKIP_PRUNE=(
  -path "*/node_modules" -prune -o
  -path "*/.git" -prune -o
  -path "*/.generated" -prune -o
  -path "*/dist" -prune -o
  -path "*/target" -prune -o
  -path "*/storybook-static" -prune -o
  -name "pnpm-lock.yaml" -prune -o
)

BINARY_EXTENSIONS="\.(png|jpg|jpeg|gif|ico|webp|svg|woff|woff2|ttf|eot|otf|zip|tar|gz|br|pdf)$"

# -- Find matching files -------------------------------------------------------

MATCHING_FILES=()
while IFS= read -r -d '' file; do
  # Skip binary files
  if echo "$file" | grep -qE "$BINARY_EXTENSIONS"; then
    continue
  fi

  if grep -ql "$SCOPE_PREFIX\|$ROOT_NAME" "$file" 2>/dev/null; then
    MATCHING_FILES+=("$file")
  fi
done < <(find "$ROOT_DIR" "${SKIP_PRUNE[@]}" -type f -print0)

if [ ${#MATCHING_FILES[@]} -eq 0 ]; then
  echo "Warning: No $SCOPE_PREFIX or $ROOT_NAME references found. Already initialized?"
  exit 0
fi

# -- Dry run -------------------------------------------------------------------

if [ "$DRY_RUN" = true ]; then
  echo "Dry run -- the following changes WOULD be made:"
  echo ""
  for file in "${MATCHING_FILES[@]}"; do
    REL="${file#"$ROOT_DIR"/}"
    SCOPE_COUNT=$({ grep -o "$SCOPE_PREFIX" "$file" 2>/dev/null || true; } | wc -l | tr -d ' ')
    ROOT_COUNT=$({ grep -o "$ROOT_NAME" "$file" 2>/dev/null || true; } | wc -l | tr -d ' ')
    echo "  $REL:"
    if [ "$SCOPE_COUNT" -gt 0 ]; then
      echo "    $SCOPE_PREFIX -> $NEW_SCOPE ($SCOPE_COUNT)"
    fi
    if [ "$ROOT_COUNT" -gt 0 ]; then
      echo "    $ROOT_NAME -> $PROJECT_NAME ($ROOT_COUNT)"
    fi
  done
  echo ""
  echo "  Total: ${#MATCHING_FILES[@]} files would be modified"
  echo "  pnpm install would run"
  echo "  scripts/init.sh would be deleted"
  echo "  \"init\" script would be removed from root package.json"
  echo ""
  echo "No files were modified."
  exit 0
fi

# -- Apply replacements -------------------------------------------------------

# Prefer sd (Rust) over sed for safety, fall back to sed
if command -v sd &>/dev/null; then
  REPLACE_CMD="sd"
else
  REPLACE_CMD="sed"
fi

for file in "${MATCHING_FILES[@]}"; do
  REL="${file#"$ROOT_DIR"/}"
  if [ "$REPLACE_CMD" = "sd" ]; then
    sd "$SCOPE_PREFIX" "$NEW_SCOPE" "$file"
    sd "$ROOT_NAME" "$PROJECT_NAME" "$file"
  else
    # macOS sed needs -i '' ; Linux sed needs -i
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|${SCOPE_PREFIX}|${NEW_SCOPE}|g" "$file"
      sed -i '' "s|${ROOT_NAME}|${PROJECT_NAME}|g" "$file"
    else
      sed -i "s|${SCOPE_PREFIX}|${NEW_SCOPE}|g" "$file"
      sed -i "s|${ROOT_NAME}|${PROJECT_NAME}|g" "$file"
    fi
  fi
  echo "  ✔ $REL"
done

# -- pnpm install --------------------------------------------------------------

echo ""
echo "Regenerating lockfile with pnpm install..."
pnpm install || echo "Warning: pnpm install failed. You may need to run it manually."

# -- Self-cleanup --------------------------------------------------------------

echo ""
echo "Cleaning up init script..."

# Remove "init" script from root package.json
INIT_LINE='"init": "./scripts/init.sh"'
PKG_FILE="$ROOT_DIR/package.json"

if [ "$REPLACE_CMD" = "sd" ]; then
  # Remove the init line and any trailing comma/whitespace issues
  sd '^\s*"init": "\./scripts/init\.sh",?\n?' '' "$PKG_FILE"
else
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '/"init": "\.\/scripts\/init\.sh"/d' "$PKG_FILE"
  else
    sed -i '/"init": "\.\/scripts\/init\.sh"/d' "$PKG_FILE"
  fi
fi
echo "  ✔ Removed 'init' script from root package.json"

# Delete this script
rm -f "$SCRIPT_DIR/init.sh"
echo "  ✔ Deleted scripts/init.sh"

# Remove scripts/ dir if empty (doctor.ts will remain, so it won't be empty)
if [ -d "$SCRIPT_DIR" ] && [ -z "$(ls -A "$SCRIPT_DIR")" ]; then
  rmdir "$SCRIPT_DIR"
  echo "  ✔ Removed empty scripts/ directory"
fi

echo ""
echo "Done! Project \"$PROJECT_NAME\" is ready."
