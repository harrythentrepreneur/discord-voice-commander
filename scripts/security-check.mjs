// Live security probe against a running server: `node scripts/security-check.mjs [url]`.
// Checks: auth required on every API, login lockout, security headers, no secrets in the page.
const U = process.argv[2] || "http://127.0.0.1:3077";
const out = [];
const ok = (name, pass, detail = "") => out.push(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
for (const p of ["/api/state", "/api/requests", "/api/ask", "/api/undo", "/api/offer"]) {
  const r = await fetch(U + p, { method: p === "/api/state" || p === "/api/requests" ? "GET" : "POST", headers: { "content-type": "application/json" }, body: p.endsWith("state") || p.endsWith("requests") ? undefined : "{}" });
  ok(`auth required ${p}`, r.status === 401, String(r.status));
}
const h = (await fetch(U + "/")).headers;
for (const k of ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy"]) ok(`header ${k}`, !!h.get(k));
const page = (await (await fetch(U + "/")).text()) + (await (await fetch(U + "/app.js")).text());
ok("no tokens in page", !/(\bBot [A-Za-z0-9._-]{20,}|\bsk-[A-Za-z0-9_-]{20,}|eyJhbGciOi[A-Za-z0-9._-]{20,}|DISCORD_BOT_TOKEN=\S)/.test(page));
let last = 0;
for (let i = 0; i < 6; i++) last = (await fetch(U + "/api/login", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `1.2.3.${i}, 100.64.0.9` }, body: '{"code":"nope"}' })).status;
ok("login lockout after 5 wrong codes (spoofed X-Forwarded-For ignored)", last === 429, String(last));
ok("path traversal blocked", (await fetch(U + "/..%2f.env")).status === 404);
console.log(out.join("\n"));
process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
