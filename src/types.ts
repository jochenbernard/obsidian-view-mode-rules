export const VIEW_MODES = ["source", "preview"] as const;
export type ViewMode = typeof VIEW_MODES[number];

export type RuleTarget = "note" | "folder";

export interface Rule {
  path: string;
  target: RuleTarget;
  mode: ViewMode;
}

export const GLOBAL_DEFAULTS = ["obsidian-default", "source", "preview"] as const;
export type GlobalDefault = typeof GLOBAL_DEFAULTS[number];

export interface PluginSettings {
  rules: readonly Rule[];
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

export function isViewMode(value: string): value is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(value);
}

export function isGlobalDefault(value: string): value is GlobalDefault {
  return (GLOBAL_DEFAULTS as readonly string[]).includes(value);
}
