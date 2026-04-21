import { MarkdownView, TFile, Workspace, WorkspaceLeaf } from "obsidian";
import { ConfigStore } from "./config-store";
import { RuleResolver } from "./rule-resolver";
import { ViewMode } from "./types";

export class ViewApplier {
  private lastPath = new WeakMap<WorkspaceLeaf, string>();
  private applying = new WeakSet<WorkspaceLeaf>();
  private savedMode = new WeakMap<WorkspaceLeaf, ViewMode>();
  private applyOnNextLayoutChange = new WeakSet<WorkspaceLeaf>();

  constructor(
    private workspace: Workspace,
    private store: ConfigStore,
    private resolver: RuleResolver
  ) {}

  seedLeaves(): void {
    for (const leaf of this.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (view instanceof MarkdownView && view.file) {
        this.lastPath.set(leaf, view.file.path);
      }
    }
  }

  applyAllLeaves(): void {
    for (const leaf of this.workspace.getLeavesOfType("markdown")) {
      void this.applyToLeaf(leaf);
    }
  }

  handleFileOpen(_file: TFile | null): void {
    const view = this.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) return;
    const leaf = view.leaf;

    const currentPath = view.file.path;
    const previousPath = this.lastPath.get(leaf);
    this.lastPath.set(leaf, currentPath);

    if (previousPath === currentPath) return;
    const isFirstOpenForLeaf = previousPath === undefined;
    if (!isFirstOpenForLeaf && !this.store.getSettings().applyOnNavigation) return;

    // Obsidian fires 'file-open' synchronously while still transitioning the
    // leaf's mode, so view.getMode() here is stale (e.g. still "preview"
    // inherited from a Homepage-forced Reading view on the source note). Defer
    // the apply to the next 'layout-change' event, which fires once the new
    // mode has been committed.
    this.applyOnNextLayoutChange.add(leaf);
  }

  handleLayoutChange(): void {
    const view = this.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) return;
    const leaf = view.leaf;

    if (!this.lastPath.has(leaf)) {
      this.lastPath.set(leaf, view.file.path);
      this.applyOnNextLayoutChange.delete(leaf);
      void this.applyToLeaf(leaf);
      return;
    }

    if (!this.applyOnNextLayoutChange.has(leaf)) return;
    this.applyOnNextLayoutChange.delete(leaf);
    void this.applyToLeaf(leaf);
  }

  async applyToLeaf(leaf: WorkspaceLeaf): Promise<void> {
    if (this.applying.has(leaf)) return;
    const view = leaf.view;
    if (!(view instanceof MarkdownView) || !view.file) return;

    const filePath = view.file.path;
    const ruleMode = this.resolver.resolve(filePath);
    const currentMode = view.getMode();

    if (ruleMode === null) {
      const saved = this.savedMode.get(leaf);
      if (saved === undefined) return;
      this.savedMode.delete(leaf);
      if (currentMode === saved) return;
      await this.writeMode(leaf, view, filePath, saved);
      return;
    }

    if (!this.savedMode.has(leaf)) {
      this.savedMode.set(leaf, currentMode);
    }
    if (currentMode === ruleMode) return;
    await this.writeMode(leaf, view, filePath, ruleMode);
  }

  private async writeMode(
    leaf: WorkspaceLeaf,
    view: MarkdownView,
    filePath: string,
    mode: ViewMode
  ): Promise<void> {
    this.applying.add(leaf);
    try {
      // leaf.setViewState accepts a new mode in its payload but the view keeps
      // its previous mode; MarkdownView.setState applies the mode change.
      await view.setState(
        { file: filePath, mode, source: mode === "source" },
        { history: false }
      );
    } finally {
      this.applying.delete(leaf);
    }
  }
}
