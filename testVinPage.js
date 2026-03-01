const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
  page.on('request', r => console.log('req', r.method(), r.url()));
  page.on('response', async r => {
    if (r.url().includes('vin') || r.url().includes('generate')) {
      console.log('resp', r.url());
      try { console.log((await r.text()).slice(0,500)); } catch(e) {}
    }
  });

  await page.goto('https://vingenerator.org/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const t = await b.textContent();
    console.log('button:', t);
  }
  for (const b of buttons) {
    const t = await b.textContent();
    if (t && t.toLowerCase().includes('generate')) {
      console.log('clicking', t);
      await b.click();
      break;
    }
  }
  await page.waitForTimeout(5000);
  console.log('FINAL HTML snippet:', (await page.content()).slice(0,2000));
  await browser.close();
  } catch (err) {
    console.error('script error', err);
  }
})();