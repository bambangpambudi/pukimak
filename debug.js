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

  console.log('1. Buka registration/student');
  await p.goto('https://internshala.com/registration/student', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await p.waitForTimeout(5000);

  console.log('2. Cari elemen pemicu modal login');
  const triggers = await p.$$eval('a, button, span, div', (nodes) => {
    return nodes
      .filter(n => {
        const t = (n.innerText || '').trim().toLowerCase();
        return (t === 'login' || t.includes('already registered')) && n.offsetParent !== null;
      })
      .map(n => ({
        tag: n.tagName,
        text: (n.innerText || '').trim(),
        id: n.id,
        cls: n.className,
        href: n.href || null
      }));
  });
  console.log(JSON.stringify(triggers, null, 2));

  console.log('3. Paksa buka modal via JS');
  const opened = await p.evaluate(() => {
    const modal = document.querySelector('#modal_login, #login_modal, [id*="login"][class*="modal"], .modal');
    if (!modal) return 'no modal found';
    modal.style.display = 'block';
    modal.classList.add('show', 'in');
    document.body.classList.add('modal-open');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade in';
    document.body.appendChild(backdrop);
    return 'modal: ' + modal.id + ' opened';
  });
  console.log('   ' + opened);
  await p.waitForTimeout(1500);

  console.log('4. Isi form login via JS (bypass visible)');
  const filled = await p.evaluate(() => {
    const email = document.querySelector('#modal_email');
    const pass = document.querySelector('#modal_password');
    if (!email || !pass) return 'field tidak ada';
    email.value = 'tsuneyukizoey@gmail.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    email.dispatchEvent(new Event('change', { bubbles: true }));
    pass.value = 'Dermaga07A';
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    pass.dispatchEvent(new Event('change', { bubbles: true }));
    return 'email=' + email.value + ', pass length=' + pass.value.length;
  });
  console.log('   ' + filled);

  console.log('5. Cek visible sekarang');
  const vis = await p.$$eval('input', (nodes) =>
    nodes.filter(n => n.offsetParent !== null).map(n => ({
      id: n.id, name: n.name, type: n.type, value: n.value
    }))
  );
  console.log(JSON.stringify(vis, null, 2));

  console.log('6. Submit');
  const submitted = await p.evaluate(() => {
    const btn = document.querySelector('#modal_login_submit');
    if (!btn) return 'tombol tidak ada';
    btn.click();
    return 'clicked';
  });
  console.log('   ' + submitted);
  await p.waitForTimeout(10000);

  console.log('7. URL:', p.url());
  await p.screenshot({ path: 'dbg-after.png', fullPage: true });
  fs.writeFileSync('after-login.html', await p.content());

  console.log('8. Done');
  await b.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
