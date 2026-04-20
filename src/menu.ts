import { Menu, MenuItem, TAbstractFile, TFile, TFolder } from "obsidian";
import { ConfigStore } from "./config-store";
import { ViewApplier } from "./view-applier";
import { RuleTarget, ViewMode } from "./types";

export function registerFileMenu(
  menu: Menu,
  file: TAbstractFile,
  store: ConfigStore,
  applier: ViewApplier
): void {
  if (file instanceof TFile && file.extension !== "md") return;
  if (!(file instanceof TFile) && !(file instanceof TFolder)) return;

  const target: RuleTarget = file instanceof TFolder ? "folder" : "note";
  const current = store.getRuleFor(file.path, target);

  menu.addItem((item: MenuItem) => {
    item.setTitle("Default view").setIcon("eye");
    const submenu = item.setSubmenu();

    const addChoice = (label: string, mode: ViewMode) => {
      submenu.addItem(sub => {
        sub.setTitle(label).setChecked(current?.mode === mode).onClick(async () => {
          await store.setRule({ path: file.path, target, mode });
          applier.applyAllLeaves();
        });
      });
    };

    addChoice("Editing", "source");
    addChoice("Reading", "preview");

    submenu.addItem(sub => {
      sub
        .setTitle("Inherit (remove rule)")
        .setChecked(!current)
        .onClick(async () => {
          await store.removeRule(file.path, target);
        });
    });
  });
}
