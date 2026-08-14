import type { EditorPosition } from "obsidian";

export interface Scene {
  text: string;
  line: number;
  ch: number;
}

export type ScenePredicate = (scene: Scene) => boolean;

export interface SceneRange {
  from: EditorPosition;
  to: EditorPosition;
}

/**
 * Extracts single-line HTML comments in document order.
 *
 * Keeping the predicate separate makes it possible to add an optional scene
 * filter later without changing the parser, view, or navigation behavior.
 */
export function extractSceneComments(
  markdown: string,
  predicate: ScenePredicate = () => true,
): Scene[] {
  const scenes: Scene[] = [];
  const lines = markdown.split(/\r?\n/);

  for (let line = 0; line < lines.length; line += 1) {
    const sourceLine = lines[line];
    if (sourceLine === undefined) {
      continue;
    }

    const commentPattern = /<!--(.*?)-->/g;
    let match: RegExpExecArray | null;

    while ((match = commentPattern.exec(sourceLine)) !== null) {
      const scene: Scene = {
        text: (match[1] ?? "").trim(),
        line,
        ch: match.index,
      };

      if (predicate(scene)) {
        scenes.push(scene);
      }
    }
  }

  return scenes;
}

export function findCurrentScene(
  scenes: readonly Scene[],
  cursor: EditorPosition,
): Scene | null {
  let currentScene: Scene | null = null;

  for (const scene of scenes) {
    if (
      scene.line < cursor.line ||
      (scene.line === cursor.line && scene.ch <= cursor.ch)
    ) {
      currentScene = scene;
      continue;
    }

    break;
  }

  return currentScene;
}

export function getSceneRange(
  scenes: readonly Scene[],
  sceneIndex: number,
  documentEnd: EditorPosition,
): SceneRange | null {
  const scene = scenes[sceneIndex];
  if (!scene) {
    return null;
  }

  const nextScene = scenes[sceneIndex + 1];
  return {
    from: { line: scene.line, ch: scene.ch },
    to: nextScene
      ? { line: nextScene.line, ch: nextScene.ch }
      : documentEnd,
  };
}
