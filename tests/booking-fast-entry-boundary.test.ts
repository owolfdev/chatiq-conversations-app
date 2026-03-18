import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function collectRuntimeFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  entries.forEach((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRuntimeFiles(fullPath));
      return;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  });

  return files;
}

describe("booking fast-entry ownership boundary", () => {
  it("keeps the Inbox app free of LIFF and booking handoff runtime ownership", () => {
    const runtimeRoots = ["app", "components", "lib"].map((segment) =>
      path.join(process.cwd(), "src", segment)
    );
    const disallowedPatterns = [/liff/i, /booking_handoff/i, /line_entry/i];

    const matches: string[] = [];

    runtimeRoots.forEach((root) => {
      collectRuntimeFiles(root).forEach((filePath) => {
        const contents = fs.readFileSync(filePath, "utf8");
        if (disallowedPatterns.some((pattern) => pattern.test(contents))) {
          matches.push(path.relative(process.cwd(), filePath));
        }
      });
    });

    expect(matches).toEqual([]);
  });
});
