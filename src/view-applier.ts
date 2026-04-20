import { MarkdownView, TFile, Workspace, WorkspaceLeaf } from "obsidian";
import { ConfigStore } from "./config-store";
import { RuleResolver } from "./rule-resolver";

export class ViewApplier {
  private lastPath = new WeakMap<WorkspaceLeaf, string>();
  private applying = new WeakSet<WorkspaceLeaf>();

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
    const leaf = this.workspace.activeLeaf;
    if (!leaf) return;
    const view = leaf.view;
    if (!(view instanceof MarkdownView) || !view.file) return;

    const currentPath = view.file.path;
    const previousPath = this.lastPath.get(leaf);
    this.lastPath.set(leaf, currentPath);

    if (previousPath === currentPath) return;
    const isFirstOpenForLeaf = previousPath === undefined;
    if (!isFirstOpenForLeaf && !this.store.getSettings().applyOnNavigation) return;

    void this.applyToLeaf(leaf);
  }

  handleLayoutChange(): void {
    const leaf = this.workspace.activeLeaf;
    if (!leaf) return;
    const view = leaf.view;
    if (!(view instanceof MarkdownView) || !view.file) return;
    if (this.lastPath.has(leaf)) return;
    this.lastPath.set(leaf, view.file.path);
    void this.applyToLeaf(leaf);
  }

  async applyToLeaf(leaf: WorkspaceLeaf): Promise<void> {
    if (this.applying.has(leaf)) return;
    const view = leaf.view;
    if (!(view instanceof MarkdownView) || !view.file) return;

    const mode = this.resolver.resolve(view.file.path);
    if (mode === null) return;
    if (view.getMode() === mode) return;

    this.applying.add(leaf);
    try {
      const state = leaf.getViewState();
      await leaf.setViewState({
        ...state,
        state: {
          ...(state.state ?? {}),
          mode,
          source: mode === "source"
        }
      });
    } finally {
      this.applying.delete(leaf);
    }
  }
}
