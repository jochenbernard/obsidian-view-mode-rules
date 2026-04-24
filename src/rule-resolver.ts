import { isUnderFolder } from "./normalize-path";
import { PluginSettings, Rule, ViewMode, isViewMode } from "./types";

export class RuleResolver {
  constructor(private getSettings: () => PluginSettings) {}

  resolve(filePath: string): ViewMode | null {
    if (!filePath) return null;
    const settings = this.getSettings();

    for (const rule of settings.rules) {
      if (rule.target === "note" && rule.path === filePath) {
        return rule.mode;
      }
    }

    let best: Rule | null = null;
    for (const rule of settings.rules) {
      if (rule.target !== "folder") continue;
      if (!isUnderFolder(filePath, rule.path)) continue;
      if (!best || rule.path.length > best.path.length) {
        best = rule;
      }
    }
    if (best) return best.mode;

    if (isViewMode(settings.globalDefault)) {
      return settings.globalDefault;
    }

    return null;
  }
}
