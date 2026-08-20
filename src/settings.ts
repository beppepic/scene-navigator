import {
  PluginSettingTab,
  type App,
  type SettingDefinitionItem,
} from "obsidian";

import type SceneNavigatorPlugin from "./main";

export class SceneNavigatorSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: SceneNavigatorPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "How it works",
        desc: "Scene Navigator treats every single-line HTML comment in the active note as a scene marker and displays it in a navigable sidebar outline.",
      },
      {
        name: "Scene marker",
        desc: "Example: <!-- Scene title -->",
      },
      {
        name: "Create or remove a marker",
        desc: "Use the Toggle scene comment command to create a marker, wrap selected text, or remove an existing marker. Assign a shortcut under Hotkeys if desired.",
      },
      {
        name: "Portable notes",
        desc: "Scene markers remain ordinary Markdown-compatible HTML comments. The plugin does not add IDs, metadata, or a proprietary file format.",
      },
    ];
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("p", {
      text: "Scene navigator treats every single-line HTML comment in the active note as a scene marker and displays it in a navigable sidebar outline.",
    });

    const example = containerEl.createEl("p");
    example.appendText("Example: ");
    example.createEl("code", { text: "<!-- scene title -->" });

    containerEl.createEl("p", {
      text: "Use the toggle scene comment command to create a marker, wrap selected text, or remove an existing marker. You can assign the command a shortcut under hotkeys.",
    });

    containerEl.createEl("p", {
      text: "Scene markers remain ordinary Markdown-compatible HTML comments. The plugin does not add ids, metadata, or a proprietary file format.",
    });
  }
}
