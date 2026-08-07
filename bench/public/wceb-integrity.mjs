import { execFileSync } from "node:child_process";
import path from "node:path";

function git(directory, ...args) {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function isWithin(directory, candidate) {
  const relative = path.relative(path.resolve(directory), path.resolve(candidate));
  return relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

/**
 * Verify the pinned WCEB checkout without rejecting unrelated, untracked
 * benchmark outputs. Tracked changes anywhere in the checkout fail closed;
 * untracked files fail closed when they are under the evaluated split inputs.
 */
export function assertWcebCheckout({ dataset, split, expectedRevision, output = "" }) {
  const revision = git(dataset, "rev-parse", "HEAD");
  if (revision !== expectedRevision) {
    throw new Error(`WCEB revision mismatch: expected ${expectedRevision}, received ${revision}.`);
  }

  const trackedChanges = git(dataset, "status", "--porcelain=v1", "--untracked-files=no");
  if (trackedChanges) {
    throw new Error(`WCEB checkout has tracked changes:\n${trackedChanges}`);
  }

  const inputPathspecs = [`${split}/ground-truth`, `${split}/html`];
  const evaluatedInputChanges = git(
    dataset,
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--ignored=matching",
    "--",
    ...inputPathspecs
  );
  if (evaluatedInputChanges) {
    throw new Error(
      `WCEB evaluated inputs must be clean, including untracked or ignored files:\n${evaluatedInputChanges}`
    );
  }

  if (output) {
    for (const relative of inputPathspecs) {
      const inputDirectory = path.join(dataset, relative);
      if (isWithin(inputDirectory, output)) {
        throw new Error(`Benchmark output must be outside evaluated WCEB inputs: ${inputDirectory}`);
      }
    }
  }

  return revision;
}
