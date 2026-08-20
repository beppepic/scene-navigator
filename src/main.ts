import { EditorView } from "@codemirror/view";
import {
  MarkdownView,
  Menu,
  Notice,
  Platform,
  Plugin,
  TFile,
  type Editor,
  type MenuPositionDef,
  type WorkspaceLeaf,
} from "obsidian";

import {
  extractSceneComments,
  getSceneRange,
  type Scene,
} from "./scenes";
import {
  SceneNavigatorView,
  VIEW_TYPE_SCENE_NAVIGATOR,
} from "./view";
import { toggleSceneComment } from "./comment-command";
import { SceneNavigatorSettingTab } from "./settings";

interface MarkdownViewMatch {
  leaf: WorkspaceLeaf;
  view: MarkdownView;
}

export default class SceneNavigatorPlugin extends Plugin {
  private currentFile: TFile | null = null;
  private currentEditor: Editor | null = null;
  private currentLeaf: WorkspaceLeaf | null = null;
  private renderKey: string | null = null;
  private refreshGeneration = 0;
  private lastCursorKey: string | null = null;

  async onload(): Promise<void> {
    this.addSettingTab(new SceneNavigatorSettingTab(this.app, this));

    this.registerView(
      VIEW_TYPE_SCENE_NAVIGATOR,
      (leaf) => new SceneNavigatorView(leaf, this),
    );

    if (Platform.isMobile) {
      this.addRibbonIcon("list-tree", "Open scene navigator", () => {
        void this.activateView();
      });
    }

    this.addCommand({
      id: "open-navigator",
      name: "Open navigator",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "toggle-scene-comment",
      name: "Toggle scene comment",
      editorCallback: (editor) => toggleSceneComment(editor),
    });

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.trackFile(file);
        void this.refresh();
      }),
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf?.view instanceof MarkdownView) {
          this.trackMarkdownView(leaf.view, leaf);
          void this.refreshFromEditor(leaf.view.editor);
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        const file = info.file;
        if (!file || file.path !== this.getCurrentFile()?.path) {
          return;
        }

        this.currentFile = file;
        this.currentEditor = editor;
        void this.refreshFromEditor(editor);
      }),
    );

    this.registerEditorExtension(
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          this.updateCurrentSceneFromEditor();
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.path === this.getCurrentFile()?.path) {
          window.setTimeout(() => void this.refresh(), 0);
        }
      }),
    );

    this.app.workspace.onLayoutReady(() => {
      this.captureCurrentMarkdownView();
      void this.refresh();
    });
  }

  invalidateRenderCache(): void {
    this.renderKey = null;
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_SCENE_NAVIGATOR)[0];

    if (!leaf) {
      leaf = workspace.getRightLeaf(false) ?? undefined;
      if (!leaf) {
        return;
      }

      await leaf.setViewState({
        type: VIEW_TYPE_SCENE_NAVIGATOR,
        active: true,
      });
    }

    await workspace.revealLeaf(leaf);
    await this.refresh();
  }

  updateCurrentSceneFromEditor(force = false): void {
    const file = this.getCurrentFile();
    const cursor = this.currentEditor?.getCursor("head") ?? null;
    const cursorKey =
      file && cursor ? `${file.path}:${cursor.line}:${cursor.ch}` : "";

    if (!force && cursorKey === this.lastCursorKey) {
      return;
    }

    this.lastCursorKey = cursorKey;
    for (const leaf of this.app.workspace.getLeavesOfType(
      VIEW_TYPE_SCENE_NAVIGATOR,
    )) {
      if (leaf.view instanceof SceneNavigatorView) {
        leaf.view.updateActiveScene(file, cursor, force);
      }
    }
  }

  async refresh(): Promise<void> {
    const generation = ++this.refreshGeneration;
    const file = this.getCurrentFile();

    if (!(file instanceof TFile) || file.extension !== "md") {
      this.render(null, []);
      return;
    }

    const match = this.findMarkdownView(file);
    if (match) {
      this.trackMarkdownView(match.view, match.leaf);
      this.render(file, extractSceneComments(match.view.editor.getValue()));
      return;
    }

    const markdown = await this.app.vault.cachedRead(file);
    if (
      generation !== this.refreshGeneration ||
      file.path !== this.getCurrentFile()?.path
    ) {
      return;
    }

    this.render(file, extractSceneComments(markdown));
  }

  async navigateTo(file: TFile | null, scene: Scene): Promise<void> {
    if (!file) {
      return;
    }

    let match = this.findMarkdownView(file);

    if (!match) {
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
      if (!(leaf.view instanceof MarkdownView)) {
        return;
      }
      match = { leaf, view: leaf.view };
    }

    this.trackMarkdownView(match.view, match.leaf);
    this.app.workspace.setActiveLeaf(match.leaf, { focus: true });

    const position = { line: scene.line, ch: scene.ch };
    match.view.editor.setCursor(position);
    match.view.editor.scrollIntoView({ from: position, to: position }, true);
    match.view.editor.focus();
    this.updateCurrentSceneFromEditor(true);
  }

  showSceneMenu(
    file: TFile | null,
    scene: Scene,
    position: MenuPositionDef,
    parentEl: HTMLElement,
  ): void {
    if (!file) {
      return;
    }

    const menu = new Menu().setParentElement(parentEl);
    menu.addItem((item) =>
      item
        .setTitle("Copy scene")
        .setIcon("copy")
        .onClick(() => void this.performSceneAction(file, scene, "copy")),
    );
    menu.addItem((item) =>
      item
        .setTitle("Duplicate scene")
        .setIcon("copy-plus")
        .onClick(() => void this.performSceneAction(file, scene, "duplicate")),
    );
    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle("Cut scene")
        .setIcon("scissors")
        .onClick(() => void this.performSceneAction(file, scene, "cut")),
    );
    menu.showAtPosition(position, parentEl.ownerDocument);
  }

  private trackFile(file: TFile | null): void {
    if (!(file instanceof TFile) || file.extension !== "md") {
      this.currentFile = null;
      this.currentEditor = null;
      this.currentLeaf = null;
      return;
    }

    this.currentFile = file;
    const match = this.findMarkdownView(file);
    this.currentEditor = match?.view.editor ?? null;
    this.currentLeaf = match?.leaf ?? null;
  }

  private trackMarkdownView(view: MarkdownView, leaf: WorkspaceLeaf): void {
    if (!view.file) {
      return;
    }

    this.currentFile = view.file;
    this.currentEditor = view.editor;
    this.currentLeaf = leaf;
  }

  private captureCurrentMarkdownView(): void {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.file) {
      this.trackMarkdownView(activeView, activeView.leaf);
      return;
    }

    this.trackFile(this.app.workspace.getActiveFile());
  }

  private getCurrentFile(): TFile | null {
    return this.currentFile ?? this.app.workspace.getActiveFile();
  }

  private findMarkdownView(file: TFile | null): MarkdownViewMatch | null {
    if (!file) {
      return null;
    }

    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (
        leaf.view instanceof MarkdownView &&
        leaf.view.file?.path === file.path
      ) {
        return { leaf, view: leaf.view };
      }
    }

    return null;
  }

  private async performSceneAction(
    file: TFile,
    targetScene: Scene,
    action: "copy" | "duplicate" | "cut",
  ): Promise<void> {
    const match = this.findMarkdownView(file);
    if (!match) {
      new Notice("The note is no longer open.");
      return;
    }

    const { editor } = match.view;
    const markdown = editor.getValue();
    const scenes = extractSceneComments(markdown);
    const sceneIndex = scenes.findIndex(
      (scene) =>
        scene.line === targetScene.line &&
        scene.ch === targetScene.ch &&
        scene.text === targetScene.text,
    );
    const range = getSceneRange(
      scenes,
      sceneIndex,
      editor.offsetToPos(markdown.length),
    );

    if (!range) {
      new Notice("The scene changed. Try again.");
      return;
    }

    const sceneText = editor.getRange(range.from, range.to);

    if (action === "copy") {
      if (await this.writeClipboard(sceneText)) {
        new Notice("Scene copied.");
      }
      return;
    }

    if (action === "cut" && !(await this.writeClipboard(sceneText))) {
      return;
    }

    this.trackMarkdownView(match.view, match.leaf);
    this.app.workspace.setActiveLeaf(match.leaf, { focus: true });

    if (action === "duplicate") {
      editor.replaceRange(sceneText, range.to);
      editor.setCursor(range.to);
      new Notice("Scene duplicated.");
    } else {
      editor.replaceRange("", range.from, range.to);
      editor.setCursor(range.from);
      new Notice("Scene cut.");
    }

    editor.focus();
    this.render(file, extractSceneComments(editor.getValue()));
    this.updateCurrentSceneFromEditor(true);
  }

  private async writeClipboard(text: string): Promise<boolean> {
    try {
      await window.activeWindow.navigator.clipboard.writeText(text);
      return true;
    } catch {
      new Notice("Could not write to the clipboard.");
      return false;
    }
  }

  private async refreshFromEditor(editor: Editor): Promise<void> {
    const file = this.getCurrentFile();
    if (!file) {
      this.render(null, []);
      return;
    }

    this.render(file, extractSceneComments(editor.getValue()));
  }

  private render(file: TFile | null, scenes: Scene[]): void {
    const key = `${file?.path ?? ""}\n${scenes
      .map((scene) => `${scene.line}:${scene.ch}:${scene.text}`)
      .join("\n")}`;

    if (key === this.renderKey) {
      return;
    }

    this.renderKey = key;
    for (const leaf of this.app.workspace.getLeavesOfType(
      VIEW_TYPE_SCENE_NAVIGATOR,
    )) {
      if (leaf.view instanceof SceneNavigatorView) {
        leaf.view.renderScenes(file, scenes);
      }
    }
  }
}
