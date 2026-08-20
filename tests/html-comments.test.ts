import { describe, expect, it } from "vitest";

import {
  findHtmlComments,
  planSceneCommentToggle,
} from "../src/html-comments";

describe("findHtmlComments", () => {
  it("finds comments and excludes conventional wrapper spaces", () => {
    expect(findHtmlComments("Before <!-- Scene title --> after")).toEqual([
      {
        fromCh: 7,
        toCh: 27,
        contentFromCh: 12,
        contentToCh: 23,
        content: "Scene title",
      },
    ]);
  });

  it("preserves intentional additional spaces", () => {
    expect(findHtmlComments("<!--  Scene title  -->")[0]?.content).toBe(
      " Scene title ",
    );
  });
});

describe("planSceneCommentToggle", () => {
  it("inserts an empty marker and places the cursor inside", () => {
    expect(planSceneCommentToggle("Text", 4, 4)).toEqual({
      kind: "edit",
      fromCh: 4,
      toCh: 4,
      replacement: "<!--  -->",
      selectionFromCh: 9,
      selectionToCh: 9,
    });
  });

  it("wraps selected text and keeps the inner text selected", () => {
    expect(planSceneCommentToggle("Scene title", 0, 11)).toEqual({
      kind: "edit",
      fromCh: 0,
      toCh: 11,
      replacement: "<!-- Scene title -->",
      selectionFromCh: 5,
      selectionToCh: 16,
    });
  });

  it("wraps the whole word when the cursor is inside it", () => {
    expect(planSceneCommentToggle("destinazione", 5, 5)).toEqual({
      kind: "edit",
      fromCh: 0,
      toCh: 12,
      replacement: "<!-- destinazione -->",
      selectionFromCh: 17,
      selectionToCh: 17,
    });
  });

  it("recognizes accented letters as part of a word", () => {
    expect(planSceneCommentToggle("perché", 3, 3)).toMatchObject({
      kind: "edit",
      fromCh: 0,
      toCh: 6,
      replacement: "<!-- perché -->",
    });
  });

  it("does not capture a word at either outside boundary", () => {
    expect(planSceneCommentToggle("scena", 0, 0)).toMatchObject({
      replacement: "<!--  -->",
      fromCh: 0,
      toCh: 0,
    });
    expect(planSceneCommentToggle("scena", 5, 5)).toMatchObject({
      replacement: "<!--  -->",
      fromCh: 5,
      toCh: 5,
    });
  });

  it("unwraps a marker when the cursor is inside it", () => {
    expect(planSceneCommentToggle("<!-- Scene title -->", 9, 9)).toEqual({
      kind: "edit",
      fromCh: 0,
      toCh: 20,
      replacement: "Scene title",
      selectionFromCh: 4,
      selectionToCh: 4,
    });
  });

  it("unwraps a marker and selects its content", () => {
    expect(planSceneCommentToggle("<!-- Scene title -->", 5, 16)).toEqual({
      kind: "edit",
      fromCh: 0,
      toCh: 20,
      replacement: "Scene title",
      selectionFromCh: 0,
      selectionToCh: 11,
    });
  });

  it("unwraps a marker immediately before or after it", () => {
    const line = "<!-- Scene title -->";
    expect(planSceneCommentToggle(line, 0, 0)).toMatchObject({
      replacement: "Scene title",
      fromCh: 0,
      toCh: 20,
    });
    expect(planSceneCommentToggle(line, line.length, line.length)).toMatchObject(
      {
        replacement: "Scene title",
        fromCh: 0,
        toCh: 20,
      },
    );
  });

  it("rejects a selection that only partly overlaps a comment", () => {
    expect(planSceneCommentToggle("x <!-- Scene --> y", 0, 8)).toEqual({
      kind: "error",
      message: "The selection overlaps an existing HTML comment.",
    });
  });
});
