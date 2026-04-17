import { execSync } from "node:child_process";

const STABLE_BRANCHES = ["main"];
const STABLE_PATTERNS = [/^release\/.+$/];
const BETA_BRANCHES = ["beta", "next"];
const ALPHA_BRANCHES = ["alpha", "dev"];

function getCurrentBranch(): string {
  return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
}

function resolveChannel(branch: string): string | null {
  if (STABLE_BRANCHES.includes(branch)) return null;
  if (STABLE_PATTERNS.some((p) => p.test(branch))) return null;
  if (BETA_BRANCHES.includes(branch)) return "beta";
  if (ALPHA_BRANCHES.includes(branch)) return "alpha";

  console.error(
    `Error: unrecognized branch "${branch}".\n` +
      `Allowed branches:\n` +
      `  stable:  main, release/*\n` +
      `  beta:    beta, next\n` +
      `  alpha:   alpha, dev\n`,
  );
  process.exit(1);
}

function checkEvenOddGuard(channel: string | null): void {
  const version = execSync(
    'node -e "process.stdout.write(require(\'./package.json\').version)"',
    { encoding: "utf-8" },
  );
  const major = parseInt(version.split(".")[0], 10);

  if (channel === null && major % 2 !== 0) {
    console.warn(
      `Warning: stable release with odd major version (${major}). ` +
        `Even majors are LTS by convention.`,
    );
  }
}

const branch = getCurrentBranch();
const channel = resolveChannel(branch);
const isDryRun = process.argv.includes("--dry-run");

console.log(`Branch: ${branch}`);
console.log(`Channel: ${channel ?? "stable"}`);
if (isDryRun) console.log("Mode: dry-run");

checkEvenOddGuard(channel);

const args: string[] = [];
if (channel) args.push(`--preRelease=${channel}`);
if (isDryRun) args.push("--dry-run");

execSync(`pnpm exec release-it ${args.join(" ")}`, { stdio: "inherit" });
