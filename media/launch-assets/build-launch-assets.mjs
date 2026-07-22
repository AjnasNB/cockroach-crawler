import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = dirname(fileURLToPath(import.meta.url));
const svgDir = join(root, "svg");
const pngDir = join(root, "png");

const palette = {
  bg: "#070b09",
  panel: "#0d1512",
  panel2: "#101d18",
  line: "#294139",
  lineBright: "#527466",
  text: "#f1f5f2",
  muted: "#91a39c",
  green: "#79f2a6",
  cyan: "#8cd8e8",
  amber: "#ffb589",
  red: "#ff8b7b",
};

const assets = [
  {
    id: "github-social-preview",
    width: 1280,
    height: 640,
    motif: "composite",
    eyebrow: "BOUNDED EYES ON THE PUBLIC WEB",
    headline: ["Let agents see.", "Keep network control."],
    subhead: "Crawl, search, and normalize evidence without exposing an unrestricted browser.",
    chips: ["DNS-pinned local path", "explicit reach", "normalized evidence"],
    hook: "GitHub repository preview",
  },
  {
    id: "product-hunt-01-two-tiers",
    width: 1270,
    height: 760,
    motif: "tiers",
    eyebrow: "PRODUCT HUNT / PROOF 01",
    headline: ["Two crawl tiers.", "One honest boundary."],
    subhead: "Use DNS-pinned local crawling for untrusted public URLs. Use the small serverless tier only for origins you own or trust.",
    chips: ["local: DNS validation + pinning", "serverless: HTTPS allowlist", "limits at both tiers"],
    hook: "Choose the security boundary before the first request.",
  },
  {
    id: "product-hunt-02-source-doctor",
    width: 1270,
    height: 760,
    motif: "doctor",
    eyebrow: "PRODUCT HUNT / PROOF 02",
    headline: ["Know which sources", "are ready."],
    subhead: "Run one local doctor command before a workflow touches the web, an API, or an optional read session.",
    chips: ["Web", "GitHub", "YouTube", "official APIs", "session reads"],
    hook: "No cookie extraction. Authority stays visible.",
  },
  {
    id: "product-hunt-03-budgets",
    width: 1270,
    height: 760,
    motif: "budgets",
    eyebrow: "PRODUCT HUNT / PROOF 03",
    headline: ["Every discovery path", "spends a budget."],
    subhead: "Creator-owned limits cover pages, depth, bytes, requests, concurrency, and deadline.",
    chips: ["hard ceilings", "robots-aware", "fail closed"],
    hook: "A crawler should know when to stop.",
  },
  {
    id: "product-hunt-thumbnail",
    width: 240,
    height: 240,
    motif: "thumbnail",
    eyebrow: "",
    headline: ["COCKROACH", "CRAWLER"],
    subhead: "BOUNDED PUBLIC-WEB REACH",
    chips: [],
    hook: "Product Hunt thumbnail",
  },
  {
    id: "x-landscape",
    width: 1600,
    height: 900,
    motif: "local",
    eyebrow: "PUBLIC-WEB REACH / EXPLICIT LIMITS",
    headline: ["Give agents eyes—", "with boundaries."],
    subhead: "The local tier validates DNS answers, pins the admitted address, and re-checks every redirect hop.",
    chips: ["DNS answers", "redirect hops", "robots", "budgets"],
    hook: "Read-only by default. Evidence stays attributable.",
  },
  {
    id: "x-square",
    width: 1080,
    height: 1080,
    motif: "budgets",
    eyebrow: "COCKROACH CRAWLER",
    headline: ["See the web.", "Stay bounded."],
    subhead: "Put hard limits around every read and discovery path.",
    chips: ["pages", "depth", "bytes", "deadline"],
    hook: "Open source • Node.js • MIT",
  },
  {
    id: "linkedin",
    width: 1200,
    height: 627,
    motif: "records",
    eyebrow: "ENGINEERING PUBLIC-WEB RESEARCH",
    headline: ["Web evidence that", "names its boundary."],
    subhead: "Normalize public pages and read-only provider results into records a workflow can inspect and cite.",
    chips: ["source URL", "retrieval metadata", "structured content"],
    hook: "For developers building evidence-aware agent workflows.",
  },
  {
    id: "reddit",
    width: 1200,
    height: 900,
    motif: "local",
    eyebrow: "WHAT WE BUILT",
    headline: ["A crawler that", "fails closed."],
    subhead: "Private targets, unsafe redirects, expired budgets, and disallowed routes stop before extraction.",
    chips: ["local DNS pinning", "bounded redirects", "explicit ceilings"],
    hook: "No claim of universal safety. The boundary is documented.",
  },
  {
    id: "devto-cover",
    width: 1000,
    height: 420,
    motif: "local",
    eyebrow: "TECHNICAL ARTICLE",
    headline: ["Building an agent crawler", "that fails closed"],
    subhead: "DNS admission, redirect checks, robots, and creator-owned budgets.",
    chips: ["Node.js", "open source"],
    hook: "Dev.to cover",
  },
  {
    id: "hashnode-cover",
    width: 1600,
    height: 840,
    motif: "tiers",
    eyebrow: "COCKROACH CRAWLER / ARCHITECTURE",
    headline: ["Two crawl tiers.", "One explicit security model."],
    subhead: "A hardened local path for untrusted URLs and a restricted serverless path for owned or trusted origins.",
    chips: ["local DNS pinning", "serverless HTTPS allowlist", "documented trade-offs"],
    hook: "Hashnode cover",
  },
  {
    id: "medium-cover",
    width: 1400,
    height: 788,
    motif: "records",
    eyebrow: "FROM REQUEST TO EVIDENCE",
    headline: ["From public URL", "to normalized record."],
    subhead: "Keep the route, retrieval metadata, extracted content, and source identity visible to the workflow.",
    chips: ["source", "URL", "content hash", "provenance"],
    hook: "Medium cover",
  },
  {
    id: "hackernoon-cover",
    width: 1200,
    height: 630,
    motif: "budgets",
    eyebrow: "CRAWLER CONTROL PLANE",
    headline: ["Your crawler should", "know when to stop."],
    subhead: "Hard ceilings for pages, depth, bytes, requests, concurrency, and time.",
    chips: ["deterministic limits", "visible denials", "bounded work"],
    hook: "HackerNoon cover",
  },
  {
    id: "youtube-thumbnail",
    width: 1280,
    height: 720,
    motif: "doctor",
    eyebrow: "60-SECOND TECHNICAL DEMO",
    headline: ["Public-web reach.", "Checked first."],
    subhead: "Source doctor → bounded crawl → normalized evidence",
    chips: ["real CLI flow", "local proof"],
    hook: "Cockroach Crawler",
  },
  {
    id: "readme-proof-still",
    width: 1600,
    height: 900,
    motif: "composite",
    eyebrow: "COCKROACH CRAWLER / SYSTEM MAP",
    headline: ["Bound the crawl.", "Keep the evidence."],
    subhead: "A policy-aware crawl path plus public, official, no-key, and session-backed read routes.",
    chips: ["hardened local tier", "explicit reach providers", "source doctor", "normalized records"],
    hook: "Open source • Node.js • MIT",
  },
];

