import { chromium } from 'playwright';

const W = 760, H = 1090;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: 'video', size: { width: W, height: H } },
});
const page = await context.newPage();
await page.goto('https://blinklysprove.vercel.app', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Intro: fyll inn navn tegn for tegn
await page.click('#playerName');
await page.type('#playerName', 'Eirik Aflekt', { delay: 90 });
await page.waitForTimeout(500);
await page.click('text=Start blinklysprøven');

// Scroll så canvas og ratt er i bildet
await page.waitForSelector('canvas');
const box = await page.locator('main').boundingBox();
console.log('main box', JSON.stringify(box));
await page.waitForTimeout(1200);

// Blink til høyre ... og sving til venstre
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(1600);
const wheel = page.locator('div.rounded-full.cursor-pointer');
const wb = await wheel.boundingBox();
await page.mouse.click(wb.x + wb.width * 0.2, wb.y + wb.height / 2);

// crash + wasted + fade + jail = ca. 6.3 s
await page.waitForSelector('text=Sak ikke bestått', { timeout: 15000 });
await page.waitForTimeout(3500);
console.log(await page.locator('.absurd-block').innerText());

await context.close();
await browser.close();
