import { describe, it, expect } from "vitest";
import { shouldExcludeFile } from "../path-utils";

describe("shouldExcludeFile", () => {
  it("excludes files in excluded folder", () => {
    expect(shouldExcludeFile("Templates/daily.md", ["Templates"])).toBe(true);
  });

  it("excludes files in nested folders", () => {
    expect(
      shouldExcludeFile("Templates/subfolder/note.md", ["Templates"]),
    ).toBe(true);
  });

  it("does not exclude files in similar folder names", () => {
    expect(shouldExcludeFile("My Templates/note.md", ["Templates"])).toBe(
      false,
    );
  });

  it("handles multiple exclusions", () => {
    expect(shouldExcludeFile("Archive/old.md", ["Templates", "Archive"])).toBe(
      true,
    );
    expect(
      shouldExcludeFile("Templates/note.md", ["Templates", "Archive"]),
    ).toBe(true);
  });

  it("allows all files when exclusion list is empty", () => {
    expect(shouldExcludeFile("Templates/note.md", [])).toBe(false);
  });

  it("normalizes paths with trailing slashes", () => {
    expect(shouldExcludeFile("Templates/file.md", ["Templates/"])).toBe(true);
  });

  it("handles exact match for root-level files", () => {
    expect(shouldExcludeFile("Templates", ["Templates"])).toBe(true);
  });

  it("does not match partial folder names", () => {
    expect(shouldExcludeFile("TemplatesNew/note.md", ["Templates"])).toBe(
      false,
    );
  });
});
