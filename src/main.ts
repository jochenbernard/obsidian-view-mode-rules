import { Plugin, TAbstractFile } from "obsidian";
import { ConfigStore } from "./config-store";
import { RuleResolver } from "./rule-resolver";
import { ViewApplier } from "./view-applier";
import { registerFileMenu } from "./menu";
import { ViewModeRulesSettingsTab } from "./settings-tab";
import { ViewMode } from "./types";

interface AppWithSetting {
  setting?: {
    open?: () => void;
    openTabById?: (id: string) => void;
  };
}

export default class ViewModeRulesPlugin extends Plugin {
  private store!: ConfigStore;
  private resolver!: RuleResolver;
  private applier!: ViewApplier;

  async onload(): Promise<void> {
    this.store = new ConfigStore(this);
    await this.store.load();

    this.resolver = new RuleResolver(() => this.store.getSettings());
    this.applier = new ViewApplier(this.app.workspace, this.store, this.resolver);

    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        this.store.handleRename(file, oldPath);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        this.store.handleDelete(file);
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        registerFileMenu(menu, file, this.store, this.applier);
      })
    );

    this.addCommand({
      id: "set-current-editing",
      name: "Set current note to default editing view",
      checkCallback: checking => this.commandOnActiveFile(checking, "source")
    });
    this.addCommand({
      id: "set-current-reading",
      name: "Set current note to default reading view",
      checkCallback: checking => this.commandOnActiveFile(checking, "preview")
    });
    this.addCommand({
      id: "clear-current",
      name: "Clear default view for current note",
      checkCallback: checking => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) {
          void this.store.removeRule(file.path, "note");
        }
        return true;
      }
    });
    this.addCommand({
      id: "open-settings",
      name: "Open settings",
      callback: () => {
        const app = this.app as unknown as AppWithSetting;
        app.setting?.open?.();
        app.setting?.openTabById?.(this.manifest.id);
      }
    });

    this.addSettingTab(
      new ViewModeRulesSettingsTab(this.app, this, this.store, this.applier)
    );

    this.app.workspace.onLayoutReady(() => {
      this.applier.seedLeaves();
      if (this.store.getSettings().applyOnWorkspaceRestore) {
        this.applier.applyAllLeaves();
      }
      this.registerEvent(
        this.app.workspace.on("file-open", file => this.applier.handleFileOpen(file))
      );
      this.registerEvent(
        this.app.workspace.on("layout-change", () => this.applier.handleLayoutChange())
      );
    });
  }

  private commandOnActiveFile(checking: boolean, mode: ViewMode): boolean {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") return false;
    if (!checking) {
      void this.store.setRule({ path: file.path, target: "note", mode });
      this.applier.applyAllLeaves();
    }
    return true;
  }
}
