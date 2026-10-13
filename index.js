#!/usr/bin/env node
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const readline = require('readline');

const BASE = 'https://internshala.com';

const FIRST = ['A5RT','Rizky','Budi','Sari','Dewi','Andi','Putri','Eko'];
const LAST  = ['Doe','Santoso','Wijaya','Pratama','Lestari','Nugroho'];
const CITIES = ['Mumbai','Delhi','Bangalore','Jakarta','Surabaya'];
const GENDERS = ['Male','Female'];
const LANGS = ['English','Hindi','Telugu','Tamil'];
const TYPES = ['Fresher','College student','Working professional'];
const COURSES = ['B.Tech','BE','B.Com','MBA','B.A'];
const STREAMS = ['Computer Science','Information Technology','Commerce'];
const YEARS = ['2020','2021','2022','2023','2024'];
const INTERESTS = ['Sales','Data Entry','Digital Marketing','Web Development','Marketing','Finance','Software Development','Programming'];
const LOOKING = ['Jobs','Internships'];
const MODES = ['In-office','Work from home'];
const GOALS = ['Get an online degree from a premium institute in India','Go for study abroad','Prepare for government exams'];
const COLLEGES = ['BITS Pilani','BIT Sindri','IIT Delhi','IIT Bombay','NIT Trichy'];

function pick(a){return a[Math.floor(Math.random()*a.length)];}
function pickMany(a,min,max){const n=min+Math.floor(Math.random()*(max-min+1));return a.slice().sort(()=>Math.random()-0.5).slice(0,n);}
function phone(){let s='';for(let i=0;i<10;i++)s+=Math.floor(Math.random()*10);return s;}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
function nameFromEmail(mail){
  const l=(mail.split('@')[0]||'').toLowerCase().replace(/[^a-z]/g,'');
  if(!l)return null;
  if(l.length>=6){const m=Math.floor(l.length/2);return{first:cap(l.slice(0,m)),last:cap(l.slice(m))};}
  return{first:cap(l),last:pick(LAST)};
}

const rl = readline.createInterface({input:process.stdin,output:process.stdout});
const ask = (q) => new Promise((r) => rl.question(q,r));
const log = (s) => console.log(s);

async function fillField(page, sels, val, label) {
  for (const s of sels) {
    try {
      const el = await page.$(s);
      if (!el) continue;
      if (!(await el.isVisible())) continue;
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: 2000 });
      await page.waitForTimeout(150);
      await el.fill('');
      await el.type(val, { delay: 50 });
      log('  [text] ' + (label||s) + ' = ' + val);
      return true;
    } catch(e){}
  }
  log('  [!] gagal text: ' + (label||sels[0]));
  return false;
}

async function clickPill(page, text) {
  const sels = [
    'button:has-text("' + text + '")',
    'label:has-text("' + text + '")',
    'div[role="button"]:has-text("' + text + '")',
    'span:has-text("' + text + '")',
    'text="' + text + '"',
  ];
  for (const s of sels) {
    try {
      const el = await page.$(s);
      if (el && await el.isVisible()) {
        await el.scrollIntoViewIfNeeded();
        await el.click({ timeout: 2000 });
        log('  [pill] ' + text);
        return true;
      }
    } catch(e){}
  }
  log('  [!] gagal pill: ' + text);
  return false;
}

async function clickCheckbox(page, text) {
  try {
    const handle = await page.evaluateHandle((t) => {
      const labels = Array.from(document.querySelectorAll('label'));
      for (const l of labels) {
        if (l.innerText.trim().includes(t)) {
          const inp = l.querySelector('input[type="checkbox"]');
          if (inp) return inp;
          if (l.htmlFor) {
            const el = document.getElementById(l.htmlFor);
            if (el) return el;
          }
        }
      }
      return null;
    }, text);
    const el = handle.asElement();
    if (el) {
      await el.scrollIntoViewIfNeeded();
      await el.check({ timeout: 2000 });
      log('  [check] ' + text);
      return true;
    }
  } catch(e){}
  log('  [!] gagal check: ' + text);
  return false;
}

