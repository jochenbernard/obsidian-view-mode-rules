import {
  App,
  DropdownComponent,
  FuzzySuggestModal,
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  TextComponent,
  TFolder,
  Vault
} from "obsidian";
import { ConfigStore } from "./config-store";
import { ViewApplier } from "./view-applier";
import { RuleTarget, ViewMode, isGlobalDefault, isViewMode } from "./types";

export class ViewModeRulesSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private store: ConfigStore,
    private applier: ViewApplier
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const settings = this.store.getSettings();

    new Setting(containerEl)
      .setName("Global default")
      .setDesc("Used when no note or folder rule matches.")
      .addDropdown(d => {
        d.addOption("obsidian-default", "Use Obsidian default");
        addViewModeOptions(d);
        d.setValue(settings.globalDefault).onChange(async value => {
          if (!isGlobalDefault(value)) return;
          await this.store.setGlobalDefault(value);
        });
      });

    new Setting(containerEl)
      .setName("Apply on workspace restore")
      .setDesc("When Obsidian starts, apply configured views to tabs restored from the previous session.")
      .addToggle(t =>
        t.setValue(settings.applyOnWorkspaceRestore).onChange(async value => {
          await this.store.setApplyOnWorkspaceRestore(value);
        })
      );

    new Setting(containerEl)
      .setName("Apply on navigation")
      .setDesc("Re-apply configured views when navigating into an already-open tab (link clicks, file explorer clicks). When off, only first opens are affected.")
      .addToggle(t =>
        t.setValue(settings.applyOnNavigation).onChange(async value => {
          await this.store.setApplyOnNavigation(value);
        })
      );

    new Setting(containerEl).setName("Note rules").setHeading();
    this.renderRuleList(containerEl, "note");

    new Setting(containerEl).setName("Folder rules").setHeading();
    this.renderRuleList(containerEl, "folder");

    if (settings.rules.length === 0) {
      containerEl.createEl("p", {
        text: "Tip: right-click a note or folder in the file explorer to set its default view."
      });
    }
  }

  private renderRuleList(container: HTMLElement, target: RuleTarget): void {
    const rules = this.store
      .getSettings()
      .rules.filter(r => r.target === target)
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path));

    if (rules.length === 0) {
      new Setting(container).setDesc(`No ${target} rules yet.`);
    }

    for (const rule of rules) {
      new Setting(container)
        .setName(rule.path || "(vault root)")
        .addDropdown(d => {
          addViewModeOptions(d);
          d.setValue(rule.mode).onChange(async value => {
            if (!isViewMode(value)) return;
            await this.store.setRule({ ...rule, mode: value });
            this.applier.applyAllLeaves();
          });
        })
        .addExtraButton(b =>
          b
            .setIcon("trash")
            .setTooltip("Remove rule")
            .onClick(async () => {
              await this.store.removeRule(rule.path, rule.target);
              this.display();
            })
        );
    }

    new Setting(container).addButton(btn =>
      btn.setButtonText(`Add ${target} rule`).onClick(() => {
        new AddRuleModal(this.app, target, async (path, mode) => {
          await this.store.setRule({ path, target, mode });
          this.applier.applyAllLeaves();
          this.display();
        }).open();
      })
    );
  }
}

class AddRuleModal extends Modal {
  private path = "";
  private mode: ViewMode = "preview";
  private pathInput?: TextComponent;

  constructor(
    app: App,
    private target: RuleTarget,
    private onAdd: (path: string, mode: ViewMode) => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(
      this.target === "note" ? "Add note rule" : "Add folder rule"
    );

    new Setting(this.contentEl)
      .setName("Path")
      .setDesc(
        this.target === "note"
          ? "Vault-relative path to a note (e.g. Notes/Example.md). Pick from the vault or type manually."
          : "Vault-relative path to a folder (e.g. Journal/2026). Pick from the vault or type manually."
      )
      .addText(t => {
        t.setPlaceholder(
          this.target === "note" ? "Notes/Example.md" : "Journal/2026"
        );
        t.onChange(value => {
          this.path = value;
        });
        this.pathInput = t;
      })
      .addExtraButton(b =>
        b
          .setIcon("search")
          .setTooltip(
            this.target === "note" ? "Pick a note from the vault" : "Pick a folder from the vault"
          )
          .onClick(() => {
            const paths = collectVaultPaths(this.app.vault, this.target);
            new PathPickerModal(
              this.app,
              paths,
              this.target === "note" ? "Pick a note..." : "Pick a folder...",
              (picked) => {
                this.path = picked;
                this.pathInput?.setValue(picked);
              }
            ).open();
          })
      );

    new Setting(this.contentEl).setName("Mode").addDropdown(d => {
      addViewModeOptions(d);
      d.setValue(this.mode);
      d.onChange(value => {
        if (isViewMode(value)) {
          this.mode = value;
        }
      });
    });

    new Setting(this.contentEl).addButton(b =>
      b
        .setButtonText("Add")
        .setCta()
        .onClick(async () => {
          if (!this.path.trim()) return;
          await this.onAdd(this.path, this.mode);
          this.close();
        })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class PathPickerModal extends FuzzySuggestModal<string> {
  constructor(
    app: App,
    private paths: string[],
    private placeholder: string,
    private onPick: (path: string) => void
  ) {
    super(app);
    this.setPlaceholder(placeholder);
  }

  getItems(): string[] {
    return this.paths;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string): void {
    this.onPick(item);
  }
}

function addViewModeOptions(dropdown: DropdownComponent): void {
  dropdown.addOption("source", "Editing");
  dropdown.addOption("preview", "Reading");
}

function collectVaultPaths(vault: Vault, target: "note" | "folder"): string[] {
  if (target === "note") {
    return vault.getMarkdownFiles().map(f => f.path).sort();
  }
  return vault
    .getAllLoadedFiles()
    .filter((f): f is TFolder => f instanceof TFolder && f.path !== "/")
    .map(f => f.path)
    .sort();
}
