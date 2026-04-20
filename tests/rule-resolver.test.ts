import { describe, it, expect } from "vitest";
import { RuleResolver } from "../src/rule-resolver";
import { PluginSettings } from "../src/types";

function makeResolver(settings: Partial<PluginSettings> = {}): RuleResolver {
  const full: PluginSettings = {
    rules: [],
    globalDefault: "obsidian-default",
    applyOnWorkspaceRestore: false,
    applyOnNavigation: true,
    ...settings
  };
  return new RuleResolver(() => full);
}

describe("RuleResolver", () => {
  it("returns null for empty file path", () => {
    expect(makeResolver().resolve("")).toBeNull();
  });

  it("returns null when no rules match and global default is obsidian-default", () => {
    expect(makeResolver().resolve("Note.md")).toBeNull();
  });

  it("returns the global default when no rules match", () => {
    const r = makeResolver({ globalDefault: "source" });
    expect(r.resolve("Note.md")).toBe("source");
  });

  it("matches an exact note rule", () => {
    const r = makeResolver({
      rules: [{ path: "Note.md", target: "note", mode: "preview" }]
    });
    expect(r.resolve("Note.md")).toBe("preview");
  });

  it("matches a folder rule on a child note", () => {
    const r = makeResolver({
      rules: [{ path: "Journal", target: "folder", mode: "preview" }]
    });
    expect(r.resolve("Journal/2026.md")).toBe("preview");
  });

  it("picks the deepest folder rule", () => {
    const r = makeResolver({
      rules: [
        { path: "Journal", target: "folder", mode: "source" },
        { path: "Journal/2026", target: "folder", mode: "preview" }
      ]
    });
    expect(r.resolve("Journal/2026/April/20.md")).toBe("preview");
  });

  it("prefers a note rule over any folder rule", () => {
    const r = makeResolver({
      rules: [
        { path: "Journal", target: "folder", mode: "source" },
        { path: "Journal/Diary.md", target: "note", mode: "preview" }
      ]
    });
    expect(r.resolve("Journal/Diary.md")).toBe("preview");
  });

  it("does not match a folder rule on a sibling with the same prefix", () => {
    const r = makeResolver({
      rules: [{ path: "Journal", target: "folder", mode: "preview" }]
    });
    expect(r.resolve("JournalBackup/Note.md")).toBeNull();
  });

  it("treats an empty folder path as a vault-root rule matching every file", () => {
    const r = makeResolver({
      rules: [{ path: "", target: "folder", mode: "preview" }]
    });
    expect(r.resolve("Note.md")).toBe("preview");
    expect(r.resolve("Folder/Note.md")).toBe("preview");
  });

  it("falls through to the global default if only non-matching rules exist", () => {
    const r = makeResolver({
      rules: [{ path: "Other", target: "folder", mode: "source" }],
      globalDefault: "preview"
    });
    expect(r.resolve("Note.md")).toBe("preview");
  });

  it("is case sensitive", () => {
    const r = makeResolver({
      rules: [{ path: "note.md", target: "note", mode: "preview" }]
    });
    expect(r.resolve("Note.md")).toBeNull();
  });
});