async function autocomplete(page, sel, query, matchFirst) {
  try {
    const inp = await page.$(sel);
    if (!inp) { log('  [!] autocomplete tidak ada: ' + sel); return false; }
    await inp.scrollIntoViewIfNeeded();
    await inp.click();
    await inp.fill('');
    await inp.type(query, { delay: 100 });
    await page.waitForTimeout(2500);

    const options = await page.$$('li, [role="option"], .pac-item, [class*="suggestion"], [class*="option"]');
    let clicked = false;
    for (const opt of options) {
      try {
        if (!(await opt.isVisible())) continue;
        const txt = (await opt.innerText()).trim();
        if (!txt) continue;
        if (matchFirst || txt.toLowerCase().includes(query.toLowerCase().slice(0,3))) {
          await opt.click({ timeout: 1500 });
          log('  [auto] ' + query + ' -> ' + txt.slice(0,40));
          clicked = true;
          break;
        }
      } catch(e){}
    }
    if (!clicked) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      log('  [auto-enter] ' + query);
    }
    return true;
  } catch(e) {
    log('  [!] autocomplete gagal: ' + query);
    return false;
  }
}

async function clickNext(page, texts) {
  for (const t of texts) {
    try {
      const btn = await page.$('button:has-text("' + t + '"), a:has-text("' + t + '")');
      if (btn && await btn.isVisible()) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ timeout: 3000 });
        log('  [next] ' + t);
        return true;
      }
    } catch(e){}
  }
  return false;
}

