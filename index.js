#!/usr/bin/env node
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const readline = require('readline');
const fs = require('fs');
const BASE = 'https://internshala.com';
const COOKIE_FILE = './cookies.json';

const CITIES = ['Mumbai','Delhi','Bangalore','Pune','Chennai'];
const GENDERS = ['Male','Female'];
const LANGS = ['English','Hindi'];
const TYPES = ['Fresher','College student','Working professional'];
const COURSES = ['B.Tech','BE','B.Com','MBA','B.A'];
const STREAMS = ['Computer Science','Information Technology','Commerce'];
const YEARS = ['2020','2021','2022','2023','2024','2025','2026'];
const INTERESTS = ['Sales','Data Entry','Digital Marketing','Web Development','Marketing','Finance'];
const LOOKING = ['Jobs','Internships'];
const MODES = ['In-office','Work from home'];
const GOALS = [
  'Get an online degree from a premium institute in India',
  'Go for study abroad',
  'Prepare for government exams'
];
const COLLEGES = ['BITS Pilani','BIT Sindri','IIT Delhi','IIT Bombay'];
const SKILLS = ['Python','Excel','Communication','Marketing','SQL','Data Analysis'];

function pick(a){return a[Math.floor(Math.random()*a.length)];}
function pickMany(a,min,max){const n=min+Math.floor(Math.random()*(max-min+1));return a.slice().sort(()=>Math.random()-0.5).slice(0,n);}
function phone(){let s='';for(let i=0;i<10;i++)s+=Math.floor(Math.random()*10);return s;}

const rl = readline.createInterface({input:process.stdin,output:process.stdout});
const ask = (q) => new Promise((r) => rl.question(q,r));
const log = (s) => console.log(s);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============ HELPERS ============

async function fillById(page, id, val, label) {
  try {
    const el = await page.$(id);
    if (!el) { log('  [!] ' + (label||id) + ' tidak ada'); return false; }
    if (!(await el.isVisible())) { log('  [!] ' + (label||id) + ' hidden'); return false; }
    await el.scrollIntoViewIfNeeded();
    await el.click({ timeout: 2000 });
    await sleep(150);
    await el.fill('');
    await el.type(val, { delay: 40 });
    log('  [text] ' + (label||id) + ' = ' + val);
    return true;
  } catch(e) {
    log('  [!] gagal ' + (label||id) + ': ' + e.message);
    return false;
  }
}

async function clickChip(page, text) {
  // selector tepat dari HTML: div.chip > span.chip-text
  try {
    const el = await page.$('div.chip:has(span.chip-text:text-is("' + text + '"))');
    if (el && await el.isVisible()) {
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: 2000 });
      log('  [chip] ' + text);
      return true;
    }
  } catch(e){}

  // fallback: klik span.chip-text langsung
  try {
    const el = await page.$('span.chip-text:text-is("' + text + '")');
    if (el && await el.isVisible()) {
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: 2000 });
      log('  [chip-span] ' + text);
      return true;
    }
  } catch(e){}

  log('  [!] gagal chip: ' + text);
  return false;
}

async function autocomplete(page, id, query) {
  try {
    const inp = await page.$(id);
    if (!inp || !(await inp.isVisible())) { log('  [!] autocomplete ' + id + ' nggak ada'); return false; }
    await inp.scrollIntoViewIfNeeded();
    await inp.click();
    await inp.fill('');
    await inp.type(query, { delay: 80 });
    await sleep(2500);

    // cari dropdown suggestion
    const options = await page.$$(
      'ul[role="listbox"] li, [class*="autocomplete"] li, [class*="suggestion"] li, [class*="dropdown"] li, .pac-container .pac-item, [class*="typeahead"] li, div.dropdown div'
    );
    for (const opt of options) {
      try {
        if (!(await opt.isVisible())) continue;
        const txt = (await opt.innerText()).trim();
        if (!txt) continue;
        if (txt.toLowerCase().includes(query.toLowerCase().slice(0,3))) {
          await opt.click({ timeout: 1500 });
          log('  [auto] ' + query + ' -> ' + txt.slice(0,40));
          return true;
        }
      } catch(e){}
    }
    await page.keyboard.press('ArrowDown');
    await sleep(300);
    await page.keyboard.press('Enter');
    log('  [auto-enter] ' + query);
    return true;
  } catch(e) {
    log('  [!] autocomplete gagal: ' + query);
    return false;
  }
}

async function clickNext(page) {
  try {
    const btn = await page.$('button.submit-cta, button.done-cta, button[type="submit"].submit-cta');
    if (btn && await btn.isVisible()) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 3000 });
      log('  [next] submit-cta');
      return true;
    }
  } catch(e){}
  try {
    const btn = await page.$('button:has-text("Next"), button:has-text("Done"), button:has-text("Save")');
    if (btn && await btn.isVisible()) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 3000 });
      log('  [next] button text');
      return true;
    }
  } catch(e){}
  log('  [!] next tidak ketemu');
  return false;
}

