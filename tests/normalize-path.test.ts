import { describe, it, expect } from "vitest";
import { normalizePath } from "../src/normalize-path";

describe("normalizePath", () => {
  it("strips a leading slash", () => {
    expect(normalizePath("/Notes/Hello.md")).toBe("Notes/Hello.md");
  });

  it("strips trailing slashes", () => {
    expect(normalizePath("Journal/")).toBe("Journal");
  });

  it("strips multiple leading and trailing slashes", () => {
    expect(normalizePath("///Journal///")).toBe("Journal");
  });

  it("converts backslashes to forward slashes", () => {
    expect(normalizePath("Journal\\2026\\Note.md")).toBe("Journal/2026/Note.md");
  });

  it("trims whitespace", () => {
    expect(normalizePath("  Journal/2026  ")).toBe("Journal/2026");
  });

  it("returns empty string for a lone slash", () => {
    expect(normalizePath("/")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePath("")).toBe("");
  });

  it("leaves a plain path unchanged", () => {
    expect(normalizePath("Folder/Note.md")).toBe("Folder/Note.md");
  });
});
