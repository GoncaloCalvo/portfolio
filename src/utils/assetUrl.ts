/**
 * Resolve a root-absolute asset path (e.g. "/assets/vita/icons/foo.webp")
 * against Vite's configured `base`.
 *
 * Asset paths in projects.json are authored root-absolute so they read
 * cleanly, but on a GitHub Pages *project* page the site is served from a
 * subdirectory (e.g. /portfolio/). A literal "/assets/..." would resolve to
 * the domain root and 404. Vite rewrites such paths in HTML/CSS/JS imports,
 * but values pulled from JSON at runtime are opaque strings it never touches —
 * so we prepend the base ourselves.
 *
 * `import.meta.env.BASE_URL` is "/" in dev and the configured base (always
 * trailing-slashed) in production. Absolute http(s) URLs are returned as-is.
 */
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}
