import {
  ItemView,
  Platform,
  SearchComponent,
  setIcon,
  setTooltip,
  type EditorPosition,
  type TFile,
  type ViewStateResult,
  type WorkspaceLeaf,
} from "obsidian";

import type SceneNavigatorPlugin from "./main";
import { findCurrentScene, type Scene } from "./scenes";

export const VIEW_TYPE_SCENE_NAVIGATOR = "scene-navigator-view";
const LONG_PRESS_DELAY_MS = 550;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

interface SceneNavigatorViewState extends Record<string, unknown> {
  followCurrentScene?: boolean;
}

export class SceneNavigatorView extends ItemView {
  private readonly plugin: SceneNavigatorPlugin;
  private file: TFile | null = null;
  private scenes: Scene[] = [];
  private query = "";
  private listEl: HTMLElement | null = null;
  private headerEl: HTMLElement | null = null;
  private searchEl: HTMLElement | null = null;
  private searchButtonEl: HTMLElement | null = null;
  private searchComponent: SearchComponent | null = null;
  private followButtonEl: HTMLElement | null = null;
  private followCurrentScene = false;
  private readonly sceneItemEls = new Map<string, HTMLElement>();
  private readonly longPressTimers = new Set<number>();
  private activeSceneKey: string | null = null;
  private activeItemEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: SceneNavigatorPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_SCENE_NAVIGATOR;
  }

  getDisplayText(): string {
    return "Scene navigator";
  }

  getIcon(): string {
    return "list-tree";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("scene-navigator");
    this.contentEl.empty();

    this.headerEl = createDiv({
      cls: "nav-header scene-navigator-header",
    });
    this.containerEl.prepend(this.headerEl);

    const buttonsEl = this.headerEl.createDiv({ cls: "nav-buttons-container" });
    this.createSearchButton(buttonsEl);
    this.createFollowButton(buttonsEl);
    this.createSearchField();

    this.listEl = this.contentEl.createDiv({ cls: "scene-navigator-list" });
    this.plugin.invalidateRenderCache();
    await this.plugin.refresh();
    this.plugin.updateCurrentSceneFromEditor(true);
  }

  async onClose(): Promise<void> {
    this.headerEl?.detach();
    this.contentEl.empty();
    this.listEl = null;
    this.headerEl = null;
    this.searchEl = null;
    this.searchButtonEl = null;
    this.searchComponent = null;
    this.followButtonEl = null;
    this.clearLongPressTimers();
    this.sceneItemEls.clear();
    this.activeSceneKey = null;
    this.activeItemEl = null;
  }

  getState(): SceneNavigatorViewState {
    return {
      ...super.getState(),
      followCurrentScene: this.followCurrentScene,
    };
  }

  async setState(
    state: SceneNavigatorViewState,
    result: ViewStateResult,
  ): Promise<void> {
    await super.setState(state, result);
    if (typeof state.followCurrentScene === "boolean") {
      this.setFollowCurrentScene(state.followCurrentScene, false);
    }
  }

  renderScenes(file: TFile | null, scenes: Scene[]): void {
    this.file = file;
    this.scenes = scenes;
    this.renderList();
  }

  updateActiveScene(
    file: TFile | null,
    cursor: EditorPosition | null,
    forceScroll = false,
  ): void {
    if (!file || file.path !== this.file?.path || !cursor) {
      this.activeItemEl?.removeClass("is-active");
      this.activeSceneKey = null;
      this.activeItemEl = null;
      return;
    }

    const currentScene = findCurrentScene(this.scenes, cursor);
    const nextKey = currentScene ? this.getSceneKey(currentScene) : null;
    const changed = nextKey !== this.activeSceneKey;

    if (changed || !this.activeItemEl) {
      this.activeItemEl?.removeClass("is-active");
      this.activeSceneKey = nextKey;
      this.activeItemEl = nextKey
        ? (this.sceneItemEls.get(nextKey) ?? null)
        : null;
      this.activeItemEl?.addClass("is-active");
    }

    if (
      this.followCurrentScene &&
      this.activeItemEl &&
      (changed || forceScroll)
    ) {
      this.activeItemEl.scrollIntoView({ block: "nearest" });
    }
  }

  private createSearchButton(buttonsEl: HTMLElement): void {
    this.searchButtonEl = buttonsEl.createDiv({
      cls: "clickable-icon nav-action-button",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-label": "Search scenes",
        "aria-expanded": "false",
      },
    });
    setIcon(this.searchButtonEl, "lucide-search");

    const toggleSearch = (): void => this.toggleSearch();
    this.searchButtonEl.addEventListener("click", toggleSearch);
    this.searchButtonEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSearch();
      }
    });
  }

  private createFollowButton(buttonsEl: HTMLElement): void {
    this.followButtonEl = buttonsEl.createDiv({
      cls: "clickable-icon nav-action-button",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-label": "Auto-scroll to current scene",
        "aria-pressed": String(this.followCurrentScene),
      },
    });
    setIcon(this.followButtonEl, "lucide-gallery-vertical");
    this.followButtonEl.toggleClass("is-active", this.followCurrentScene);
    setTooltip(this.followButtonEl, "Auto-scroll to current scene");

    const toggleFollow = (): void => this.toggleFollowCurrentScene();
    this.followButtonEl.addEventListener("click", toggleFollow);
    this.followButtonEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleFollow();
      }
    });
  }

  private createSearchField(): void {
    if (!this.headerEl) {
      return;
    }

    this.searchComponent = new SearchComponent(this.headerEl)
      .setPlaceholder("Search...")
      .onChange((query) => {
        this.query = query;
        this.renderList();
      });

    this.searchEl = this.searchComponent.inputEl.parentElement;
    this.searchEl?.hide();
    this.searchComponent.inputEl.setAttr("aria-label", "Search scenes");
    this.searchComponent.inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.toggleSearch(false);
        this.searchButtonEl?.focus();
      }
    });
  }

  private toggleSearch(force?: boolean): void {
    if (!this.searchEl || !this.searchButtonEl || !this.searchComponent) {
      return;
    }

    const shouldShow = force ?? !this.searchEl.isShown();
    this.searchEl.toggle(shouldShow);
    this.searchButtonEl.toggleClass("is-active", shouldShow);
    this.searchButtonEl.setAttr("aria-expanded", String(shouldShow));

    if (shouldShow) {
      this.searchComponent.inputEl.focus();
      this.searchComponent.inputEl.select();
      return;
    }

    this.searchComponent.setValue("");
    this.query = "";
    this.renderList();
  }

  private toggleFollowCurrentScene(): void {
    this.setFollowCurrentScene(!this.followCurrentScene, true);
  }

  private setFollowCurrentScene(enabled: boolean, saveLayout: boolean): void {
    this.followCurrentScene = enabled;
    this.followButtonEl?.toggleClass("is-active", enabled);
    this.followButtonEl?.setAttr("aria-pressed", String(enabled));

    if (enabled) {
      this.plugin.updateCurrentSceneFromEditor(true);
    }

    if (saveLayout) {
      this.app.workspace.requestSaveLayout();
    }
  }

  private renderList(): void {
    if (!this.listEl) {
      return;
    }

    this.listEl.empty();
    this.clearLongPressTimers();
    this.sceneItemEls.clear();
    this.activeItemEl = null;

    if (!this.file) {
      this.renderEmptyMessage("No Markdown note is active.");
      return;
    }

    if (this.scenes.length === 0) {
      this.renderEmptyMessage("No single-line HTML comments.");
      return;
    }

    const normalizedQuery = this.query.trim().toLocaleLowerCase();
    const visibleScenes = normalizedQuery
      ? this.scenes.filter((scene) =>
          scene.text.toLocaleLowerCase().includes(normalizedQuery),
        )
      : this.scenes;

    if (visibleScenes.length === 0) {
      this.renderEmptyMessage("No matching scenes.");
      return;
    }

    for (const scene of visibleScenes) {
      this.renderScene(scene);
    }

    this.plugin.updateCurrentSceneFromEditor(true);
  }

  private renderEmptyMessage(message: string): void {
    this.listEl?.createDiv({
      cls: "pane-empty scene-navigator-empty",
      text: message,
    });
  }

  private renderScene(scene: Scene): void {
    if (!this.listEl) {
      return;
    }

    const treeItemEl = this.listEl.createDiv({
      cls: "tree-item scene-navigator-tree-item",
    });
    const itemEl = treeItemEl.createDiv({
      cls: "tree-item-self is-clickable scene-navigator-item",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-haspopup": "menu",
        "aria-label": scene.text || "Empty HTML comment",
      },
    });
    itemEl.createDiv({
      cls: "tree-item-inner",
      text: scene.text,
    });
    setTooltip(itemEl, scene.text || "Empty HTML comment");
    this.sceneItemEls.set(this.getSceneKey(scene), itemEl);

    const navigate = (): void => {
      void this.plugin.navigateTo(this.file, scene);
    };

    let suppressNextClick = false;
    let ignoreContextMenuUntil = 0;
    let longPressTimer: number | null = null;
    let pointerStart = { x: 0, y: 0 };

    const openMenu = (x: number, y: number): void => {
      this.plugin.showSceneMenu(this.file, scene, { x, y }, itemEl);
    };
    const cancelLongPress = (): void => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        this.longPressTimers.delete(longPressTimer);
        longPressTimer = null;
      }
    };

    itemEl.addEventListener("click", (event) => {
      if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
        return;
      }
      navigate();
    });
    itemEl.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelLongPress();

      if (Date.now() < ignoreContextMenuUntil) {
        return;
      }

      openMenu(event.clientX, event.clientY);
    });
    itemEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate();
      } else if (
        event.key === "ContextMenu" ||
        (event.shiftKey && event.key === "F10")
      ) {
        event.preventDefault();
        const rect = itemEl.getBoundingClientRect();
        openMenu(rect.left + 12, rect.bottom);
      }
    });

    if (Platform.isMobile) {
      itemEl.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch") {
          return;
        }

        cancelLongPress();
        pointerStart = { x: event.clientX, y: event.clientY };
        longPressTimer = window.setTimeout(() => {
          if (longPressTimer !== null) {
            this.longPressTimers.delete(longPressTimer);
          }
          longPressTimer = null;
          suppressNextClick = true;
          ignoreContextMenuUntil = Date.now() + 1_000;
          openMenu(pointerStart.x, pointerStart.y);
        }, LONG_PRESS_DELAY_MS);
        this.longPressTimers.add(longPressTimer);
      });
      itemEl.addEventListener("pointermove", (event) => {
        if (
          Math.hypot(
            event.clientX - pointerStart.x,
            event.clientY - pointerStart.y,
          ) > LONG_PRESS_MOVE_TOLERANCE_PX
        ) {
          cancelLongPress();
        }
      });
      itemEl.addEventListener("pointerup", cancelLongPress);
      itemEl.addEventListener("pointercancel", cancelLongPress);
    }
  }

  private getSceneKey(scene: Scene): string {
    return `${scene.line}:${scene.ch}`;
  }

  private clearLongPressTimers(): void {
    for (const timer of this.longPressTimers) {
      window.clearTimeout(timer);
    }
    this.longPressTimers.clear();
  }
}
