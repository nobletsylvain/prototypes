// Instrumente chaque ecriture de save pour voir l'ordre exact des evenements.
import { readFileSync, existsSync } from "fs";
import http from "http";
import path from "path";
import puppeteer from "puppeteer";

const ROOT = "/home/user/prototypes";
const SAVE_VER = (readFileSync(path.join(ROOT, "la-loupe/index.html"), "utf8").match(/SAVE_VERSION\s*=\s*"(\d+)"/) || [, "30"])[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { ".html":"text/html", ".mjs":"text/javascript", ".js":"text/javascript",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

const browser = await puppeteer.launch({ headless:"new", args:["--no-sandbox","--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.evaluateOnNewDocument((ver) => {
  localStorage.setItem("loupe_ver", ver);
  localStorage.setItem("loupe_save", JSON.stringify({
    dirty: 900, heat: 88, day: 3, reput: 40,
    pains: [{ g:100, q:52 }], sachets: { "2": 80 }, sachetQ: 62,
    shelter: { phase: "B", introSeen: true, frontActive: false, paidOff: true,
      pdv: { res: 70, bac: 220, prix: 10, chouffes: 0, tampon: { "2": 60 }, tamponQ: 62,
        queue: [], ledger: [], qacc: 0, serveAcc: 0, seq: 0, combo: 1 } },
  }));
  window.__hist = [];
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v){
    if (k === "loupe_save" && window.__seeded) {
      try { const s = JSON.parse(v); window.__hist.push({
        t: Math.round(performance.now()),
        heat: Math.round(s.heat*10)/10, reput: s.reput,
        tamp: Object.values(s.shelter.pdv.tampon||{}).reduce((a,n)=>a+n,0),
        bac: Math.round(s.shelter.pdv.bac), j0: (s.journal||[])[0]?.txt }); } catch {}
      if (window.__hist.length > 400) window.__hist.shift();
    }
    return orig.call(this, k, v);
  };
  window.__seeded = true;
}, SAVE_VER);

await page.goto(`http://127.0.0.1:${PORT}/la-loupe/index.html`, { waitUntil: "load" });
await sleep(400);
// va a l'Atelier, laisse chauffer jusqu'a 100
await page.evaluate(() => { document.querySelectorAll('#dock .tab').forEach(b => { if(b.textContent.includes("Atelier")) b.click(); }); });
await sleep(25000);
console.log("heat avant retour:", await page.evaluate(()=>document.getElementById("hudHeat").textContent));
await page.evaluate(()=>{ window.__hist = []; });

await page.evaluate(() => { document.querySelectorAll('#dock .tab').forEach(b => { if(b.textContent.includes("Quartier")) b.click(); }); });
await sleep(200);
await page.click('.map-pin[data-pin="pdv"]');
await sleep(200);
console.log("--- avant Tenir le corner ---");
console.log(JSON.stringify(await page.evaluate(()=>window.__hist), null, 0));
await page.evaluate(()=>{ window.__hist = []; });
await page.click('[data-pin-go="pdv"]');
await sleep(400);
console.log("--- apres Tenir le corner (chaque save) ---");
for (const h of await page.evaluate(()=>window.__hist)) console.log("  ", JSON.stringify(h));
console.log("TOAST:", await page.evaluate(()=>document.getElementById("toast")?.textContent));
// etat DOM du corner : tampon expose reellement affiche
console.log("DOM tampon:", await page.evaluate(()=>document.getElementById("pTamp")?.textContent));

await browser.close(); server.close();
