export type ViewMode = "source" | "preview";

export type RuleTarget = "note" | "folder";

export interface Rule {
  path: string;
  target: RuleTarget;
  mode: ViewMode;
}

export type GlobalDefault = ViewMode | "obsidian-default";

export interface PluginSettings {
  rules: Rule[];
  globalDefault: GlobalDefault;
  applyOnWorkspaceRestore: boolean;
  applyOnNavigation: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  rules: [],
  globalDefault: "obsidian-default",
  applyOnWorkspaceRestore: false,
  applyOnNavigation: true
};
