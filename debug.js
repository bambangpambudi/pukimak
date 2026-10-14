const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
chromium.use(stealth);

(async () => {
  const b = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-dev-shm-usage']
  });
  const ctx = await b.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const p = await ctx.newPage();

  console.log('1. Buka login');
  await p.goto('https://internshala.com/student/login', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await p.waitForTimeout(4000);

  console.log('2. Isi login form (paksa visible)');
  await p.evaluate(() => {
    const em = document.querySelector('#modal_email');
    const pw = document.querySelector('#modal_password');
    if (em) { em.value = 'tsuneyukizoey@gmail.com'; em.dispatchEvent(new Event('input', {bubbles:true})); }
    if (pw) { pw.value = 'Dermaga07A'; pw.dispatchEvent(new Event('input', {bubbles:true})); }
  });
  await p.evaluate(() => {
    const btn = document.querySelector('#modal_login_submit');
    if (btn) btn.click();
  });
  await p.waitForTimeout(10000);
  console.log('   URL:', p.url());

  console.log('3. Goto profile edit');
  await p.goto('https://internshala.com/student/profile', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await p.waitForTimeout(5000);
  console.log('   URL:', p.url());

  console.log('4. Cari input yang ada "skill"');
  const inputs = await p.$$eval('input, textarea', els =>
    els.map(e => ({
      id: e.id, name: e.name, type: e.type,
      placeholder: e.placeholder,
      cls: e.className.slice(0,80),
      visible: e.offsetParent !== null
    })).filter(e =>
      /skill/i.test(e.id + ' ' + e.name + ' ' + e.placeholder + ' ' + e.cls)
    )
  );
  console.log(JSON.stringify(inputs, null, 2));

  console.log('5. Simpan HTML');
  fs.writeFileSync('profile.html', await p.content());
  await p.screenshot({ path: 'profile.png', fullPage: true });

  console.log('6. Done');
  await b.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
