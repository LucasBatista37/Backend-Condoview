"use strict";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Página HTML simples (sem scripts) para links abertos fora do app. */
function htmlPage(title, bodyHtml) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Condoview</title>
<style>
  :root { color-scheme: light dark; --brand: #5F04D9; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; background: #F6F5FA; color: #1C1B22; }
  main { max-width: 520px; margin: 48px auto; padding: 32px 24px; background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  h1 { font-size: 1.4rem; margin: 0 0 12px; color: var(--brand); }
  p, li { line-height: 1.55; }
  label { display: block; margin: 16px 0 6px; font-weight: 600; }
  input { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #C9C5D3; border-radius: 10px; font-size: 1rem; }
  button { margin-top: 20px; width: 100%; padding: 14px; border: 0; border-radius: 10px; background: #B3261E; color: #fff; font-size: 1rem; font-weight: 600; }
  .muted { color: #5E5A6B; font-size: .92rem; }
  @media (prefers-color-scheme: dark) { body { background: #131218; color: #E6E1EC; } main { background: #1F1D26; } .muted { color: #B0AABD; } }
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1>${bodyHtml}</main></body>
</html>`;
}

module.exports = { htmlPage, escapeHtml };
