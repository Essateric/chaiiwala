// netlify/functions/_lib/text.js
import { rgb } from "pdf-lib";

export const COLORS = {
  black: rgb(0, 0, 0),
  blue: rgb(0.1, 0.35, 0.9),
  grey: rgb(0.45, 0.45, 0.45),
};

export function drawWrappedText({ page, text, y, font, size, color, maxWidth, margin, lineHeight }) {
  // same wrap strategy as your code path (simple estimate)
  const words = String(text).split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x: margin, y: cursorY, size, font, color });
      cursorY -= lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x: margin, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }
  return cursorY;
}

// match your yes/no and rating colour helpers
export function yesNoToColorText(v) {
  const t = v === true ? "Yes" : v === false ? "No" : "—";
  const c = v === true ? rgb(0.05, 0.55, 0.1) : v === false ? rgb(0.75, 0.1, 0.1) : COLORS.grey;
  return { t, c };
}
export function ratingToColor(n) {
  if (n >= 4) return rgb(0.05, 0.55, 0.1);
  if (n >= 2) return rgb(0.9, 0.55, 0.1);
  if (n > 0)  return rgb(0.75, 0.1, 0.1);
  return COLORS.grey;
}
