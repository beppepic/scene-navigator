export interface HtmlCommentMatch {
  fromCh: number;
  toCh: number;
  contentFromCh: number;
  contentToCh: number;
  content: string;
}

export interface SceneCommentEditPlan {
  kind: "edit";
  fromCh: number;
  toCh: number;
  replacement: string;
  selectionFromCh: number;
  selectionToCh: number;
}

export interface SceneCommentErrorPlan {
  kind: "error";
  message: string;
}

export type SceneCommentTogglePlan =
  | SceneCommentEditPlan
  | SceneCommentErrorPlan;

export function findHtmlComments(line: string): HtmlCommentMatch[] {
  const comments: HtmlCommentMatch[] = [];
  const pattern = /<!--(.*?)-->/g;

  for (const match of line.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }

    const inner = match[1] ?? "";
    let contentStart = 0;
    let contentEnd = inner.length;

    if (inner.startsWith(" ")) {
      contentStart += 1;
    }
    if (contentEnd > contentStart && inner.endsWith(" ")) {
      contentEnd -= 1;
    }

    const fromCh = match.index;
    const toCh = fromCh + match[0].length;
    const contentFromCh = fromCh + 4 + contentStart;
    const contentToCh = fromCh + 4 + contentEnd;

    comments.push({
      fromCh,
      toCh,
      contentFromCh,
      contentToCh,
      content: line.slice(contentFromCh, contentToCh),
    });
  }

  return comments;
}

export function planSceneCommentToggle(
  line: string,
  fromCh: number,
  toCh: number,
): SceneCommentTogglePlan {
  const hasSelection = fromCh !== toCh;
  const comments = findHtmlComments(line);
  const containingComment = comments.find((comment) =>
    hasSelection
      ? fromCh >= comment.fromCh && toCh <= comment.toCh
      : fromCh >= comment.fromCh && fromCh <= comment.toCh,
  );

  if (containingComment) {
    const { content, contentFromCh } = containingComment;
    const selectionFromCh = hasSelection
      ? containingComment.fromCh
      : containingComment.fromCh +
        Math.max(0, Math.min(fromCh - contentFromCh, content.length));

    return {
      kind: "edit",
      fromCh: containingComment.fromCh,
      toCh: containingComment.toCh,
      replacement: content,
      selectionFromCh,
      selectionToCh: hasSelection
        ? containingComment.fromCh + content.length
        : selectionFromCh,
    };
  }

  if (
    hasSelection &&
    comments.some(
      (comment) => fromCh < comment.toCh && toCh > comment.fromCh,
    )
  ) {
    return {
      kind: "error",
      message: "The selection overlaps an existing HTML comment.",
    };
  }

  const selectedText = line.slice(fromCh, toCh);
  return {
    kind: "edit",
    fromCh,
    toCh,
    replacement: `<!-- ${selectedText} -->`,
    selectionFromCh: fromCh + 5,
    selectionToCh: fromCh + 5 + selectedText.length,
  };
}
