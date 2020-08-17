import DiffMatchPatch from "diff-match-patch";
import type { TextQuoteSelector } from "@annotator/selector";

const SLICE_LENGTH = 32;
const SLICE_RE = new RegExp("(.|[\r\n]){1," + String(SLICE_LENGTH) + "}", "g");
const MATCH_THRESHOLD: number = 0.5;

interface TextPosition {
  start: number;
  end: number;
}

function sliceText(text: string): string[] {
  const slices = text.match(SLICE_RE);
  if (slices === null) {
    return [];
  }
  return slices;
}

export function toTextPosition(
  content: string,
  { exact, prefix, suffix }: TextQuoteSelector,
  location?: number
): TextPosition | null {
  const dmp = new DiffMatchPatch();
  dmp.Match_Threshold = MATCH_THRESHOLD;
  if (MATCH_THRESHOLD === 0) {
    dmp.Match_Distance = 0;
  }
  dmp.Match_Distance = content.length / MATCH_THRESHOLD;

  const slices = sliceText(exact);
  if (slices.length === 0) {
    return null;
  }

  location = location ?? content.length / 2;
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  let result = -1;
  let foundPrefix = false;

  if (prefix !== undefined) {
    result = dmp.match_main(content, prefix, location);
    if (result > -1) {
      location = result + prefix.length;
      foundPrefix = true;
    }
  }

  if (!foundPrefix && suffix !== undefined) {
    result = dmp.match_main(content, suffix, location);
    if (result > -1) {
      location = result - exact.length;
    }
  }

  let firstSlice = slices.shift();
  if (firstSlice === undefined) {
    return null;
  }

  result = dmp.match_main(content, firstSlice, location);
  if (result === -1) {
    return null;
  }
  start = result;
  end = start + firstSlice.length;
  location = end;

  dmp.Match_Distance = SLICE_LENGTH * 2;

  type Acc = TextPosition | null;
  let loc = 0;
  const position = slices.reduce(
    (acc: Acc, slice: string): Acc => {
      if (acc === null) {
        return null;
      }

      const result = dmp.match_main(content, slice, loc);
      if (result === -1) {
        return null;
      }

      loc = result + slice.length;

      acc.start = Math.min(acc.start, result);
      acc.end = Math.max(acc.end, result + slice.length);
      return acc;
    },
    { start, end }
  );

  return position;
}
