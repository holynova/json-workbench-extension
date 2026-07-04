import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("store-assets/render");
mkdirSync(root, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(root, `icon-${size}.html`), iconHtml(size));
}

writeFileSync(resolve(root, "small-promo-440x280.html"), promoHtml(440, 280, "tile"));
writeFileSync(resolve(root, "marquee-1400x560.html"), promoHtml(1400, 560, "marquee"));

function iconHtml(size) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: ${size}px; height: ${size}px; background: #faf9f5; overflow: hidden; }
      body { display: grid; place-items: center; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
      .icon {
        width: ${Math.round(size * 0.86)}px;
        height: ${Math.round(size * 0.86)}px;
        border: ${Math.max(1, Math.round(size * 0.035))}px solid #141413;
        border-radius: ${Math.round(size * 0.18)}px;
        background: #fff;
        display: grid;
        place-items: center;
        position: relative;
        box-shadow: inset 0 0 0 ${Math.max(1, Math.round(size * 0.025))}px #e6e3da;
      }
      .brace { font-size: ${Math.round(size * 0.48)}px; line-height: 1; color: #d97757; font-weight: 600; }
      .rule {
        position: absolute;
        left: ${Math.round(size * 0.22)}px;
        right: ${Math.round(size * 0.22)}px;
        height: ${Math.max(1, Math.round(size * 0.02))}px;
        background: #788c5d;
        border-radius: 99px;
      }
      .top { top: ${Math.round(size * 0.28)}px; }
      .bottom { bottom: ${Math.round(size * 0.28)}px; }
    </style>
  </head>
  <body><div class="icon"><span class="rule top"></span><span class="brace">{}</span><span class="rule bottom"></span></div></body>
</html>`;
}

function promoHtml(width, height, variant) {
  const large = variant === "marquee";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --ivory: #faf9f5;
        --paper: #ffffff;
        --slate: #141413;
        --clay: #d97757;
        --clay-d: #b85c3e;
        --oat: #e3dacc;
        --olive: #788c5d;
        --g100: #f0eee6;
        --g300: #d1cfc5;
        --g500: #87867f;
        --serif: ui-serif, Georgia, "Times New Roman", Times, serif;
        --sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --mono: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
      }
      html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
      body {
        background:
          linear-gradient(90deg, rgba(209,207,197,.28) 1px, transparent 1px),
          linear-gradient(180deg, rgba(209,207,197,.24) 1px, transparent 1px),
          var(--ivory);
        background-size: ${large ? 40 : 28}px ${large ? 40 : 28}px;
        color: var(--slate);
        font-family: var(--sans);
      }
      .frame {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: ${large ? 58 : 26}px ${large ? 72 : 30}px;
        display: grid;
        grid-template-columns: ${large ? "1fr 520px" : "1fr 150px"};
        gap: ${large ? 64 : 22}px;
        align-items: center;
      }
      .eyebrow {
        align-items: center;
        color: var(--g500);
        display: inline-flex;
        font: 400 ${large ? 18 : 10}px/1 var(--mono);
        gap: ${large ? 14 : 8}px;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .eyebrow::before { background: var(--clay); content: ""; height: 1.5px; width: ${large ? 44 : 22}px; }
      h1 {
        font: 500 ${large ? 78 : 34}px/1.04 var(--serif);
        letter-spacing: -.018em;
        margin: ${large ? 24 : 12}px 0 ${large ? 24 : 14}px;
        max-width: 10ch;
      }
      p {
        color: #3d3d3a;
        font-size: ${large ? 24 : 13}px;
        line-height: 1.45;
        margin: 0;
        max-width: ${large ? 680 : 250}px;
      }
      .pane {
        background: var(--paper);
        border: 1.5px solid var(--slate);
        border-radius: ${large ? 24 : 14}px;
        box-shadow: 0 12px 32px rgba(20,20,19,.10);
        box-sizing: border-box;
        padding: ${large ? 28 : 13}px;
        transform: rotate(1.5deg);
      }
      .tag {
        background: var(--g100);
        border: 1.5px solid var(--g300);
        border-radius: 999px;
        color: var(--clay-d);
        display: inline-flex;
        font: 600 ${large ? 16 : 9}px/1 var(--mono);
        letter-spacing: .08em;
        padding: ${large ? 10 : 5}px ${large ? 14 : 8}px;
        text-transform: uppercase;
      }
      pre {
        color: var(--slate);
        font: 400 ${large ? 22 : 10}px/1.55 var(--mono);
        margin: ${large ? 26 : 12}px 0 0;
        white-space: pre-wrap;
      }
      .clay { color: var(--clay-d); }
      .olive { color: var(--olive); }
    </style>
  </head>
  <body>
    <main class="frame">
      <section>
        <span class="eyebrow">JSON Workbench</span>
        <h1>Fix JSON locally.</h1>
        <p>Repair messy JSON, generate schema and code, and create semantic mock data without network calls.</p>
      </section>
      <section class="pane">
        <span class="tag">Local only</span>
        <pre>{
  <span class="clay">"status"</span>: <span class="olive">"repaired"</span>,
  <span class="clay">"outputs"</span>: [
    "Schema",
    "TypeScript",
    "Zod",
    "Pydantic"
  ]
}</pre>
      </section>
    </main>
  </body>
</html>`;
}

console.log(`Wrote render pages to ${root}`);
