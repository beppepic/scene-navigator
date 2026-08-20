import { Notice, type Editor } from "obsidian";

import { planSceneCommentToggle } from "./html-comments";

export function toggleSceneComment(editor: Editor): void {
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");

  if (from.line !== to.line) {
    new Notice("Scene comments must stay on one line.");
    return;
  }

  const plan = planSceneCommentToggle(
    editor.getLine(from.line),
    from.ch,
    to.ch,
  );

  if (plan.kind === "error") {
    new Notice(plan.message);
    return;
  }

  editor.replaceRange(
    plan.replacement,
    { line: from.line, ch: plan.fromCh },
    { line: from.line, ch: plan.toCh },
    "scene-navigator",
  );

  const selectionFrom = {
    line: from.line,
    ch: plan.selectionFromCh,
  };
  const selectionTo = {
    line: from.line,
    ch: plan.selectionToCh,
  };

  if (plan.selectionFromCh === plan.selectionToCh) {
    editor.setCursor(selectionFrom);
  } else {
    editor.setSelection(selectionFrom, selectionTo);
  }

  editor.focus();
}