// ============ MAIN ============
(async () => {
  log('\n=== Internshala Auto Onboarding + Gemini ===\n');

  if (!fs.existsSync(COOKIE_FILE)) {
    log('[!] File ' + COOKIE_FILE + ' tidak ada.');
    process.exit(1);
  }
  const cookieData = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
  const cookies = cookieData.cookies.map(function(c) {
    var ss = String(c.sameSite || 'lax').toLowerCase();
    if (ss === 'no_restriction') ss = 'none';
    if (ss === 'unspecified') ss = 'lax';
    var finalSS = (ss === 'strict') ? 'Strict' : (ss === 'none') ? 'None' : 'Lax';
    var obj = {
      name: c.name, value: c.value, domain: c.domain,
      path: c.path || '/', httpOnly: c.httpOnly || false,
      secure: c.secure !== false, sameSite: finalSS
    };
    if (c.expirationDate) obj.expires = Math.floor(c.expirationDate);
    return obj;
  });

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
    interests: pickMany(INTERESTS, 2, 3),
    looking: pick(LOOKING),
    mode: pick(MODES),
    goal: pick(GOALS),
    skills: pickMany(SKILLS, 3, 5),
  };

  log('[i] Data:');
  for (const k of Object.keys(data)) log('  ' + k + ': ' + data[k]);
  log('');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });

  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  // ============ CEK LOGIN ============
  log('[*] Buka dashboard');
  await page.goto(BASE + '/student/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: 's1-dashboard.png', fullPage: true });
  log('   URL: ' + page.url());

  // ============ PERSONAL DETAILS ============
  log('\n[*] Buka personal_details');
  await page.goto(BASE + '/student/personal_details/index', { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(8000); // tunggu JS render chip
  await page.screenshot({ path: 's2-personal.png', fullPage: true });

  const chipCount = await page.$$eval('.chip', els => els.length).catch(()=>0);
  log('   Chip di halaman: ' + chipCount);

  // isi phone
  await fillById(page, '#phone', data.phone, 'phone');

  // isi city autocomplete
  await autocomplete(page, '#current_city', data.city);

  // gender
  await clickChip(page, data.gender);

  // languages
  for (const l of data.langs) await clickChip(page, l);

  // type
  await clickChip(page, data.type);
  await sleep(2000); // tunggu chip course render setelah pilih type

  // course
  await clickChip(page, data.course);
  await sleep(1000);

  // college autocomplete — input tanpa ID, pakai placeholder
  try {
    const collegeInput = await page.$('input[placeholder="Eg. BITS Pilani"]');
    if (collegeInput && await collegeInput.isVisible()) {
      await collegeInput.scrollIntoViewIfNeeded();
      await collegeInput.click();
      await collegeInput.fill('');
      await collegeInput.type(data.college, { delay: 80 });
      await sleep(2500);
      const opts = await page.$$('ul li, [class*="dropdown"] div, [class*="suggestion"]');
      let clicked = false;
      for (const opt of opts) {
        try {
          if (!(await opt.isVisible())) continue;
          const t = (await opt.innerText()).trim();
          if (t.toLowerCase().includes(data.college.toLowerCase().slice(0,5))) {
            await opt.click({ timeout: 1500 });
            log('  [college] ' + data.college);
            clicked = true;
            break;
          }
        } catch(e){}
      }
      if (!clicked) {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        log('  [college-enter] ' + data.college);
      }
    }
  } catch(e) { log('  [!] college gagal: ' + e.message); }

  // stream
  await fillById(page, '#personal-details-stream', data.stream, 'stream');

  await page.screenshot({ path: 's3-personal-filled.png', fullPage: true });

  // klik Next
  await clickNext(page);
  await sleep(6000);
  await page.screenshot({ path: 's4-after-next.png', fullPage: true });

  // ============ CEK HALAMAN SETELAHNYA ============
  log('\n[*] URL setelah Next: ' + page.url());

  // ============ FREE GEMINI ============
  log('\n[*] Cari Free Gemini Access');
  await page.goto(BASE + '/student/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  await page.screenshot({ path: 's5-dashboard-final.png', fullPage: true });

  let gemUrl = null;
  try {
    const gemLink = await page.$('a:has-text("Free Gemini Access")');
    if (gemLink) {
      const href = await gemLink.evaluate(e => e.href);
      log('  [gem] ' + href);
      gemUrl = href;
      await gemLink.click();
      await sleep(6000);
      await page.screenshot({ path: 's6-gemini.png', fullPage: true });
    } else {
      log('  [!] Free Gemini Access nggak ketemu');
      // scan semua link
      const allLinks = await page.$$eval('a', els =>
        els.map(e => ({ text: (e.innerText||'').trim(), href: e.href }))
          .filter(l => /gemini|is.?pro|limitless|claim/i.test(l.text + ' ' + l.href))
      );
      allLinks.forEach(l => log('  - ' + l.text + ' -> ' + l.href));
    }
  } catch(e){ log('  [!] ' + e.message); }

  log('\n=== SELESAI ===');
  if (gemUrl) log('Gemini: ' + gemUrl);
  log('Screenshot: s1 - s6');

  await ask('\nEnter untuk tutup...');
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('[!] ' + e.message);
  process.exit(1);
});
