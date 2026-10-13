const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-dev-shm-usage']
  });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();

  await p.goto('https://internshala.com/student/login', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: 'dbg1-login.png', fullPage: true });

  await p.fill('#email', 'tsuneyukizoey@gmail.com').catch(()=>{});
  await p.fill('#password', 'Dermaga07A').catch(()=>{});
  await p.screenshot({ path: 'dbg2-filled.png', fullPage: true });

  await p.click('button[type="submit"]').catch(()=>{});
  await p.waitForTimeout(8000);
  await p.screenshot({ path: 'dbg3-after-login.png', fullPage: true });

  console.log('URL after login:', p.url());

  fs.writeFileSync('onboard.html', await p.content());
  fs.writeFileSync('onboard.png', 'placeholder');

  await b.close();
  console.log('Done');
})().catch((e) => {
  console.error('[!] ' + e.message);
  process.exit(1);
});