(async () => {
  log('\n=== Internshala Auto Register ===\n');
  const email = (await ask('Email Gmail: ')).trim();
  const password = (await ask('Password (min 6): ')).trim();

  const fe = nameFromEmail(email);
  const first = fe ? fe.first : pick(FIRST);
  const last  = fe ? fe.last  : pick(LAST);

  const data = {
    phone: phone(),
    city: pick(CITIES),
    gender: pick(GENDERS),
    langs: pickMany(LANGS, 1, 2),
    type: pick(TYPES),
    course: pick(COURSES),
    college: pick(COLLEGES),
    stream: pick(STREAMS),
    startYear: pick(YEARS),
    endYear: pick(YEARS),
    interests: pickMany(INTERESTS, 2, 4),
    looking: pick(LOOKING),
    mode: pick(MODES),
    goal: pick(GOALS),
  };

  log('\n[i] Data random:');
  log('  Nama    : ' + first + ' ' + last);
  log('  Email   : ' + email);
  log('  Phone   : +91' + data.phone);
  log('  City    : ' + data.city);
  log('  Gender  : ' + data.gender);
  log('  Bahasa  : ' + data.langs.join(', '));
  log('  Tipe    : ' + data.type);
  log('  Course  : ' + data.course);
  log('  College : ' + data.college);
  log('  Stream  : ' + data.stream);
  log('  Minat   : ' + data.interests.join(', '));
  log('  Cari    : ' + data.looking);
  log('  Mode    : ' + data.mode);
  log('  Goal    : ' + data.goal);
  log('');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ]
  });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: {
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });
  const page = await ctx.newPage();

  // intercept responses buat debug
  page.on('response', async (r) => {
    const u = r.url();
    if (u.includes('registration') || u.includes('submit') || u.includes('otp') || u.includes('verify')) {
      try {
        const txt = await r.text();
        log('[RESP ' + r.status() + '] ' + u.split('?')[0]);
        if (txt.length < 500) log('  body: ' + txt);
      } catch(e){}
    }
  });

  // ================= STEP 1: Halaman awal =================
  log('[*] Buka halaman awal...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 's1-home.png' });

  log('[*] Klik "Continue with Email"...');
  await clickNext(page, ['Continue with Email', 'Login', 'Sign up']);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 's2-signup.png' });

  // ================= STEP 2: Sign up =================
  log('[*] Isi form sign up...');
  await fillField(page, ['#email','#modal_email'], email, 'email');
  await fillField(page, ['#password','#modal_password'], password, 'password');
  await fillField(page, ['#first_name'], first, 'first_name');
  await fillField(page, ['#last_name'], last, 'last_name');

  await page.screenshot({ path: 's3-signup-filled.png' });

  log('[*] Klik "Sign up"...');
  try {
    await page.click('#registration_submit', { timeout: 5000 });
    log('  [next] #registration_submit');
  } catch(e) {
    await clickNext(page, ['Sign up', 'Sign Up', 'Register']);
  }
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 's4-after-signup.png' });

  // cek kalau ada modal error
  const errorText = await page.evaluate(() => {
    const modals = document.querySelectorAll('.modal, .alert, .error, [class*="error"], [class*="alert"]');
    for (const m of modals) {
      if (m.offsetParent !== null) {
        const t = m.innerText.trim();
        if (t && t.length < 300) return t;
      }
    }
    return null;
  });
  if (errorText) log('[!] Modal/error: ' + errorText.replace(/\s+/g, ' '));

  // ================= STEP 3: OTP =================
  log('\n=== OTP dikirim ke email ===');
  const otp = (await ask('Masukkan OTP: ')).trim();

  if (otp) {
    const filled = await page.evaluate((code) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      let count = 0;
      for (const inp of inputs) {
        if (inp.offsetParent === null) continue;
        if (inp.value) continue;
        const type = inp.type || 'text';
        if (type === 'hidden' || type === 'submit' || type === 'checkbox' || type === 'radio') continue;
        inp.focus();
        inp.value = code.charAt(count) || code;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
        if (count >= code.length) break;
      }
      return count;
    }, otp);
    log('  [otp] diisi ke ' + filled + ' field');

    if (filled <= 1) {
      try {
        const inp = await page.$('input[type="tel"], input[inputmode="numeric"], input[name*="otp" i]');
        if (inp) { await inp.fill(otp); }
      } catch(e){}
    }

    await page.screenshot({ path: 's5-otp-filled.png' });
    await clickNext(page, ['Verify','Submit','Continue','Next']);
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 's6-after-otp.png' });
  }

  // ================= STEP 4: Onboarding 1 =================
  log('[*] Form onboarding 1...');
  await page.waitForTimeout(3000);

  await fillField(page, [
    'input[name="mobile"]',
    'input[name="phone"]',
    'input[placeholder*="Mobile" i]',
  ], data.phone, 'phone');

  await autocomplete(page,
    'input[placeholder*="location" i], input[placeholder*="city" i], input[name="city"]',
    data.city, true);

  await clickPill(page, data.gender);
  for (const l of data.langs) await clickPill(page, l);
  await clickPill(page, data.type);
  await clickPill(page, data.course);

  await autocomplete(page,
    'input[placeholder*="BITS" i], input[placeholder*="college" i], input[name="college"]',
    data.college, true);

  await fillField(page, [
    'input[placeholder*="Computer Science" i]',
    'input[name="stream"]',
  ], data.stream, 'stream');

  try {
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[0].selectOption(data.startYear).catch(()=>{});
      await selects[1].selectOption(data.endYear).catch(()=>{});
      log('  [select] year');
    } else {
      await clickPill(page, data.startYear);
      await page.waitForTimeout(500);
      await clickPill(page, data.endYear);
    }
  } catch(e){}

  await page.screenshot({ path: 's7-onboard1.png' });
  await clickNext(page, ['Next','Continue','Save']);
  await page.waitForTimeout(6000);

  // ================= STEP 5: Preferences =================
  log('[*] Form onboarding 2...');
  for (const i of data.interests) await clickPill(page, i);
  await page.screenshot({ path: 's8-prefs.png' });
  await clickNext(page, ['Next','Continue','Save']);
  await page.waitForTimeout(6000);

  // ================= STEP 6: Career goal =================
  log('[*] Form onboarding 3...');
  await clickPill(page, data.looking);
  await clickPill(page, data.mode);
  await clickCheckbox(page, data.goal);
  await page.screenshot({ path: 's9-goal.png' });
  await clickNext(page, ['Find me opportunities','Find opportunities','Finish','Submit','Next']);
  await page.waitForTimeout(8000);

  // ================= STEP 7: Cari Gemini =================
  log('[*] Cari link Gemini...');
  await page.waitForLoadState('networkidle').catch(()=>{});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 's10-dashboard.png', fullPage: true });

  const links = await page.$$eval('a', (els) =>
    els.map((e) => ({ text: (e.innerText||'').trim(), href: e.href }))
  );
  const gem = links.filter((l) =>
    l.text.toLowerCase().includes('gemini') ||
    l.href.toLowerCase().includes('gemini') ||
    l.text.toLowerCase().includes('is pro') ||
    l.text.toLowerCase().includes('limitless')
  );

  log('\n=== Hasil ===');
  if (gem.length) {
    for (const g of gem) log('- ' + g.text + ' -> ' + g.href);
  } else {
    log('Nggak ketemu link Gemini/IS PRO.');
    log('Cek s10-dashboard.png.');
  }

  await ask('\nEnter untuk tutup...');
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('[!] ' + e.message);
  process.exit(1);
});