const escape = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function defs() {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07100e"/><stop offset="1" stop-color="#050806"/></linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#426156"/><stop offset=".45" stop-color="#1d312a"/><stop offset="1" stop-color="#0b1512"/></linearGradient>
    <linearGradient id="metal2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#223c33"/><stop offset="1" stop-color="#0a1411"/></linearGradient>
    <linearGradient id="beam" x1="0" x2="1"><stop stop-color="#79f2a6" stop-opacity="0"/><stop offset=".5" stop-color="#79f2a6"/><stop offset="1" stop-color="#8cd8e8" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#79f2a6" stop-opacity=".3"/><stop offset="1" stop-color="#79f2a6" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#284139" stroke-width="1" opacity=".32"/></pattern>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>`;
}

function brand(x, y, size = 28, compact = false) {
  return `<g transform="translate(${x} ${y})">
    <rect width="${size}" height="${size}" rx="${size * .18}" fill="#0e1c17" stroke="#45675c"/>
    <path d="M${size*.2} ${size*.7}V${size*.34}l${size*.3} ${size*.2} ${size*.3}-${size*.2}v${size*.36}" fill="none" stroke="#79f2a6" stroke-width="${Math.max(2,size*.08)}" stroke-linecap="square" stroke-linejoin="miter"/>
    <circle cx="${size*.5}" cy="${size*.54}" r="${size*.075}" fill="#8cd8e8"/>
    ${compact ? "" : `<text x="${size + 13}" y="${size*.69}" fill="#f1f5f2" font-family="'Arial',sans-serif" font-size="${size*.47}" font-weight="700" letter-spacing="${size*.12}">COCKROACH CRAWLER</text>`}
  </g>`;
}

function pill(x, y, label, color = palette.green, scale = 1) {
  const width = Math.max(76, label.length * 7.2 + 28) * scale;
  const h = 30 * scale;
  return `<g transform="translate(${x} ${y})"><rect width="${width}" height="${h}" rx="${h/2}" fill="#08110e" stroke="${color}" stroke-opacity=".55"/><circle cx="${14*scale}" cy="${h/2}" r="${3.5*scale}" fill="${color}"/><text x="${25*scale}" y="${19.5*scale}" fill="#c9d8d2" font-family="'Courier New',monospace" font-size="${11*scale}" letter-spacing="${.35*scale}">${escape(label.toUpperCase())}</text></g>`;
}

function cube(x, y, w, h, depth, top, left = "#0a1713", right = "#0d211a", stroke = palette.lineBright) {
  const skew = depth * .52;
  return `<g transform="translate(${x} ${y})">
    <path d="M0 ${skew} ${w/2} 0 ${w} ${skew} ${w/2} ${depth}Z" fill="${top}" stroke="${stroke}"/>
    <path d="M0 ${skew}v${h}l${w/2} ${depth-skew}V${depth}Z" fill="${left}" stroke="${stroke}"/>
    <path d="M${w/2} ${depth}v${h}L${w} ${h+skew}V${skew}Z" fill="${right}" stroke="${stroke}"/>
  </g>`;
}

