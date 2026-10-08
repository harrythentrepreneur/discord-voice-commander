// Renders the README screenshots from the real page with made-up sample data (no Discord, no voice).
// node scripts/demo-screens.mjs [url]   (server must be running; CHROME_PATH optional)
import { chromium } from "playwright";
const U = process.argv[2] || "http://127.0.0.1:3077";
const now = Date.now(), t = (m) => new Date(now - m * 60e3).toISOString();
// A sample "new logo" image: a simple mark on warm paper.
const IMG = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="280"><rect width="540" height="280" fill="#ebe4de"/><circle cx="150" cy="140" r="50" fill="#1f2322"/><path d="M130 140h40M150 120v40" stroke="#fdfcfb" stroke-width="11" stroke-linecap="round"/><text x="222" y="156" font-family="Georgia,serif" font-size="44" fill="#1f2322">Northwind</text></svg>`);
const log = [
  { type: "heard", text: "What did I miss in design?", device: "demo", at: t(3) },
  { type: "reply", device: "demo", at: t(3), brain: "B", text: "Two things. Maya posted the new logo for review and wants a yes or no by Friday. Leo asked whether the launch moves to Friday; nobody has answered him yet.",
    sources: [
      { room: "#design", author: "Maya", at: t(42), text: "New logo, final round. Thoughts by Friday? 🙏", url: "#", media: [{ kind: "image", url: IMG }] },
      { room: "#design", author: "Leo", at: t(15), text: "Are we moving the launch to Friday? Need to tell the printers.", url: "#" },
    ] },
];
const requests = { items: [
  { room: "#design", status: "done", text: "Tell Leo yes, the launch is Friday.", at: t(2), lastActivity: t(1), url: "#", replies: [{ author: "Leo", text: "Done. The plan says Friday and the printers know." }] },
  { room: "#support", status: "needs you", text: "Can someone check why refunds are slow this week?", at: t(55), lastActivity: t(20), url: "#", replies: [{ author: "Atlas", text: "Found it: the payment provider batches refunds on Mondays. Should I tell affected customers?" }] },
  { room: "#dev", status: "working", title: "Login bug", text: "Users on Android get logged out after an hour.", at: t(80), lastActivity: t(6), url: "#", replies: [] },
  { room: "#general", status: "no reply yet", text: "Team lunch Thursday at 1, my treat.", at: t(130), url: "#" },
] };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { localStorage.dvcDevice = "demo"; });
await ctx.route("**/api/session", (r) => r.fulfill({ json: { authed: true, voice: { ok: true } } }));
await ctx.route("**/api/state**", (r) => r.fulfill({ json: { log, canUndo: true, pending: null } }));
await ctx.route("**/api/requests", (r) => r.fulfill({ json: requests }));
const p = await ctx.newPage();
await p.goto(U); await p.waitForSelector("#app:not([hidden])"); await p.waitForTimeout(400);
await p.evaluate(() => { document.querySelector("#log").innerHTML = ""; document.querySelector("#empty").hidden = false; document.querySelector("#quick").hidden = true; document.body.classList.remove("can-undo"); });
await p.screenshot({ path: "docs/screen-home.png" });
await p.reload(); await p.waitForSelector("#log li"); await p.waitForTimeout(1200);
await p.evaluate(() => { const f = document.querySelector("#feed"); f.scrollTop = 0; });
await p.waitForTimeout(300);
await p.screenshot({ path: "docs/screen-answer.png" });
await p.click("#open-requests"); await p.waitForTimeout(800);
await p.screenshot({ path: "docs/screen-requests.png" });
await p.evaluate(() => { const l = document.querySelector("#req-list"); while (l.children.length > 3) l.lastChild.remove(); document.querySelector(".settings").style.display = "none"; });
await p.waitForTimeout(200);
await p.screenshot({ path: "docs/screen-requests.png" });
// one combined banner for the README
const page = await (await b.newContext({ viewport: { width: 1520, height: 1000 }, deviceScaleFactor: 1 })).newPage();
const fs = await import("node:fs");
const src = (f) => "data:image/png;base64," + fs.readFileSync("docs/" + f).toString("base64");
await page.setContent(`<body style="margin:0;background:#ebe4de;display:flex;gap:50px;justify-content:center;align-items:center;height:1000px">${["screen-home.png", "screen-answer.png", "screen-requests.png"].map((f) => `<img src="${src(f)}" style="width:390px;border-radius:44px;border:10px solid #1f2322;box-shadow:0 40px 80px -40px rgba(31,35,34,.6)">`).join("")}</body>`);
await page.screenshot({ path: "docs/screens.png" });
await b.close();
console.log("wrote docs/screens.png and docs/screen-*.png");
