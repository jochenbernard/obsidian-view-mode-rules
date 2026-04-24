import { Plugin, TAbstractFile, TFile } from "obsidian";
import { isUnderFolder, normalizePath } from "./normalize-path";
import {
  DEFAULT_SETTINGS,
  GlobalDefault,
  PluginSettings,
  Rule,
  RuleTarget
} from "./types";

export class ConfigStore {
  private settings: PluginSettings = { ...DEFAULT_SETTINGS, rules: [] };

  constructor(private plugin: Plugin) {}

  async load(): Promise<void> {
    const data = (await this.plugin.loadData()) as Partial<PluginSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(data ?? {}),
      rules: Array.isArray(data?.rules) ? data!.rules! : []
    };
  }

  getSettings(): Readonly<PluginSettings> {
    return this.settings;
  }

  getRuleFor(path: string, target: RuleTarget): Rule | undefined {
    const normalized = normalizePath(path);
    return this.settings.rules.find(
      r => r.target === target && r.path === normalized
    );
  }

  async setRule(rule: Rule): Promise<void> {
    const path = normalizePath(rule.path);
    const next = this.settings.rules.filter(
      r => !(r.target === rule.target && r.path === path)
    );
    next.push({ path, target: rule.target, mode: rule.mode });
    await this.write({ rules: next });
  }

  async removeRule(path: string, target: RuleTarget): Promise<void> {
    const normalized = normalizePath(path);
    const next = this.settings.rules.filter(
      r => !(r.target === target && r.path === normalized)
    );
    if (next.length === this.settings.rules.length) return;
    await this.write({ rules: next });
  }

  async setGlobalDefault(value: GlobalDefault): Promise<void> {
    await this.write({ globalDefault: value });
  }

  async setApplyOnWorkspaceRestore(value: boolean): Promise<void> {
    await this.write({ applyOnWorkspaceRestore: value });
  }

  async setApplyOnNavigation(value: boolean): Promise<void> {
    await this.write({ applyOnNavigation: value });
  }

  handleRename(file: TAbstractFile, oldPath: string): void {
    const oldNorm = normalizePath(oldPath);
    const newNorm = normalizePath(file.path);
    if (oldNorm === newNorm) return;

    let changed = false;
    const next = this.settings.rules.map(r => {
      if (r.path === oldNorm) {
        changed = true;
        return { ...r, path: newNorm };
      }
      if (oldNorm !== "" && isUnderFolder(r.path, oldNorm)) {
        changed = true;
        return { ...r, path: newNorm + r.path.slice(oldNorm.length) };
      }
      return r;
    });
    if (changed) {
      this.write({ rules: next }).catch(err =>
        console.error("view-mode-rules: failed to persist rename", err)
      );
    }
  }

  handleDelete(file: TAbstractFile): void {
    if (!(file instanceof TFile)) return;
    const norm = normalizePath(file.path);
    const next = this.settings.rules.filter(
      r => !(r.target === "note" && r.path === norm)
    );
    if (next.length !== this.settings.rules.length) {
      this.write({ rules: next }).catch(err =>
        console.error("view-mode-rules: failed to persist delete", err)
      );
    }
  }

  private async write(patch: Partial<PluginSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.plugin.saveData(this.settings);
  }
}
