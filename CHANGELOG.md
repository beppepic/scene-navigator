# Changelog

All notable changes to Scene Navigator are documented in this file.

## 1.5.2 — 2026-09-13

- Matched scene break dividers to Obsidian's native navigation indentation guide color.
- Preserved the existing divider thickness and spacing.

## 1.5.1 — 2026-09-13

- Increased scene break contrast using the active theme's muted text color.
- Preserved the existing divider thickness and spacing.

## 1.5.0 — 2026-09-13

- Added native-themed scene break dividers for standalone `----` lines.
- Kept three- and five-hyphen lines outside the scene break convention.
- Added parser coverage for scene break placement and consecutive dividers.

## 1.4.0 — 2026-08-20

- Added **Copy current scene** and **Select current scene** commands for hotkeys.
- Moved **Copy scene** to the top of the scene context menu.
- Kept **Cut scene** separated as the destructive action.

## 1.3.0 — 2026-08-20

- Added **Select scene** to select a complete scene from the sidebar.
- Made **Toggle scene comment** wrap the whole word when invoked inside it.
- Documented `Shift-Command-,` (`⇧⌘,`) as a suggested macOS shortcut.

## 1.2.0 — 2026-08-20

- Added the **Toggle scene comment** editor command.
- Added an informational plugin settings page with the scene marker convention.
- Added tests for creating, wrapping, and removing scene comments.

## 1.1.1 — 2026-08-14

- Restored the Scene Navigator ribbon launcher on mobile only.
- Kept the desktop ribbon uncluttered.

## 1.1.0 — 2026-08-14

- Added scene actions for copying, duplicating, and cutting a complete scene.
- Added right-click, keyboard context-menu, and mobile long-press support.
- Removed the ribbon icon; the view remains available from the Command Palette.

## 1.0.0 — 2026-08-13

- Initial public release.
- Navigate single-line HTML comments in the active Markdown note.
- Search, current-scene highlighting, and optional automatic scrolling.
- Native Outline-style sidebar interface.
- Automatic updates for editor and external file changes.
