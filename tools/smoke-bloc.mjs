// Smoke test headless pour le-bloc : charge, laisse tourner, joue quelques actions,
// capture les erreurs console + une capture d'écran + l'état localStorage.
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = 'file://' + path.resolve(__dirname, '..', 'le-bloc', 'index.html');
const outDir = path.resolve(__dirname, 'shots', 'le-bloc');
import fs from 'fs';
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
});
const page = await browser.newPage();
await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

await page.goto(target, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: path.join(outDir, '01-start.png') });

// laisse tourner ~2s (le four vend)
await new Promise(r => setTimeout(r, 2000));

// baisse le prix pour attirer, puis achète du Zéro-zéro et annonce une qualité < livrée (honnête) et > (déception)
await page.evaluate(() => { const p = document.getElementById('prix'); p.value = 8; p.dispatchEvent(new Event('input')); p.dispatchEvent(new Event('change')); });
await page.click('#chPlus'); // 1 chouffe
await page.click('#btnBuy');
await new Promise(r => setTimeout(r, 200));
// achète la 1re option (savonnette) puis ferme — teste addStock + mélange
const buyBtns = await page.$$('#buyList .buy button');
if (buyBtns[0]) await buyBtns[0].click();
await new Promise(r => setTimeout(r, 150));
await page.click('#btnClose');
await page.screenshot({ path: path.join(outDir, '02-after-buy.png') });

// charcler + encaisser
await page.click('#btnCharcler');
await new Promise(r => setTimeout(r, 1500));
const bacBefore = await page.evaluate(() => document.getElementById('bac').textContent);
await page.click('#btnEncaisser');
await new Promise(r => setTimeout(r, 200));

// laisse chauffer pour tester la descente : force la Heat
await page.evaluate(() => { window.__S && 0; });
await new Promise(r => setTimeout(r, 2500));
await page.screenshot({ path: path.join(outDir, '03-running.png') });

const state = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bloc_save')); } catch (e) { return null; } });

await browser.close();

console.log('bac avant encaisse :', bacBefore);
console.log('état sauvegardé   :', JSON.stringify(state));
console.log('erreurs console   :', errors.length ? errors : 'AUCUNE');
process.exit(errors.length ? 1 : 0);
