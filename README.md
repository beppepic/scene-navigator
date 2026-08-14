# Scene Navigator

Scene Navigator is a minimal scene outline for Obsidian. It lists single-line
HTML comments from the active Markdown note and lets you jump to their exact
position.

```markdown
<!-- first encounter – v.07 -->
```

The comment appears in the sidebar as:

> first encounter – v.07

Scene Navigator uses ordinary HTML comments. It does not introduce a custom
file format, and your notes remain fully usable without the plugin.

## Features

- Lists every single-line `<!-- HTML comment -->` in document order.
- Opens each comment at its exact editor position.
- Copies, duplicates, or cuts a complete scene from its comment to the next one.
- Updates when you switch notes, edit comments, or Obsidian reloads a file.
- Searches scenes from a compact toolbar modeled after Obsidian's Outline view.
- Highlights the scene containing the cursor.
- Optionally keeps the current scene visible with **Auto-scroll to current
  scene**.
- Truncates long sidebar labels while preserving the full text in a tooltip.
- Uses Obsidian's native view system and theme variables.
- Works in either sidebar and on desktop and mobile.

## Usage

1. Open a Markdown note containing single-line HTML comments.
2. Run **Scene Navigator: Open navigator** from the Command Palette.
3. Select a scene to move the editor cursor to that comment.

The magnifying-glass button filters the visible list. The second toolbar button
enables or disables automatic scrolling to the scene at the current cursor
position.

Right-click a scene on desktop, or press and hold it on mobile, to open these
actions:

- **Copy scene** copies everything from the selected HTML comment up to, but not
  including, the next HTML comment.
- **Duplicate scene** inserts an exact copy at the end of that range.
- **Cut scene** copies the same range and then removes it from the note.

For the final scene, the range ends at the end of the file. Duplicate and cut
are ordinary editor changes and can be undone with Obsidian's **Undo** command.

You can drag the view between sidebars using Obsidian's standard pane controls.

## Scope

Scene Navigator intentionally:

- reads only single-line HTML comments;
- ignores multiline HTML comments and `%% Obsidian comments %%`;
- does not depend on headings;
- changes note content only when you explicitly choose **Duplicate scene** or
  **Cut scene**, using ordinary undoable editor operations;
- does not add IDs, tags, frontmatter, block IDs, or other syntax;
- does not create auxiliary vault files or store scenes in a database.

All single-line HTML comments are included in version 1.0.0. The parser has a
separate filtering boundary so an optional convention such as `– v.` can be
added later without changing the file format or navigation model.

## Installation

### Community Plugins

Once Scene Navigator is accepted into the Obsidian Community Plugins directory:

1. Open **Settings → Community plugins**.
2. Select **Browse** and search for **Scene Navigator**.
3. Install and enable the plugin.

### Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub
release. Place them in:

```text
<vault>/.obsidian/plugins/scene-navigator/
```

Reload Obsidian, then enable **Scene Navigator** under **Settings → Community
plugins**.

## Development

Requirements: Node.js 18 or newer and pnpm or npm.

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
```

The production build creates `main.js`. Compiled files are attached to GitHub
releases and are not committed to the repository.

## Privacy and permissions

Scene Navigator works locally. It makes no network requests, collects no
telemetry, and creates no database. It reads the active note to build the
sidebar. Note content changes only when you explicitly choose **Duplicate
scene** or **Cut scene**.

## License

[MIT](LICENSE)