function floor() {
  return `<ellipse cx="370" cy="500" rx="270" ry="52" fill="#000" opacity=".52" filter="url(#soft)"/>
  <path d="M62 430 293 299l366 96-234 137z" fill="#08120f" stroke="#355349"/>
  <path d="M63 430v34l362 98v-30z" fill="#0b1915" stroke="#355349"/>
  <path d="M425 532v30l234-132v-35z" fill="#07110e" stroke="#355349"/>
  <path d="M94 420 303 326l318 81-207 101z" fill="#101d19" stroke="#45675c"/>
  <path d="M105 420 413 507 606 411 300 337z" fill="none" stroke="url(#beam)" stroke-width="5" opacity=".85"/>`;
}

function localArt() {
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Isometric local crawler gate validating DNS and redirects">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="360" cy="295" r="280" fill="url(#glow)"/>
    ${floor()}
    <g transform="translate(78 328)">${cube(0,0,140,74,58,"#163027")}<circle cx="27" cy="57" r="5" fill="#79f2a6"/><path d="M43 56h54M27 75h76M27 94h43" stroke="#8cd8e8" stroke-width="3"/><text x="15" y="-12" fill="#9db2aa" font-family="monospace" font-size="12">PUBLIC URL</text></g>
    <g transform="translate(260 145)" filter="url(#shadow)">${cube(0,55,240,225,100,"url(#metal)")}<path d="M35 110V52l84-42 88 23v62" fill="none" stroke="#79f2a6" stroke-width="8"/><path d="M57 103V69l61-30 64 17v29" fill="none" stroke="#20382f" stroke-width="18"/><path d="m91 236 30-15 34 9-32 16z" fill="#79f2a6"/><path d="M91 236v43l32 9v-42z" fill="#285640"/><path d="M123 246v42l32-16v-42z" fill="#17432f"/><circle cx="38" cy="162" r="7" fill="#79f2a6"/><circle cx="38" cy="190" r="7" fill="#79f2a6"/><circle cx="38" cy="218" r="7" fill="#ffb589"/><path d="M56 161h42M56 189h62M56 217h36" stroke="#769189" stroke-width="4"/><text x="55" y="318" fill="#c0d7cd" font-family="monospace" font-size="13" transform="skewY(16)">DNS + REDIRECT GATE</text></g>
    <g transform="translate(525 330)">${cube(0,0,130,64,52,"#173128", "#0a1713", "#0d211a", "#8cd8e8")}<path d="M23 55h72M23 73h55M23 91h82" stroke="#79f2a6" stroke-width="3"/><text x="21" y="-12" fill="#9db2aa" font-family="monospace" font-size="12">RECORD</text></g>
    <g font-family="monospace" font-size="10" text-anchor="middle"><g transform="translate(206 405)"><rect width="78" height="25" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="39" y="17" fill="#b1f8c9">DNS SET</text></g><g transform="translate(305 431)"><rect width="88" height="25" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="44" y="17" fill="#b1f8c9">REDIRECT</text></g><g transform="translate(410 437)"><rect width="75" height="25" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="37" y="17" fill="#b1f8c9">ROBOTS</text></g></g>
    <g transform="translate(88 152)"><rect width="128" height="49" fill="#141b19" stroke="#ff8b7b"/><text x="64" y="29" text-anchor="middle" fill="#ffc1ba" font-family="monospace" font-size="11">PRIVATE TARGET</text><path d="m45 7 38 35m0-35L45 42" stroke="#ff8b7b" stroke-width="3"/></g>
    <text x="35" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">HARDENED LOCAL TIER</text><text x="35" y="70" fill="#8da19a" font-family="monospace" font-size="11">validate • resolve • pin • re-check every hop</text>
  </svg>`;
}

function serverlessArt() {
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Restricted serverless crawler for allowlisted HTTPS origins">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="370" cy="310" r="280" fill="url(#glow)"/>
    ${floor()}
    <g transform="translate(95 325)">${cube(0,0,140,68,56,"#162720")}<path d="M25 56h74M25 76h52" stroke="#8cd8e8" stroke-width="3"/><text x="16" y="-12" fill="#9db2aa" font-family="monospace" font-size="12">TRUSTED ORIGIN</text><path d="m108 19 13 13-13 13" fill="none" stroke="#79f2a6" stroke-width="4"/></g>
    <g transform="translate(270 150)" filter="url(#shadow)">${cube(0,58,238,210,96,"url(#metal)")}<path d="M44 122h147v80H44z" fill="#08110e" stroke="#79f2a6" stroke-width="3"/><path d="M58 138h63M58 158h103M58 178h77" stroke="#527466" stroke-width="4"/><circle cx="176" cy="162" r="11" fill="#79f2a6"/><path d="M11 142h23M11 170h23M11 198h23M201 142h23M201 170h23M201 198h23" stroke="#8cd8e8" stroke-width="4"/><text x="64" y="256" fill="#c0d7cd" font-family="monospace" font-size="13" transform="skewY(16)">WORKER GATE</text></g>
    <g transform="translate(535 340)">${cube(0,0,118,60,48,"#173128", "#0a1713", "#0d211a", "#8cd8e8")}<path d="M21 53h69M21 70h47M21 87h78" stroke="#79f2a6" stroke-width="3"/><text x="20" y="-12" fill="#9db2aa" font-family="monospace" font-size="12">RECORD</text></g>
    <g font-family="monospace" font-size="10" text-anchor="middle"><g transform="translate(188 430)"><rect width="72" height="25" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="36" y="17" fill="#b1f8c9">HTTPS</text></g><g transform="translate(279 455)"><rect width="92" height="25" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="46" y="17" fill="#b1f8c9">ALLOWLIST</text></g><g transform="translate(390 459)"><rect width="78" height="25" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="39" y="17" fill="#b1f8c9">BUDGET</text></g></g>
    <g transform="translate(72 133)"><rect width="174" height="70" fill="#181916" stroke="#ffb589"/><text x="16" y="25" fill="#ffcead" font-family="monospace" font-size="10">NO DNS PINNING</text><text x="16" y="45" fill="#a99a91" font-family="monospace" font-size="9">use platform egress controls</text><text x="16" y="59" fill="#a99a91" font-family="monospace" font-size="9">for stronger isolation</text></g>
    <text x="35" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">RESTRICTED SERVERLESS TIER</text><text x="35" y="70" fill="#8da19a" font-family="monospace" font-size="11">operator-owned or trusted HTTPS origins only</text>
  </svg>`;
}

function tiersArt() {
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Comparison of local DNS-pinned tier and restricted serverless tier">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/>
    <text x="36" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">CHOOSE THE BOUNDARY FIRST</text><text x="36" y="70" fill="#8da19a" font-family="monospace" font-size="11">same bounded intent • different network guarantees</text>
    <g transform="translate(44 112)"><rect width="300" height="398" fill="#0b1512" stroke="#45675c"/><text x="25" y="38" fill="#f1f5f2" font-family="Arial" font-size="24" font-weight="700">Hardened local</text><text x="25" y="62" fill="#79f2a6" font-family="monospace" font-size="11">FOR UNTRUSTED PUBLIC URLS</text>
      <g transform="translate(74 102)">${cube(0,40,152,123,62,"url(#metal)")}<path d="M25 87V39l52-27 56 15v48" fill="none" stroke="#79f2a6" stroke-width="7"/><path d="m57 135 20-10 23 7-22 11z" fill="#79f2a6"/></g>
      <g font-family="monospace" font-size="12"><text x="25" y="286" fill="#cbd9d3">✓ DNS answer validation</text><text x="25" y="315" fill="#cbd9d3">✓ admitted-address pinning</text><text x="25" y="344" fill="#cbd9d3">✓ redirect re-checks</text><text x="25" y="373" fill="#cbd9d3">✓ robots + hard budgets</text></g>
    </g>
    <g transform="translate(376 112)"><rect width="300" height="398" fill="#0b1512" stroke="#45675c"/><text x="25" y="38" fill="#f1f5f2" font-family="Arial" font-size="24" font-weight="700">Restricted serverless</text><text x="25" y="62" fill="#8cd8e8" font-family="monospace" font-size="11">FOR ORIGINS YOU OWN OR TRUST</text>
      <g transform="translate(74 104)">${cube(0,38,152,118,62,"url(#metal2)")}<rect x="40" y="81" width="73" height="48" fill="#08110e" stroke="#8cd8e8"/><circle cx="77" cy="105" r="9" fill="#79f2a6"/><path d="M24 92h13M24 111h13M116 92h13M116 111h13" stroke="#8cd8e8" stroke-width="3"/></g>
      <g font-family="monospace" font-size="12"><text x="25" y="286" fill="#cbd9d3">✓ HTTPS origin allowlist</text><text x="25" y="315" fill="#cbd9d3">✓ robots + hard budgets</text><text x="25" y="344" fill="#ffcead">! no DNS classification</text><text x="25" y="373" fill="#ffcead">! add platform egress controls</text></g>
    </g>
    <path d="M344 311h32" stroke="#79f2a6" stroke-width="3" stroke-dasharray="5 5"/>
    <text x="360" y="556" text-anchor="middle" fill="#8da19a" font-family="monospace" font-size="11">No universal-safety claim. The deployment model decides the boundary.</text>
  </svg>`;
}

function doctorArt() {
  const cards = [
    ["WEB", "READY", palette.green],
    ["GITHUB", "PUBLIC / TOKEN", palette.green],
    ["YOUTUBE", "API / NO-KEY", palette.cyan],
    ["X", "API / SESSION", palette.amber],
    ["REDDIT", "API / SESSION", palette.amber],
  ];
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Source doctor checking web and read-only provider adapters">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="385" cy="295" r="290" fill="url(#glow)"/>
    <text x="35" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">SOURCE DOCTOR / LOCAL CHECK</text><text x="35" y="70" fill="#8da19a" font-family="monospace" font-size="11">availability and credential state before dispatch</text>
    <g transform="translate(70 104)"><rect width="580" height="400" rx="4" fill="#0b1411" stroke="#45675c"/><rect width="580" height="48" fill="#101a16" stroke="#45675c"/><circle cx="25" cy="24" r="5" fill="#ff8b7b"/><circle cx="43" cy="24" r="5" fill="#ffb589"/><circle cx="61" cy="24" r="5" fill="#79f2a6"/><text x="86" y="29" fill="#8fa39b" font-family="monospace" font-size="11">$ cockroach-sources doctor --json</text>
      ${cards.map((card,index) => {
        const y = 73 + index * 60;
        return `<g transform="translate(24 ${y})"><rect width="532" height="46" fill="#0e1b17" stroke="#284139"/><circle cx="22" cy="23" r="6" fill="${card[2]}"/><text x="44" y="20" fill="#eef4f1" font-family="Arial" font-size="14" font-weight="700">${card[0]}</text><text x="44" y="35" fill="#82988f" font-family="monospace" font-size="9">READ-ONLY ADAPTER</text><rect x="355" y="10" width="155" height="26" rx="13" fill="#07100e" stroke="${card[2]}" stroke-opacity=".6"/><text x="432" y="27" text-anchor="middle" fill="${card[2]}" font-family="monospace" font-size="9">${card[1]}</text></g>`;
      }).join("")}
      <g transform="translate(24 378)"><path d="M0 0h532" stroke="#284139"/><text x="0" y="0" fill="#8da19a" font-family="monospace" font-size="10"></text></g>
    </g>
    <g transform="translate(468 514)"><rect width="182" height="34" rx="17" fill="#07100e" stroke="#79f2a6"/><circle cx="18" cy="17" r="5" fill="#79f2a6"/><text x="33" y="21" fill="#b1f8c9" font-family="monospace" font-size="10">NO COOKIE FALLBACKS</text></g>
  </svg>`;
}

function budgetsArt() {
  const gauges = [
    ["PAGES", "120", .72, palette.green],
    ["DEPTH", "4", .46, palette.cyan],
    ["BYTES", "3 MiB", .61, palette.green],
    ["REQUESTS", "400", .82, palette.amber],
    ["CONCURRENCY", "8", .52, palette.cyan],
    ["DEADLINE", "10 min", .66, palette.green],
  ];
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Mechanical budget console for pages depth bytes requests concurrency and deadline">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="360" cy="300" r="285" fill="url(#glow)"/>
    <text x="35" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">CREATOR-OWNED BUDGETS / EXAMPLE LIMIT SET</text><text x="35" y="70" fill="#8da19a" font-family="monospace" font-size="11">hard ceilings applied before and during discovery</text>
    <g transform="translate(60 106)" filter="url(#shadow)"><path d="M0 70 290 0l310 74-302 76z" fill="url(#metal)" stroke="#55796d"/><path d="M0 70v337l298 82V150z" fill="#091511" stroke="#45675c"/><path d="M298 150v339l302-146V74z" fill="#0c1c17" stroke="#45675c"/>
      ${gauges.map((g,index) => {
        const col = index % 2;
        const row = Math.floor(index/2);
        const x = 35 + col * 135;
        const y = 118 + row * 93;
        const angle = -130 + g[2] * 260;
        return `<g transform="translate(${x} ${y})"><circle cx="45" cy="38" r="33" fill="#07100e" stroke="#355349" stroke-width="5"/><path d="M18 52a32 32 0 1 1 54 0" fill="none" stroke="#233b32" stroke-width="6"/><path d="M18 52a32 32 0 0 1 ${54*g[2]+18} -33" fill="none" stroke="${g[3]}" stroke-width="5" opacity=".8"/><line x1="45" y1="38" x2="45" y2="15" stroke="${g[3]}" stroke-width="4" transform="rotate(${angle} 45 38)"/><circle cx="45" cy="38" r="5" fill="${g[3]}"/><text x="93" y="27" fill="#879b93" font-family="monospace" font-size="9">${g[0]}</text><text x="93" y="48" fill="#f1f5f2" font-family="Arial" font-weight="700" font-size="17">${g[1]}</text></g>`;
      }).join("")}
      <g transform="translate(341 150)"><rect width="212" height="172" fill="#08110e" stroke="#355349"/><text x="18" y="29" fill="#8da19a" font-family="monospace" font-size="10">LIMIT EVALUATION</text><path d="M18 56h176M18 88h176M18 120h176M18 152h176" stroke="#294139"/><circle cx="30" cy="72" r="5" fill="#79f2a6"/><circle cx="30" cy="104" r="5" fill="#79f2a6"/><circle cx="30" cy="136" r="5" fill="#ffb589"/><text x="46" y="76" fill="#c5d6cf" font-family="monospace" font-size="10">ADMIT NEXT URL</text><text x="46" y="108" fill="#c5d6cf" font-family="monospace" font-size="10">DEBIT BUDGET</text><text x="46" y="140" fill="#ffd0b2" font-family="monospace" font-size="10">STOP AT CEILING</text></g>
      <text x="344" y="386" fill="#c3d3cd" font-family="monospace" font-size="13" transform="skewY(-16)">HARD CEILINGS</text>
    </g>
    <g transform="translate(466 516)"><rect width="192" height="34" rx="17" fill="#07100e" stroke="#ffb589"/><circle cx="18" cy="17" r="5" fill="#ffb589"/><text x="33" y="21" fill="#ffcead" font-family="monospace" font-size="10">DENY WHEN EXHAUSTED</text></g>
  </svg>`;
}

function recordsArt() {
  const fields = [
    ["source", "web"],
    ["type", "document"],
    ["title", "Deployment guide"],
    ["url", "https://example.test/guide"],
    ["text", "Retrieved page content…"],
    ["contentHash", "sha256:4f29…"],
    ["provenance.retrievedAt", "2026-07-18T…Z"],
  ];
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Normalized record machine producing attributable structured output">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="360" cy="300" r="280" fill="url(#glow)"/>
    <text x="35" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">NORMALIZED RECORDS</text><text x="35" y="70" fill="#8da19a" font-family="monospace" font-size="11">source identity and retrieval context stay attached</text>
    <g transform="translate(65 155)">${cube(0,0,150,85,62,"#162720")}<path d="M26 58h83M26 79h62M26 100h91" stroke="#8cd8e8" stroke-width="3"/><text x="19" y="-13" fill="#9db2aa" font-family="monospace" font-size="12">PUBLIC SOURCE</text></g>
    <path d="M215 273h102" stroke="#79f2a6" stroke-width="5" stroke-dasharray="9 7"/><path d="m307 263 15 10-15 10" fill="#79f2a6"/>
    <g transform="translate(305 105)" filter="url(#shadow)"><rect width="352" height="404" fill="#0b1512" stroke="#55796d"/><rect width="352" height="50" fill="#101c17" stroke="#45675c"/><circle cx="26" cy="25" r="7" fill="#79f2a6"/><text x="47" y="30" fill="#f1f5f2" font-family="Arial" font-size="16" font-weight="700">page.record.json</text>
      ${fields.map((field,index) => `<g transform="translate(24 ${76+index*42})"><text x="0" y="18" fill="#79f2a6" font-family="monospace" font-size="9">${field[0]}</text><text x="142" y="18" fill="#c8d6d0" font-family="monospace" font-size="9">${escape(field[1])}</text><path d="M0 29h304" stroke="#243a32"/></g>`).join("")}
      <g transform="translate(24 370)"><rect width="122" height="24" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="61" y="16" text-anchor="middle" fill="#b1f8c9" font-family="monospace" font-size="9">ATTRIBUTABLE</text><rect x="137" width="142" height="24" rx="12" fill="#07100e" stroke="#8cd8e8"/><text x="208" y="16" text-anchor="middle" fill="#b9e7f1" font-family="monospace" font-size="9">WORKFLOW-READY</text></g>
    </g>
    <g transform="translate(73 360)"><rect width="161" height="96" fill="#0c1714" stroke="#45675c"/><text x="18" y="26" fill="#8da19a" font-family="monospace" font-size="9">READ-ONLY INPUT</text><text x="18" y="50" fill="#f1f5f2" font-family="Arial" font-size="15" font-weight="700">Web or API</text><text x="18" y="73" fill="#79f2a6" font-family="monospace" font-size="10">same record shape</text></g>
  </svg>`;
}

function compositeArt() {
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Cockroach Crawler system map from public sources through a bounded gate to normalized records">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="365" cy="300" r="285" fill="url(#glow)"/>
    ${floor()}
    <g transform="translate(65 205)">${cube(0,0,135,70,54,"#162720")}<circle cx="27" cy="55" r="5" fill="#79f2a6"/><path d="M43 55h50M27 74h68M27 93h42" stroke="#8cd8e8" stroke-width="3"/><text x="14" y="-12" fill="#9db2aa" font-family="monospace" font-size="11">PUBLIC WEB</text></g>
    <g transform="translate(70 365)"><rect width="133" height="70" fill="#0e1b17" stroke="#45675c"/><text x="17" y="25" fill="#79f2a6" font-family="monospace" font-size="10">READ-ONLY APIs</text><text x="17" y="47" fill="#cbd8d3" font-family="monospace" font-size="9">GH · YT · X · REDDIT</text></g>
    <g transform="translate(277 135)" filter="url(#shadow)">${cube(0,54,230,214,94,"url(#metal)")}<path d="M35 108V53l80-40 84 22v59" fill="none" stroke="#79f2a6" stroke-width="8"/><path d="M59 101V69l55-27 59 15v29" fill="none" stroke="#20382f" stroke-width="17"/><path d="m86 226 30-15 32 9-31 16z" fill="#79f2a6"/><path d="M86 226v42l31 9v-41z" fill="#285640"/><path d="M117 236v41l31-15v-42z" fill="#17432f"/><circle cx="36" cy="158" r="7" fill="#79f2a6"/><circle cx="36" cy="186" r="7" fill="#8cd8e8"/><circle cx="36" cy="214" r="7" fill="#ffb589"/><text x="57" y="303" fill="#c0d7cd" font-family="monospace" font-size="13" transform="skewY(16)">BOUNDARY GATE</text></g>
    <g transform="translate(545 288)">${cube(0,0,125,70,50,"#173128", "#0a1713", "#0d211a", "#8cd8e8")}<path d="M22 55h70M22 75h51M22 95h80" stroke="#79f2a6" stroke-width="3"/><text x="16" y="-12" fill="#9db2aa" font-family="monospace" font-size="11">RECORDS</text></g>
    <path d="M201 289 290 269M201 402l91-62M500 360l51-20" stroke="#79f2a6" stroke-width="4" stroke-dasharray="8 6"/>
    <g font-family="monospace" font-size="9" text-anchor="middle"><g transform="translate(252 444)"><rect width="96" height="24" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="48" y="16" fill="#b1f8c9">POLICY</text></g><g transform="translate(363 466)"><rect width="96" height="24" rx="12" fill="#07100e" stroke="#79f2a6"/><text x="48" y="16" fill="#b1f8c9">BUDGETS</text></g><g transform="translate(472 447)"><rect width="96" height="24" rx="12" fill="#07100e" stroke="#8cd8e8"/><text x="48" y="16" fill="#b9e7f1">EVIDENCE</text></g></g>
    <text x="35" y="45" fill="#79f2a6" font-family="monospace" font-size="12" letter-spacing="2">PUBLIC REACH / EXPLICIT BOUNDARY</text><text x="35" y="70" fill="#8da19a" font-family="monospace" font-size="11">admit • fetch • extract • normalize • attribute</text>
  </svg>`;
}

function thumbnailArt() {
  return `<svg viewBox="0 0 720 600" role="img" aria-label="Mechanical boundary gate brand mark">
    <rect width="720" height="600" fill="#07100e"/><rect width="720" height="600" fill="url(#grid)"/><circle cx="360" cy="300" r="280" fill="url(#glow)"/>
    <g transform="translate(220 105)" filter="url(#shadow)">${cube(0,70,280,225,112,"url(#metal)")}<path d="M42 136V67L139 18l101 27v74" fill="none" stroke="#79f2a6" stroke-width="12"/><path d="M72 126V90l66-34 72 20v32" fill="none" stroke="#20382f" stroke-width="25"/><path d="m103 231 36-18 42 12-40 20z" fill="#79f2a6"/><path d="M103 231v55l38 11v-52z" fill="#285640"/><path d="M141 245v52l40-19v-53z" fill="#17432f"/><circle cx="48" cy="184" r="10" fill="#79f2a6"/><circle cx="48" cy="222" r="10" fill="#8cd8e8"/><circle cx="48" cy="260" r="10" fill="#ffb589"/></g>
  </svg>`;
}

function artFor(motif) {
  if (motif === "local") return localArt();
  if (motif === "serverless") return serverlessArt();
  if (motif === "tiers") return tiersArt();
  if (motif === "doctor") return doctorArt();
  if (motif === "budgets") return budgetsArt();
  if (motif === "records") return recordsArt();
  if (motif === "thumbnail") return thumbnailArt();
  return compositeArt();
}

function textLines(lines, x, y, size, lineHeight, maxWidth) {
  return `<text x="${x}" y="${y}" fill="#f1f5f2" font-family="'Arial',sans-serif" font-size="${size}" font-weight="750" letter-spacing="${-size*.032}">${lines.map((line,index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escape(line)}</tspan>`).join("")}</text>`;
}

function renderAsset(asset) {
  const { width: w, height: h } = asset;
  const ratio = w / h;
  const compact = w <= 300;
  const horizontal = ratio >= 1.38;
  const pad = Math.round(Math.min(w, h) * (compact ? .075 : .06));
  const art = artFor(asset.motif);

  if (compact) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">Cockroach Crawler Product Hunt thumbnail</title><desc id="desc">Mechanical policy gate representing bounded public-web crawling.</desc>${defs()}<rect width="${w}" height="${h}" fill="url(#bg)"/><svg x="15" y="10" width="210" height="175" viewBox="0 0 720 600">${art}</svg><text x="120" y="200" text-anchor="middle" fill="#f1f5f2" font-family="Arial" font-size="13" font-weight="800" letter-spacing="2">COCKROACH</text><text x="120" y="218" text-anchor="middle" fill="#79f2a6" font-family="monospace" font-size="10" letter-spacing="2">CRAWLER</text><text x="120" y="232" text-anchor="middle" fill="#8da19a" font-family="monospace" font-size="5.5" letter-spacing=".7">BOUNDED PUBLIC-WEB REACH</text></svg>`;
  }

  const top = pad;
  const brandSize = Math.max(23, Math.min(34, h * .045));
  const eyebrowSize = Math.max(10, Math.min(16, h * .021));
  const textX = pad;
  const textY = horizontal ? h * .27 : h * .19;
  const artX = horizontal ? w * .51 : pad;
  const artY = horizontal ? h * .12 : h * .44;
  const artW = horizontal ? w * .45 : w - pad * 2;
  const artH = horizontal ? h * .72 : h * .45;
  const textW = horizontal ? w * .42 : w - pad * 2;
  const nominalHeadlineSize = horizontal
    ? Math.max(34, Math.min(66, h * .086))
    : Math.max(48, Math.min(72, w * .064));
  const longestHeadline = Math.max(...asset.headline.map((line) => line.length));
  const fittedHeadlineSize = textW / Math.max(1, longestHeadline * .53);
  const headlineSize = Math.max(horizontal ? 31 : 44, Math.min(nominalHeadlineSize, fittedHeadlineSize));
  const lineHeight = headlineSize * .96;
  const subSize = Math.max(15, Math.min(23, h * .029));
  const subY = textY + (asset.headline.length - 1) * lineHeight + headlineSize * .77;
  const chipScale = Math.max(.76, Math.min(1.16, h / 720));
  let chipX = textX;
  let chipY = subY + subSize * 3.05;
  const chipMarkup = asset.chips.slice(0, horizontal ? 4 : 4).map((label, index) => {
    const computedWidth = Math.max(76, label.length * 7.2 + 28) * chipScale;
    if (chipX + computedWidth > textX + textW) {
      chipX = textX;
      chipY += 38 * chipScale;
    }
    const result = pill(chipX, chipY, label, index % 3 === 1 ? palette.cyan : palette.green, chipScale);
    chipX += computedWidth + 10 * chipScale;
    return result;
  }).join("");
  const footerY = h - pad * .57;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc">
    <title id="title">${escape(asset.headline.join(" "))}</title>
    <desc id="desc">${escape(asset.subhead)}</desc>
    ${defs()}
    <rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#grid)" opacity=".18"/>
    <path d="M0 ${h*.03}H${w}" stroke="#1e3029"/><path d="M0 ${h*.965}H${w}" stroke="#1e3029"/>
    ${brand(pad, top, brandSize)}
    <text x="${textX}" y="${textY - headlineSize*.82}" fill="#79f2a6" font-family="'Courier New',monospace" font-size="${eyebrowSize}" font-weight="700" letter-spacing="${eyebrowSize*.18}">${escape(asset.eyebrow)}</text>
    ${textLines(asset.headline, textX, textY, headlineSize, lineHeight, textW)}
    <foreignObject x="${textX}" y="${subY}" width="${textW}" height="${subSize*2.45}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:${subSize}px;line-height:1.42;color:#a7b7b0;max-width:${textW}px">${escape(asset.subhead)}</div></foreignObject>
    ${chipMarkup}
    <g transform="translate(${artX} ${artY})"><rect width="${artW}" height="${artH}" fill="#09110e" stroke="#355349"/><svg x="0" y="0" width="${artW}" height="${artH}" viewBox="0 0 720 600" preserveAspectRatio="xMidYMid meet">${art}</svg></g>
    <text x="${pad}" y="${footerY}" fill="#8da19a" font-family="'Courier New',monospace" font-size="${Math.max(9, Math.min(13,h*.018))}" letter-spacing=".8">${escape(asset.hook.toUpperCase())}</text>
    <text x="${w-pad}" y="${footerY}" text-anchor="end" fill="#79f2a6" font-family="'Courier New',monospace" font-size="${Math.max(9, Math.min(13,h*.018))}" letter-spacing=".8">COCKROACHCRAWLER.COM</text>
  </svg>`;
}

await mkdir(svgDir, { recursive: true });
await mkdir(pngDir, { recursive: true });

for (const asset of assets) {
  await writeFile(join(svgDir, `${asset.id}.svg`), renderAsset(asset), "utf8");
}

await writeFile(
  join(root, "manifest.json"),
  `${JSON.stringify(assets.map(({ id, width, height, motif, hook, headline, subhead }) => ({
    id,
    width,
    height,
    motif,
    hook,
    alt: `${headline.join(" ")} ${subhead}`,
  })), null, 2)}\n`,
  "utf8",
);

const browser = await chromium.launch({ headless: true });
try {
  for (const asset of assets) {
    const page = await browser.newPage({ viewport: { width: asset.width, height: asset.height }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(join(svgDir, `${asset.id}.svg`)).href, { waitUntil: "load" });
    await page.screenshot({ path: join(pngDir, `${asset.id}.png`), omitBackground: false });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Rendered ${assets.length} editable SVG files and ${assets.length} PNG files.`);
