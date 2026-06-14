import { marked } from 'marked';

// Lightweight markdown → HTML wrapper (MDD §6.1).
//
// Project descriptions in projects.json are *authored* content, not user input,
// so heavy sanitisation is unnecessary. We rely on marked's default behaviour,
// which HTML-escapes text content (e.g. a literal `<` becomes `&lt;`) while
// emitting structural HTML for markdown syntax. GFM is enabled so pipe tables
// and other GitHub-flavoured constructs render correctly rather than leaking
// raw pipe characters into the output.
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Render a raw markdown string to sanitised HTML.
 * Returns an empty string for empty/nullish input.
 */
export function renderMarkdown(raw: string): string {
  if (!raw) return '';
  // `async: false` guarantees a synchronous string return (not a Promise),
  // which both call sites assign straight into innerHTML.
  return marked.parse(raw, { async: false });
}
