import { describe, expect, it } from "vitest";

import { extractSceneComments, findCurrentScene } from "../src/scenes";

describe("extractSceneComments", () => {
  it("extracts every single-line HTML comment in document order", () => {
    const markdown = [
      "before",
      "<!-- first -->",
      "text <!-- second --> more <!-- third -->",
      "after",
    ].join("\n");

    expect(extractSceneComments(markdown)).toEqual([
      { text: "first", line: 1, ch: 0 },
      { text: "second", line: 2, ch: 5 },
      { text: "third", line: 2, ch: 26 },
    ]);
  });

  it("ignores multiline HTML comments and percent comments", () => {
    const markdown = [
      "<!-- single -->",
      "<!-- multi",
      "line -->",
      "%% hidden %%",
    ].join("\n");

    expect(extractSceneComments(markdown)).toEqual([
      { text: "single", line: 0, ch: 0 },
    ]);
  });

  it("supports a future filter without changing extraction", () => {
    const markdown = "<!-- note --><!-- scene – v.01 -->";
    const versionedOnly = extractSceneComments(markdown, (scene) =>
      scene.text.includes("– v."),
    );

    expect(versionedOnly).toHaveLength(1);
    expect(versionedOnly[0]?.text).toBe("scene – v.01");
  });
});

describe("findCurrentScene", () => {
  const scenes = extractSceneComments(
    "before\n<!-- first -->\ntext <!-- second --> more <!-- third -->",
  );

  it("returns no scene before the first comment", () => {
    expect(findCurrentScene(scenes, { line: 0, ch: 0 })).toBeNull();
  });

  it("uses the last comment at or before the cursor", () => {
    expect(findCurrentScene(scenes, { line: 2, ch: 25 })?.text).toBe("second");
    expect(findCurrentScene(scenes, { line: 2, ch: 26 })?.text).toBe("third");
    expect(findCurrentScene(scenes, { line: 99, ch: 0 })?.text).toBe("third");
  });
});
