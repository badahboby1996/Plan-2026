/* ══════════════════════════════════════════════════════════════
   ХЪСЪЛ · приложението
   ══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const D = window.HUSTLE_DATA;
const {
  dayKeys, dayNames, shortDays, meals, shirinMeals, workoutData, exerciseDetails,
  exerciseArt, exercisePhotos, progression, shopping, weeklyQuotes, profiles
} = D;

const MONTHS = ['януари','февруари','март','април','май','юни','юли','август','септември','октомври','ноември','декември'];
const MONTHS_SHORT = ['ЯНУ','ФЕВ','МАР','АПР','МАЙ','ЮНИ','ЮЛИ','АВГ','СЕП','ОКТ','НОЕ','ДЕК'];
const WATER_GOAL = { boby: 10, shirin: 8 };

/* ── Кратки помощници ────────────────────────────────────── */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayKeyOf = d => dayKeys[d.getDay()];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function haptic(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) {} }
}

/* ── Съхранение ──────────────────────────────────────────── */
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('hx.' + key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('hx.' + key, JSON.stringify(value)); } catch (e) {}
  },
  del(key) { try { localStorage.removeItem('hx.' + key); } catch (e) {} }
};

/* ── Състояние ───────────────────────────────────────────── */
const today = new Date(); today.setHours(12, 0, 0, 0);
const app = {
  view: 'today',
  profile: store.get('profile', 'boby'),
  foodDate: new Date(today),
  workoutDate: new Date(today),
  shop: 'market1',
  forTwo: store.get('forTwo', true),
  recipeQuery: '',
  recipeCat: 'Всички',
  theme: store.get('theme', 'dark')
};

const eatenKey  = (p, d) => `eaten.${p}.${iso(d)}`;
const waterKey  = (p, d) => `water.${p}.${iso(d)}`;
const setsKey   = d => `sets.${iso(d)}`;
const doneKey   = d => `wdone.${iso(d)}`;

const getEaten = (p, d) => store.get(eatenKey(p, d), []);
const setEaten = (p, d, arr) => store.set(eatenKey(p, d), arr);
const getWater = (p, d) => store.get(waterKey(p, d), 0);
const getSets  = d => store.get(setsKey(d), {});

/* ── Тема и акцент ───────────────────────────────────────── */
function applyTheme() {
  document.documentElement.dataset.theme = app.theme;
  const bar = app.theme === 'light' ? '#f2f1ea' : '#05070a';
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bar));
}
const ACCENT_BY_VIEW = { today: null, food: null, workout: 'violet', shop: 'amber', recipes: null, stats: null };
function applyAccent() {
  const a = ACCENT_BY_VIEW[app.view] || (app.profile === 'shirin' ? 'coral' : 'lime');
  document.documentElement.dataset.accent = a;
}

/* ── Тост ────────────────────────────────────────────────── */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── Конфети ─────────────────────────────────────────────── */
function celebrate() {
  const c = $('#confetti'), ctx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
  ctx.scale(dpr, dpr);
  const colors = ['#c8f45b', '#8fe04a', '#57dcff', '#ff9d76', '#ffc45a', '#9b8cff'];
  const bits = Array.from({ length: 110 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 160,
    y: innerHeight * .55,
    vx: (Math.random() - .5) * 11,
    vy: -Math.random() * 15 - 6,
    r: Math.random() * 5 + 2.5,
    a: Math.random() * Math.PI,
    va: (Math.random() - .5) * .3,
    c: colors[(Math.random() * colors.length) | 0]
  }));
  let frame = 0;
  (function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    bits.forEach(b => {
      b.vy += .42; b.x += b.vx; b.y += b.vy; b.a += b.va; b.vx *= .995;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.globalAlpha = clamp(1 - frame / 110, 0, 1);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.r, -b.r * .5, b.r * 2, b.r);
      ctx.restore();
    });
    if (++frame < 115) requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
  haptic([14, 50, 14, 50, 22]);
}

/* ── Изчисления по деня ──────────────────────────────────── */
function proteinOf(profileId, dayKey, index) {
  const day = profiles[profileId].meals[dayKey];
  const meal = day.items[index];
  const m = /П\s*(\d+)/.exec(meal.macros);
  const kcal = D.mealKcal(profileId, dayKey, index);
  if (!m) return Math.round(day.protein * kcal / day.kcal);
  const raw = +m[1];
  if (profileId === 'shirin' && meal.shared && meal.kcal) return Math.round(raw * kcal / meal.kcal);
  return raw;
}

function daySummary(profileId, date) {
  const key = dayKeyOf(date);
  const day = profiles[profileId].meals[key];
  const eaten = getEaten(profileId, date);
  let kcal = 0, protein = 0;
  day.items.forEach((_, i) => {
    if (eaten.includes(i)) { kcal += D.mealKcal(profileId, key, i); protein += proteinOf(profileId, key, i); }
  });
  return {
    key, day, eaten, kcal, protein,
    targetKcal: day.kcal, targetProtein: day.protein,
    count: eaten.length, total: day.items.length,
    water: getWater(profileId, date), waterGoal: WATER_GOAL[profileId]
  };
}

/* Серия последователни дни с поне 3 отметнати хранения */
function streak() {
  // Днешният ден не прекъсва серията, докато още тече.
  const start = getEaten(app.profile, today).length >= 3 ? 0 : 1;
  let n = 0;
  for (let i = start; i < 400; i++) {
    if (getEaten(app.profile, addDays(today, -i)).length >= 3) n++;
    else break;
  }
  return n;
}

/* ── SVG пръстен ─────────────────────────────────────────── */
function ringSVG(pct, size, stroke) {
  const s = size || 132, w = stroke || 11, r = (s - w) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - clamp(pct, 0, 1));
  return `<svg viewBox="0 0 ${s} ${s}" aria-hidden="true">
    <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent-2)"/>
    </linearGradient></defs>
    <circle class="track" cx="${s/2}" cy="${s/2}" r="${r}"/>
    <circle class="bar" cx="${s/2}" cy="${s/2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}"/>
  </svg>`;
}
function animateRings(root) {
  requestAnimationFrame(() => $$('.ring .bar', root).forEach(b => { b.style.strokeDashoffset = b.dataset.off; }));
  requestAnimationFrame(() => $$('.macro-bar i, .bar > i', root).forEach(b => { b.style.width = b.dataset.w; }));
}

// „самостоятелно 25–45 мин · или 4–6 мин претопляне“ → „25–45 мин“
function shortCook(text) {
  const first = String(text).split(' · ')[0].replace(/^самостоятелно\s+/i, '');
  return first.length > 18 ? first.slice(0, 17).trim() + '…' : first;
}

function shotStyle(id) {
  const [src, pos] = exercisePhotos[id] || exercisePhotos.goblet;
  return `background-image:url('${src}');background-position:${pos}`;
}

/* ══════════════════════════════════════════════════════════
   ИЗГЛЕД · ДНЕС
   ══════════════════════════════════════════════════════════ */
function nextMeal(summary) {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const items = summary.day.items.map((m, i) => {
    const [h, mi] = m.time.split(':').map(Number);
    return { m, i, at: h * 60 + mi };
  });
  const pending = items.filter(x => !summary.eaten.includes(x.i));
  if (!pending.length) return null;
  const upcoming = pending.find(x => x.at >= mins - 45);
  return upcoming || pending[pending.length - 1];
}

function renderToday() {
  const p = profiles[app.profile];
  const s = daySummary(app.profile, today);
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 11 ? 'Добро утро' : hour < 18 ? 'Добър ден' : 'Добър вечер';
  const wkKey = dayKeyOf(today);
  const workout = workoutData[wkKey];
  const week = D.programWeek();
  const plan = progression[week - 1];
  const quote = weeklyQuotes[(Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 604800000)) % weeklyQuotes.length];
  const next = nextMeal(s);
  const st = streak();
  const workoutDone = store.get(doneKey(today), false);

  $('#todayView').innerHTML = `
  <header class="topbar">
    <button class="avatar" data-act="switch-profile" aria-label="Смени профил">${p.initial}</button>
    <div class="grow">
      <div class="eyebrow">${dayNames[wkKey].toUpperCase()}</div>
      <div style="font-size:14px;font-weight:700;letter-spacing:-.02em;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${today.getDate()} ${MONTHS[today.getMonth()]} · ${p.name}</div>
    </div>
    <button class="icon-btn" data-act="stats" aria-label="Статистика">
      <svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V4M16 19v-7M22 19H2"/></svg>
    </button>
    <button class="icon-btn" data-act="settings" aria-label="Настройки">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1"/></svg>
    </button>
  </header>

  <div class="stagger">
    <div class="hero" style="margin-bottom:20px">
      <h1>${greet},<br><span>${p.name}</span>.</h1>
      <p class="dim" style="font-size:13.5px;margin-top:8px">${esc(p.role)}</p>
    </div>

    ${next ? `
    <button class="card press" data-act="open-meal" data-i="${next.i}" style="width:100%;text-align:left;padding:16px;display:flex;gap:14px;align-items:center;margin-bottom:12px">
      <div class="medallion" style="--m:${next.m.color};width:56px;height:56px;flex:none;border-radius:19px;display:grid;place-items:center;font-size:27px;background:color-mix(in srgb,var(--m) 20%,transparent);border:1px solid color-mix(in srgb,var(--m) 34%,transparent)">${next.m.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="eyebrow" style="color:var(--accent)">СЛЕДВА · ${next.m.time} · ${esc(next.m.type).toUpperCase()}</div>
        <h3 style="font-size:16px;font-weight:750;letter-spacing:-.02em;margin:4px 0 5px;line-height:1.25">${esc(next.m.name)}</h3>
        <div class="dim" style="font-size:12px;font-weight:650">${D.mealKcal(app.profile, s.key, next.i)} ккал · ${proteinOf(app.profile, s.key, next.i)} г протеин</div>
      </div>
      <span class="dim" style="font-size:20px">›</span>
    </button>` : `
    <div class="card" style="padding:20px;text-align:center;margin-bottom:12px">
      <div style="font-size:34px">🎉</div>
      <b style="display:block;font-size:16px;margin-top:8px;letter-spacing:-.02em">Всички хранения са отметнати</b>
      <p class="dim" style="font-size:13px;margin-top:5px">Денят е изкаран по план.</p>
    </div>`}

    <div class="card ring-card" style="margin-bottom:12px">
      <div class="ring">
        ${ringSVG(s.kcal / s.targetKcal)}
        <div class="center"><b class="num" data-count="${s.kcal}">0</b><small>ОТ ${s.targetKcal}</small></div>
      </div>
      <div class="macro-list">
        <div class="macro">
          <div class="macro-top"><b>Протеин</b><span class="num">${s.protein} / ${s.targetProtein} г</span></div>
          <div class="macro-bar" style="--c1:var(--accent);--c2:var(--accent-2)"><i data-w="${clamp(s.protein / s.targetProtein, 0, 1) * 100}%"></i></div>
        </div>
        <div class="macro">
          <div class="macro-top"><b>Хранения</b><span class="num">${s.count} / ${s.total}</span></div>
          <div class="macro-bar" style="--c1:var(--cyan);--c2:var(--violet)"><i data-w="${s.count / s.total * 100}%"></i></div>
        </div>
        <div class="macro">
          <div class="macro-top"><b>Вода</b><span class="num">${(s.water * .25).toFixed(2).replace(/\.?0+$/, '')} / ${(s.waterGoal * .25).toFixed(1)} л</span></div>
          <div class="macro-bar" style="--c1:#57dcff;--c2:#2f8fd8"><i data-w="${clamp(s.water / s.waterGoal, 0, 1) * 100}%"></i></div>
        </div>
      </div>
    </div>

    <div class="card water" style="margin-bottom:12px">
      <div class="water-head"><b>Вода днес</b><span>${s.water} × 250 мл</span></div>
      <div class="glasses">
        ${Array.from({ length: s.waterGoal }, (_, i) =>
          `<button data-act="water" data-n="${i + 1}" class="${i < s.water ? 'full' : ''}" aria-label="Чаша ${i + 1}"><span>${i < s.water ? '' : '＋'}</span></button>`).join('')}
      </div>
    </div>

    ${p.hasWorkout ? (workout ? `
    <button class="wk-hero press" data-act="goto" data-view="workout" style="width:100%;text-align:left;margin-bottom:12px">
      <div class="shot" style="${shotStyle(workout.exercises[0].id)}"></div>
      <div class="scrim"></div>
      <div class="inner">
        <div class="eyebrow" style="color:var(--lime)">ДНЕШНА ТРЕНИРОВКА · СЕДМИЦА ${week}/8</div>
        <h2>${esc(workout.title)}</h2>
        <p>${esc(workout.focus)}</p>
        <div class="tags">
          <span>${workout.exercises.length} упражнения</span><span>45 мин</span>
          <span>${workoutDone ? '✓ Завършена' : esc(plan[0])}</span>
        </div>
      </div>
    </button>` : `
    <div class="card note" style="margin-bottom:12px">
      <div class="eyebrow">ТРЕНИРОВКА · ${dayNames[wkKey].toUpperCase()}</div>
      <p><b style="color:var(--paper)">Почивен ден.</b> Разходка, вода, храна по план и сън. Възстановяването е част от програмата.</p>
    </div>`) : ''}

    <div class="card note" style="margin-bottom:12px">
      <div class="eyebrow">ПОДГОТОВКА · ${dayNames[wkKey].toUpperCase()}</div>
      <p>${esc(p.prep[wkKey])}</p>
    </div>

    <div class="stat-grid" style="margin-bottom:12px">
      <div class="card stat"><b class="num">${st}</b><small>дни серия</small><div class="trend">поне 3 хранения на ден</div></div>
      <div class="card stat"><b class="num">${week}<span style="font-size:16px;opacity:.4">/8</span></b><small>седмица</small><div class="trend">${esc(plan[0])}</div></div>
    </div>

    ${installHint()}

    <div class="card" style="padding:20px 18px">
      <div class="eyebrow" style="color:var(--accent);margin-bottom:10px">МИСЪЛ ЗА СЕДМИЦАТА</div>
      <p style="font-size:16px;line-height:1.5;letter-spacing:-.015em;font-weight:500">„${esc(quote[0])}“</p>
      <p class="dim" style="font-size:12px;font-weight:700;margin-top:10px;letter-spacing:.04em">— ${esc(quote[1])}</p>
    </div>
  </div>`;

  animateRings($('#todayView'));
  countUp($('#todayView'));
}

// Показва се само в браузър — не и когато приложението вече е на началния екран.
function installHint() {
  const standalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  if (standalone || store.get('hideInstall', false)) return '';
  return `<div class="card note" style="margin-bottom:12px;position:relative">
    <div class="eyebrow" style="color:var(--accent)">НАПРАВИ ГО ПРИЛОЖЕНИЕ</div>
    <p>Натисни <b style="color:var(--paper)">Сподели</b> в Safari и после <b style="color:var(--paper)">„Към началния екран“</b>. Отваря се на цял екран, тръгва мигновено и работи без интернет.</p>
    <button class="btn ghost" style="margin-top:4px;justify-self:start;padding:9px 16px;font-size:12.5px" data-act="hide-install">Разбрах</button>
  </div>`;
}

function countUp(root) {
  $$('[data-count]', root).forEach(el => {
    const target = +el.dataset.count;
    if (!target) { el.textContent = '0'; return; }
    const dur = 900, t0 = performance.now();
    (function step(t) {
      const k = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  });
}

/* ══════════════════════════════════════════════════════════
   ИЗГЛЕД · ХРАНА
   ══════════════════════════════════════════════════════════ */
function weekStrip(date, action) {
  const sunday = addDays(date, -date.getDay());
  return `<div class="week-strip">${dayKeys.map((k, i) => {
    const d = addDays(sunday, i);
    const on = iso(d) === iso(date), isToday = iso(d) === iso(today);
    return `<button class="daychip ${on ? 'active' : ''} ${isToday ? 'today' : ''}" data-act="${action}" data-date="${iso(d)}">
      <span>${shortDays[k]}</span><b class="num">${d.getDate()}</b></button>`;
  }).join('')}</div>`;
}

function renderFood() {
  const p = profiles[app.profile];
  const date = app.foodDate;
  const s = daySummary(app.profile, date);
  const isToday = iso(date) === iso(today);

  $('#foodView').innerHTML = `
  <header class="topbar">
    <div class="grow">
      <div class="eyebrow">ХРАНЕНЕ</div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-.035em;margin-top:2px">${dayNames[s.key]}</h2>
    </div>
    <button class="icon-btn" data-act="recipes" aria-label="Рецепти">
      <svg viewBox="0 0 24 24"><path d="M4 4.5h9a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4Z"/><path d="M20 4.5h-2a3 3 0 0 0-2 .8V20a2.5 2.5 0 0 1 2.5-2.5H20Z"/></svg>
    </button>
    <button class="icon-btn" data-act="today-jump" aria-label="Днес">
      <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>
    </button>
  </header>

  <div class="stagger">
    <div class="segment" style="margin-bottom:14px" id="profileSeg">
      <span class="thumb"></span>
      ${Object.values(profiles).map(x =>
        `<button class="${x.id === app.profile ? 'active' : ''}" data-act="profile" data-id="${x.id}">${x.name}</button>`).join('')}
    </div>

    ${weekStrip(date, 'food-date')}

    <div class="card ring-card mt" style="margin-bottom:12px">
      <div class="ring sm">
        ${ringSVG(s.kcal / s.targetKcal, 106, 9)}
        <div class="center"><b class="num">${s.kcal}</b><small>ОТ ${s.targetKcal}</small></div>
      </div>
      <div class="macro-list">
        <div class="macro">
          <div class="macro-top"><b>Протеин</b><span class="num">${s.protein} / ${s.targetProtein} г</span></div>
          <div class="macro-bar" style="--c1:var(--accent);--c2:var(--accent-2)"><i data-w="${clamp(s.protein / s.targetProtein, 0, 1) * 100}%"></i></div>
        </div>
        <div class="macro">
          <div class="macro-top"><b>Хранения</b><span class="num">${s.count} / ${s.total}</span></div>
          <div class="macro-bar" style="--c1:var(--cyan);--c2:var(--violet)"><i data-w="${s.count / s.total * 100}%"></i></div>
        </div>
        <div style="font-size:11.5px;color:var(--paper-faint);font-weight:650;line-height:1.4">
          ${isToday ? 'Отметни всяко хранене, за да следиш деня.' : 'Преглеждаш друг ден от седмицата.'}
        </div>
      </div>
    </div>

    <div class="card note" style="margin-bottom:8px">
      <div class="eyebrow">ПОДГОТОВКА · ${dayNames[s.key].toUpperCase()}</div>
      <p>${esc(p.prep[s.key])}</p>
    </div>

    <div class="section-head"><div><h2>Храненията за деня</h2><p>Докосни за пълната рецепта · кръгчето отмята</p></div></div>

    <div id="mealList">${s.day.items.map((m, i) => mealCard(m, i, s)).join('')}</div>

    <button class="btn ghost wide mt" data-act="recipes">Виж всички рецепти</button>
  </div>`;

  animateRings($('#foodView'));
  positionThumb();
}

function mealCard(m, i, s) {
  const on = s.eaten.includes(i);
  const kcal = D.mealKcal(app.profile, s.key, i);
  return `<div class="card meal press ${on ? 'eaten' : ''}" style="--m:${m.color}" role="button" tabindex="0" data-act="open-meal" data-i="${i}">
    <div class="medallion">${m.icon}</div>
    <div class="body">
      <div class="kicker"><em>${m.time}</em> · ${esc(m.type)}${m.fromPreviousDinner ? ' · от снощи' : ''}</div>
      <h3>${esc(m.name)}</h3>
      <div class="meta"><span class="num">${kcal} ккал</span><i>•</i><span class="num">${proteinOf(app.profile, s.key, i)} г П</span>${m.shared ? '<i>•</i><span>за двама</span>' : ''}</div>
    </div>
    <button class="tick ${on ? 'on' : ''}" data-act="eat" data-i="${i}" aria-label="Отметни">
      <svg viewBox="0 0 24 24"><path d="m5 12.5 4.6 4.5L19 7.5"/></svg>
    </button>
  </div>`;
}

function positionThumb() {
  const seg = $('#profileSeg');
  if (!seg) return;
  if (!seg.offsetWidth) { requestAnimationFrame(positionThumb); return; }
  const buttons = $$('button', seg), thumb = $('.thumb', seg);
  const active = buttons.find(b => b.classList.contains('active')) || buttons[0];
  if (!active || !thumb) return;
  thumb.style.width = active.offsetWidth + 'px';
  thumb.style.transform = `translateX(${active.offsetLeft - 4}px)`;
}

/* ══════════════════════════════════════════════════════════
   ИЗГЛЕД · ТРЕНИРОВКА
   ══════════════════════════════════════════════════════════ */
function renderWorkout() {
  const date = app.workoutDate;
  const key = dayKeyOf(date);
  const w = workoutData[key];
  const week = D.programWeek();
  const plan = progression[week - 1];
  const sets = getSets(date);
  const done = store.get(doneKey(date), false);

  const head = `
  <header class="topbar">
    <div class="grow">
      <div class="eyebrow">8-СЕДМИЧЕН ЦИКЪЛ · БОБИ</div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-.035em;margin-top:2px">Тренировка</h2>
    </div>
    <button class="icon-btn" data-act="today-jump-workout" aria-label="Днес">
      <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>
    </button>
  </header>
  <div class="stagger">
  ${weekStrip(date, 'workout-date')}
  <div class="card note mt" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
      <div class="eyebrow" style="color:var(--accent)">СЕДМИЦА ${week} ОТ 8</div>
      <div class="eyebrow">${esc(plan[0]).toUpperCase()}</div>
    </div>
    <p style="margin-top:2px">${esc(plan[1])}</p>
    <div class="progress-track">${progression.map((_, i) =>
      `<i class="${i + 1 < week ? 'done' : i + 1 === week ? 'now' : ''}"></i>`).join('')}</div>
  </div>`;

  if (!w) {
    $('#workoutView').innerHTML = head + `
      <div class="card rest-day">
        <div class="big">🌿</div>
        <b>Почивен ден</b>
        <p>Разходка, вода, храна по план и сън. Мускулът расте в почивката, не в залата.</p>
        <button class="btn ghost" data-act="goto" data-view="food">Виж храненето за деня</button>
      </div></div>`;
    return;
  }

  const totalSets = w.exercises.reduce((n, ex, i) => n + D.prescription(ex, i, week).sets, 0);
  const doneSets = w.exercises.reduce((n, ex, i) => n + (sets[ex.id] || []).filter(Boolean).length, 0);

  $('#workoutView').innerHTML = head + `
    <div class="wk-hero" style="margin-bottom:12px">
      <div class="shot" style="${shotStyle(w.exercises[0].id)}"></div>
      <div class="scrim"></div>
      <div class="inner">
        <div class="eyebrow" style="color:var(--lime)">${dayNames[key].toUpperCase()} · 45 МИН</div>
        <h2>${esc(w.title)}</h2>
        <p>${esc(w.focus)}</p>
        <div class="tags"><span>8 мин загрявка</span><span>${esc(w.finisher)}</span><span>${doneSets}/${totalSets} серии</span></div>
        <div class="bar" style="margin-top:12px;background:rgba(255,255,255,.16)"><i data-w="${totalSets ? doneSets / totalSets * 100 : 0}%"></i></div>
      </div>
    </div>

    <div class="card list-block" style="margin-bottom:12px">
      <h3>Загрявка · 8 мин</h3>
      <ol>${w.warmup.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    </div>

    <div class="section-head"><div><h2>Упражнения</h2><p>Целта е изчислена за седмица ${week}</p></div></div>

    ${w.exercises.map((ex, i) => {
      const rx = D.prescription(ex, i, week);
      const marks = sets[ex.id] || [];
      const d = exerciseDetails[ex.id];
      return `<div class="card exercise press" role="button" tabindex="0" data-act="open-exercise" data-i="${i}">
        <div class="shot" style="${shotStyle(ex.id)}"></div>
        <div class="body">
          <h3>${esc(ex.name)}</h3>
          <span class="rx">${rx.sets} × ${esc(rx.reps)}</span>
          <small>${esc(d.muscle)} · почивка ${ex.rest} сек</small>
          <div class="dots">${Array.from({ length: rx.sets }, (_, k) => `<i class="${marks[k] ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <span class="dim" style="font-size:20px">›</span>
      </div>`;
    }).join('')}

    <div class="card list-block mt" style="margin-bottom:12px">
      <h3>Финал и охлаждане</h3>
      <ol>
        <li>${esc(w.finisher)}</li>
        <li>Разтягане на натоварените групи · по 30 сек</li>
        <li>Cat-camel за гърба · 8 бавни повторения</li>
        <li>5 цикъла дълбоко дишане</li>
      </ol>
    </div>

    <button class="btn wide ${done ? 'ghost' : ''}" data-act="finish-workout">
      ${done ? '✓ Тренировката е отбелязана' : 'Завърши тренировката'}
    </button>
    </div>`;

  animateRings($('#workoutView'));
}

/* ══════════════════════════════════════════════════════════
   ИЗГЛЕД · ПАЗАР
   ══════════════════════════════════════════════════════════ */
const SHOP_LABELS = { market1: 'Пазар 1', market2: 'Пазар 2', monthly: 'Месечен' };

function shopChecked(id) {
  if (window.hustleShoppingReady) return window.hustleShoppingState?.[id] === true;
  return store.get('shop.' + id, false) === true;
}
function setShopChecked(id, value) {
  store.set('shop.' + id, value);
  if (window.hustleShoppingSync) window.hustleShoppingSync.setItem(id, value).catch(() => {});
}

function renderShop() {
  const data = shopping[app.shop];
  const synced = !!window.hustleShoppingReady;
  let total = 0, done = 0;

  const groups = Object.entries(data.groups).map(([name, items]) => {
    total += items.length;
    return `<section class="shop-group">
      <h3>${esc(name)}<span>${items.length} ${items.length === 1 ? 'ПРОДУКТ' : 'ПРОДУКТА'}</span></h3>
      ${items.map(([n, q], i) => {
        const id = `${app.shop}-${name}-${i}`;
        const on = shopChecked(id);
        if (on) done++;
        return `<div class="card shop-item press ${on ? 'on' : ''}" role="button" tabindex="0" data-act="shop-item" data-id="${esc(id)}">
          <span class="tick ${on ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.6 4.5L19 7.5"/></svg></span>
          <span class="name">${esc(n)}</span>
          <span class="qty">${esc(q)}</span>
        </div>`;
      }).join('')}
    </section>`;
  }).join('');

  $('#shopView').innerHTML = `
  <header class="topbar">
    <div class="grow">
      <div class="eyebrow">СПИСЪК ЗА ПАЗАРУВАНЕ</div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-.035em;margin-top:2px">Пазар</h2>
    </div>
    <button class="icon-btn" data-act="shop-reset" aria-label="Изчисти">
      <svg viewBox="0 0 24 24"><path d="M3.5 6.5h17M9 6.5V4.2h6v2.3M6.5 6.5 7.7 20a1.6 1.6 0 0 0 1.6 1.4h5.4a1.6 1.6 0 0 0 1.6-1.4l1.2-13.5"/></svg>
    </button>
  </header>

  <div class="stagger">
    <div class="segment" style="margin-bottom:14px" id="shopSeg">
      <span class="thumb"></span>
      ${Object.keys(shopping).map(k =>
        `<button class="${k === app.shop ? 'active' : ''}" data-act="shop-tab" data-id="${k}">${SHOP_LABELS[k]}</button>`).join('')}
    </div>

    <div class="card shop-progress" style="margin-bottom:10px">
      <div class="row"><b class="num">${done}<span style="font-size:16px;font-weight:650;opacity:.4"> / ${total}</span></b><span>${total ? Math.round(done / total * 100) : 0}% готово</span></div>
      <div class="bar"><i data-w="${total ? done / total * 100 : 0}%"></i></div>
      <div class="sync-line ${synced ? 'live' : ''}"><i></i>${synced ? 'Синхронизирано с телефона на Ширин' : 'Локален режим · само на този телефон'}</div>
    </div>

    <div class="card note" style="margin-bottom:16px">
      <div class="eyebrow">${esc(data.label)}</div>
      <p>${esc(data.note)}</p>
    </div>

    ${groups}
  </div>`;

  animateRings($('#shopView'));
  positionShopThumb();
}
function positionShopThumb() {
  const seg = $('#shopSeg');
  if (!seg) return;
  if (!seg.offsetWidth) { requestAnimationFrame(positionShopThumb); return; }
  const buttons = $$('button', seg), thumb = $('.thumb', seg);
  const active = buttons.find(b => b.classList.contains('active')) || buttons[0];
  thumb.style.width = active.offsetWidth + 'px';
  thumb.style.transform = `translateX(${active.offsetLeft - 4}px)`;
}

/* ══════════════════════════════════════════════════════════
   ИЗГЛЕД · РЕЦЕПТИ
   ══════════════════════════════════════════════════════════ */
let RECIPES = null;
function renderRecipes() {
  if (!RECIPES) RECIPES = D.buildRecipeLibrary();
  const cats = ['Всички', 'Закуска', 'Обяд', 'Следобедна', 'Вечеря'];
  const q = app.recipeQuery.trim().toLowerCase();
  const list = RECIPES.filter(r =>
    (app.recipeCat === 'Всички' || r.category === app.recipeCat) &&
    (!q || r.search.includes(q)));

  $('#recipesView').innerHTML = `
  <header class="topbar">
    <button class="icon-btn" data-act="back" aria-label="Назад">
      <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>
    </button>
    <div class="grow">
      <div class="eyebrow">${RECIPES.length} РЕЦЕПТИ · ${list.length === RECIPES.length ? 'ВСИЧКИ' : 'ПОКАЗАНИ ' + list.length}</div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-.035em;margin-top:2px">Рецепти</h2>
    </div>
  </header>

  <div class="search" style="margin-bottom:12px">
    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
    <input id="recipeSearch" type="search" placeholder="Търси ястие или продукт…" value="${esc(app.recipeQuery)}" autocomplete="off">
  </div>

  <div class="chips" style="margin-bottom:14px">
    ${cats.map(c => `<button class="chip ${c === app.recipeCat ? 'active' : ''}" data-act="recipe-cat" data-id="${c}">${c}</button>`).join('')}
  </div>

  ${list.length ? `<div class="recipe-grid">${list.map((r, i) =>
    `<button class="card recipe press" style="--m:${r.color}" data-act="open-recipe" data-i="${RECIPES.indexOf(r)}">
      <span class="medallion">${r.icon}</span>
      <h3>${esc(r.name)}</h3>
      <span class="meta">${r.kcal} ккал · ${esc(shortCook(r.cook))}</span>
      <span class="meta" style="color:var(--accent)">${r.owners.join(' · ')}</span>
    </button>`).join('')}</div>`
  : '<div class="empty">Няма съвпадение. Опитай друга дума.</div>'}`;

  const input = $('#recipeSearch');
  if (input) {
    input.addEventListener('input', e => {
      app.recipeQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderRecipes();
      const next = $('#recipeSearch');
      next.focus(); next.setSelectionRange(pos, pos);
    });
  }
}

/* ══════════════════════════════════════════════════════════
   ИЗГЛЕД · СТАТИСТИКА
   ══════════════════════════════════════════════════════════ */
function renderStats() {
  const p = profiles[app.profile];
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const rows = days.map(d => {
    const s = daySummary(app.profile, d);
    return { d, kcal: s.kcal, target: s.targetKcal, water: s.water, key: dayKeyOf(d) };
  });
  const max = Math.max(...rows.map(r => r.target), 1);
  const avg = Math.round(rows.reduce((n, r) => n + r.kcal, 0) / 7);
  const hit = rows.filter(r => r.kcal >= r.target * .8).length;
  const workouts = days.filter(d => store.get(doneKey(d), false)).length;
  const totalWater = rows.reduce((n, r) => n + r.water, 0);
  const weights = store.get('weight.' + app.profile, []);
  const last = weights[weights.length - 1], first = weights[0];

  $('#statsView').innerHTML = `
  <header class="topbar">
    <button class="icon-btn" data-act="back" aria-label="Назад">
      <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>
    </button>
    <div class="grow">
      <div class="eyebrow">ПОСЛЕДНИТЕ 7 ДНИ · ${p.name.toUpperCase()}</div>
      <h2 style="font-size:24px;font-weight:800;letter-spacing:-.035em;margin-top:2px">Статистика</h2>
    </div>
  </header>

  <div class="stagger">
    <div class="stat-grid" style="margin-bottom:10px">
      <div class="card stat"><b class="num">${streak()}</b><small>дни серия</small><div class="trend">без прекъсване</div></div>
      <div class="card stat"><b class="num">${hit}<span style="font-size:15px;opacity:.4">/7</span></b><small>дни по план</small><div class="trend">поне 80% от целта</div></div>
      <div class="card stat"><b class="num">${workouts}</b><small>тренировки</small><div class="trend">за седмицата</div></div>
      <div class="card stat"><b class="num">${(totalWater * .25).toFixed(1)}<span style="font-size:15px;opacity:.4"> л</span></b><small>вода</small><div class="trend">общо за 7 дни</div></div>
    </div>

    <div class="card chart" style="margin-bottom:10px">
      <div class="section-head" style="margin:0"><div><h2 style="font-size:16px">Приети калории</h2><p>${avg ? 'Средно ' + avg + ' ккал на ден' : 'Още няма отметнати хранения'}</p></div></div>
      ${!avg ? '<p class="empty" style="padding:22px 0 6px">Отметвай храненията в раздел „Храна“ и графиката се запълва сама.</p>' : `<div class="bars">
        ${rows.map((r, i) => `<div class="col ${i === 6 ? 'now' : ''}">
          <em>${r.kcal ? r.kcal : ''}</em>
          <div class="track"><i class="${r.kcal ? '' : 'muted'}" style="height:${clamp(r.kcal / max, .02, 1) * 100}%;animation-delay:${i * .05}s"></i></div>
          <span>${shortDays[r.key]}</span>
        </div>`).join('')}
      </div>`}
    </div>

    <div class="card chart" style="margin-bottom:10px">
      <div class="section-head" style="margin:0"><div><h2 style="font-size:16px">Вода</h2><p>Цел ${(WATER_GOAL[app.profile] * .25).toFixed(1)} л на ден</p></div></div>
      ${!totalWater ? '<p class="empty" style="padding:22px 0 6px">Всяка чаша, която отметнеш в „Днес“, се появява тук.</p>' : `<div class="bars" style="height:112px">
        ${rows.map((r, i) => `<div class="col ${i === 6 ? 'now' : ''}">
          <em>${r.water ? (r.water * .25).toFixed(2).replace(/\.?0+$/, '') + ' л' : ''}</em>
          <div class="track"><i class="${r.water ? '' : 'muted'}" style="height:${clamp(r.water / WATER_GOAL[app.profile], .02, 1) * 100}%;animation-delay:${i * .05}s;background:linear-gradient(180deg,#57dcff,rgba(87,220,255,.18))"></i></div>
          <span>${shortDays[r.key]}</span>
        </div>`).join('')}
      </div>`}
    </div>

    <div class="card" style="padding:18px 16px">
      <div class="section-head" style="margin:0 0 12px"><div><h2 style="font-size:16px">Тегло</h2><p>${last ? `Последно ${last.kg} кг · ${new Date(last.date).getDate()} ${MONTHS_SHORT[new Date(last.date).getMonth()]}` : 'Още няма записи'}</p></div>
      ${first && last && first !== last ? `<button style="pointer-events:none">${(last.kg - first.kg > 0 ? '+' : '')}${(last.kg - first.kg).toFixed(1)} кг</button>` : ''}</div>
      ${weights.length > 1 ? weightChart(weights) : ''}
      <button class="btn wide ${weights.length ? 'ghost' : ''}" data-act="log-weight">Запиши тегло</button>
    </div>
  </div>`;
}

function weightChart(weights) {
  const pts = weights.slice(-14);
  const vals = pts.map(p => p.kg);
  const min = Math.min(...vals) - .5, max = Math.max(...vals) + .5;
  const w = 300, h = 84;
  const path = pts.map((p, i) => {
    const x = pts.length === 1 ? w / 2 : i / (pts.length - 1) * w;
    const y = h - (p.kg - min) / (max - min || 1) * h;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:84px;margin-bottom:14px;overflow:visible">
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      style="filter:drop-shadow(0 0 6px color-mix(in srgb,var(--accent) 50%,transparent))"/>
    ${pts.map((p, i) => {
      const x = pts.length === 1 ? w / 2 : i / (pts.length - 1) * w;
      const y = h - (p.kg - min) / (max - min || 1) * h;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--accent)"/>`;
    }).join('')}
  </svg>`;
}

/* ══════════════════════════════════════════════════════════
   ЛИСТ (SHEET)
   ══════════════════════════════════════════════════════════ */
let sheetOpen = false;
function openSheet(html, keepScroll) {
  const body = $('#sheetBody');
  const keep = keepScroll ? body.scrollTop : 0;
  body.innerHTML = html;
  $('#sheet').classList.add('open');
  $('#scrim').classList.add('open');
  body.scrollTop = keep;
  sheetOpen = true;
  animateRings(body);
}
function closeSheet() {
  stopTimer();
  $('#sheet').classList.remove('open');
  $('#scrim').classList.remove('open');
  $('#sheet').style.transform = '';
  sheetOpen = false;
}

/* ── Рецепта ─────────────────────────────────────────────── */

/* Заглавие и пояснение за количествата.
   При общо готвене грамажите са дял от цялото, а не порция за едно хранене —
   затова се обозначават различно, за да няма двойно мерене. */
function portionHeading(meal, forTwo, person) {
  if (forTwo) return 'Общо количество за готвенето';
  if (meal.shared && meal.partnerIngredients) return `Количествата за ${esc(person)}`;
  return `Точна порция за ${esc(person)}`;
}

function portionNote(meal, forTwo, person) {
  const batch = meal.batchLabel ? ' ' + esc(meal.batchLabel) + '.' : '';
  if (forTwo) return `Приготви точно показаното количество — включени са всички описани порции.${batch}`;
  if (meal.shared && meal.partnerIngredients)
    return `Показано е само това, което влиза в порцията на ${esc(person)}.${batch || ' Останалото е за другия човек.'}`;
  return 'Това е количеството за самото хранене, дори когато е приготвено предната вечер.';
}

let sheetMealIndex = null, sheetMealKey = null;
function mealSheet(meal, profileId, dayKey, index, keepScroll) {
  sheetMealIndex = index;
  sheetMealKey = dayKey;
  const person = profiles[profileId].name;
  const forTwo = app.forTwo && meal.shared && meal.partnerIngredients;
  const ingredients = forTwo ? D.combinedIngredients(meal) : D.mealIngredients(profileId, meal);
  const steps = D.recipeSteps(meal, forTwo);
  const kcal = index != null ? D.mealKcal(profileId, dayKey, index) : meal.kcal;

  openSheet(`
    <div class="sheet-head">
      <div class="grow">
        <span class="pill">${esc(meal.type)}${meal.shared ? ' · семейно готвене' : ''}</span>
        <h2>${esc(meal.name)}</h2>
      </div>
      <button class="close-btn" data-act="close">×</button>
    </div>
    <p class="sheet-sub">${esc(meal.macros)} · сурови/сухи грамажи, освен ако е уточнено друго</p>

    ${meal.fromPreviousDinner ? `
      <div class="callout mt"><b>Може и без вечерята от предния ден.</b> ${esc(meal.sourceLabel || '')}. По-долу са точните грамажи и цялото готвене само за тази порция, плюс съхранението и претоплянето.</div>` : ''}

    <div class="facts">
      <div class="fact lead"><b class="num">${kcal}</b><small>ккал за ${esc(person)}</small></div>
      <div class="fact"><b>${esc(meal.cook)}</b><small>време</small></div>
      <div class="fact"><b>${esc(meal.device)}</b><small>уред</small></div>
    </div>

    ${meal.shared && meal.partnerIngredients ? `
      <div class="toggle-row" data-act="toggle-two">
        <div class="grow">
          <b>Готвя за двамата</b>
          <small>${forTwo ? esc(meal.batchLabel || 'Показани са общите количества') : 'Показана е само порцията на ' + esc(person)}</small>
        </div>
        <span class="switch ${forTwo ? 'on' : ''}"></span>
      </div>` : ''}

    <div class="block">
      <h3>${portionHeading(meal, forTwo, person)}</h3>
      <p class="sub">${portionNote(meal, forTwo, person)}</p>
      <div class="ing">${ingredients.map(x => `<div><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('')}</div>
    </div>

    <div class="block">
      <h3>${meal.fromPreviousDinner ? 'Готвене, съхранение и претопляне' : 'Готвене стъпка по стъпка'}</h3>
      <p class="sub">Редът е точен: подготовка → овкусяване → уред → разпределяне → съхранение.</p>
      <ol class="steps">${steps.map(s => `<li><span>${esc(s)}</span></li>`).join('')}</ol>
    </div>

    ${meal.tip ? `<div class="callout mt-lg">💡 ${esc(meal.tip)}</div>` : ''}

    ${index != null ? `
      <button class="btn wide mt-lg" data-act="eat-from-sheet" data-i="${index}">
        ${getEaten(profileId, app.foodDate).includes(index) ? '✓ Отметнато като изядено' : 'Отметни като изядено'}
      </button>` : ''}
  `, keepScroll);
}

/* ── Упражнение ──────────────────────────────────────────── */
function exerciseSheet(i) {
  const key = dayKeyOf(app.workoutDate);
  const w = workoutData[key];
  const ex = w.exercises[i];
  const d = exerciseDetails[ex.id];
  const week = D.programWeek();
  const rx = D.prescription(ex, i, week);
  const sets = getSets(app.workoutDate);
  const marks = sets[ex.id] || [];

  openSheet(`
    <div class="sheet-head">
      <div class="grow">
        <span class="pill">${esc(d.muscle)}</span>
        <h2>${esc(ex.name)}</h2>
      </div>
      <button class="close-btn" data-act="close">×</button>
    </div>
    <p class="sheet-sub"><b style="color:var(--paper)">Седмица ${week}:</b> ${rx.sets} серии × ${esc(rx.reps)} · почивка ${ex.rest} сек</p>

    <div class="ex-visual">
      <div class="shot" style="${shotStyle(ex.id)}"></div>
      <div class="art-bg"></div>
      <div class="art"><svg viewBox="0 0 240 170">${exerciseArt[ex.id] || ''}</svg></div>
    </div>

    <div class="block">
      <h3>Правилна техника</h3>
      <p class="sub">Три неща, които решават дали упражнението работи.</p>
      ${d.tips.map((t, n) => `<div class="form-tip"><i>${n + 1}</i><span>${esc(t)}</span></div>`).join('')}
    </div>

    <div class="callout warn">
      <b>Внимавай:</b> ${esc(d.avoid)}<br><br>Остра, сецваща болка в кръста означава спираш веднага.
    </div>

    <div class="block">
      <h3>Отбележи сериите</h3>
      <p class="sub">Докосни серия, когато я завършиш — таймерът тръгва сам.</p>
      <div class="set-row">
        ${Array.from({ length: rx.sets }, (_, s) =>
          `<button class="set-btn ${marks[s] ? 'on' : ''}" data-act="set" data-ex="${ex.id}" data-s="${s}" data-rest="${ex.rest}">
            <b>СЕРИЯ ${s + 1}</b><span>${esc(rx.reps)}</span>
          </button>`).join('')}
      </div>

      <div class="timer">
        <div class="dial">
          <svg viewBox="0 0 88 88">
            <circle class="t" cx="44" cy="44" r="38"/>
            <circle class="b" id="timerBar" cx="44" cy="44" r="38" stroke-dasharray="238.8" stroke-dashoffset="0"/>
          </svg>
          <b id="timerText">${fmtTime(ex.rest)}</b>
        </div>
        <div class="grow">
          <small>ПОЧИВКА МЕЖДУ СЕРИИТЕ</small>
          <p>Не бързай. Пълната почивка е част от натоварването.</p>
          <button class="btn" data-act="timer" data-rest="${ex.rest}" id="timerBtn">Старт</button>
        </div>
      </div>
    </div>
  `);
}

const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* ── Таймер за почивка ───────────────────────────────────── */
let timerId = null, audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.25, audioCtx.currentTime + .02);
    g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + .5);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + .5);
  } catch (e) {}
}
function stopTimer() { clearInterval(timerId); timerId = null; }
function startTimer(seconds) {
  stopTimer();
  const text = $('#timerText'), bar = $('#timerBar'), btn = $('#timerBtn');
  if (!text) return;
  const C = 238.8;
  let left = seconds;
  if (btn) btn.textContent = 'Тече…';
  const tick = () => {
    if (!document.body.contains(text)) return stopTimer();
    text.textContent = left > 0 ? fmtTime(left) : 'ГОТОВО';
    if (bar) bar.style.strokeDashoffset = C * (1 - left / seconds);
    if (left <= 0) {
      stopTimer();
      if (btn) btn.textContent = 'Пак';
      haptic([120, 70, 120]);
      beep();
      return;
    }
    left--;
  };
  tick();
  timerId = setInterval(tick, 1000);
}

/* ── Бързи действия ──────────────────────────────────────── */
function quickSheet() {
  const s = daySummary(app.profile, today);
  const next = nextMeal(s);
  const hasWorkout = !!workoutData[dayKeyOf(today)];
  openSheet(`
    <div class="sheet-head">
      <div class="grow"><span class="pill">БЪРЗО</span><h2>Какво отбелязваме?</h2></div>
      <button class="close-btn" data-act="close">×</button>
    </div>
    <div class="quick">
      <button data-act="q-water"><span class="ic">💧</span><b>+ 250 мл вода</b><small>${s.water}/${s.waterGoal} чаши днес</small></button>
      <button data-act="q-meal" ${next ? '' : 'disabled style="opacity:.4"'}><span class="ic">${next ? next.m.icon : '✅'}</span><b>${next ? 'Отметни хранене' : 'Всичко е готово'}</b><small>${next ? esc(next.m.type) + ' · ' + next.m.time : 'няма оставащи'}</small></button>
      <button data-act="q-workout" ${hasWorkout ? '' : 'disabled style="opacity:.4"'}><span class="ic">🏋️</span><b>${hasWorkout ? 'Към тренировката' : 'Почивен ден'}</b><small>${hasWorkout ? esc(workoutData[dayKeyOf(today)].title) : 'без тренировка днес'}</small></button>
      <button data-act="log-weight"><span class="ic">⚖️</span><b>Запиши тегло</b><small>за ${esc(profiles[app.profile].name)}</small></button>
      <button data-act="q-recipes"><span class="ic">📖</span><b>Рецепти</b><small>всички ястия от плана</small></button>
      <button data-act="q-shop"><span class="ic">🛒</span><b>Пазар</b><small>списъкът за седмицата</small></button>
    </div>
  `);
}

/* ── Профил ──────────────────────────────────────────────── */
function profileSheet() {
  openSheet(`
    <div class="sheet-head">
      <div class="grow"><span class="pill">ПРОФИЛ</span><h2>Кой гледа плана?</h2></div>
      <button class="close-btn" data-act="close">×</button>
    </div>
    <div class="quick" style="grid-template-columns:1fr">
      ${Object.values(profiles).map(p => `
        <button data-act="profile" data-id="${p.id}" style="display:flex;align-items:center;gap:14px;text-align:left">
          <span style="width:46px;height:46px;border-radius:16px;display:grid;place-items:center;font-weight:800;font-size:17px;flex:none;
            background:linear-gradient(145deg,${p.accent === 'coral' ? 'var(--coral),var(--coral-2)' : 'var(--lime),var(--lime-2)'});
            color:${p.accent === 'coral' ? '#2a0f12' : '#0a1206'}">${p.initial}</span>
          <span style="flex:1;min-width:0">
            <b style="display:block;font-size:15px">${p.name}${p.id === app.profile ? ' ·  активен' : ''}</b>
            <small style="display:block;font-size:11.5px;color:var(--paper-faint);margin-top:2px">${esc(p.role)} · ${p.kcal} ккал · ${p.protein} г протеин</small>
          </span>
        </button>`).join('')}
    </div>
  `);
}

/* ── Настройки ───────────────────────────────────────────── */
function settingsSheet() {
  const synced = !!window.hustleShoppingReady;
  openSheet(`
    <div class="sheet-head">
      <div class="grow"><span class="pill">НАСТРОЙКИ</span><h2>ХЪСЪЛ</h2></div>
      <button class="close-btn" data-act="close">×</button>
    </div>
    <p class="sheet-sub">Плановете на Боби и Ширин, 8-седмичният тренировъчен цикъл и общият пазар. Работи офлайн.</p>

    <div class="card mt-lg" style="padding:0">
      <button class="setting" data-act="toggle-theme">
        <span class="ic">${app.theme === 'light' ? '☀️' : '🌙'}</span>
        <span class="grow"><b>Тема</b><small>${app.theme === 'light' ? 'Светла' : 'Тъмна'}</small></span>
        <span class="switch ${app.theme === 'light' ? '' : 'on'}"></span>
      </button>
      <button class="setting" data-act="switch-profile">
        <span class="ic">👤</span>
        <span class="grow"><b>Профил</b><small>${profiles[app.profile].name}</small></span>
        <span class="arrow">›</span>
      </button>
      <button class="setting" data-act="q-recipes">
        <span class="ic">📖</span>
        <span class="grow"><b>Рецепти</b><small>${(RECIPES || D.buildRecipeLibrary()).length} ястия с точни грамажи</small></span>
        <span class="arrow">›</span>
      </button>
      <button class="setting" data-act="stats">
        <span class="ic">📊</span>
        <span class="grow"><b>Статистика</b><small>Седмичен преглед и тегло</small></span>
        <span class="arrow">›</span>
      </button>
    </div>

    <div class="card mt" style="padding:0">
      <div class="setting" style="pointer-events:none">
        <span class="ic">${synced ? '🟢' : '⚪️'}</span>
        <span class="grow"><b>Синхронизация на пазара</b><small>${synced ? 'Активна · Firebase' : 'Локален режим на този телефон'}</small></span>
      </div>
      <button class="setting" data-act="clear-day">
        <span class="ic">↺</span>
        <span class="grow"><b>Изчисти днешния ден</b><small>Хранения, вода и серии за ${today.getDate()} ${MONTHS[today.getMonth()]}</small></span>
        <span class="arrow">›</span>
      </button>
    </div>

    <div class="callout mt-lg">
      <b>Добави на началния екран:</b> Сподели → „Към началния екран“. Тогава приложението тръгва на цял екран и работи и без интернет.
    </div>
    <p class="dim" style="font-size:11px;text-align:center;margin-top:20px;letter-spacing:.04em">ХЪСЪЛ · семейство Бадах · v2</p>
  `);
}

function weightSheet() {
  const list = store.get('weight.' + app.profile, []);
  openSheet(`
    <div class="sheet-head">
      <div class="grow"><span class="pill">${esc(profiles[app.profile].name).toUpperCase()}</span><h2>Записване на тегло</h2></div>
      <button class="close-btn" data-act="close">×</button>
    </div>
    <p class="sheet-sub">Мери се сутрин, на гладно, след тоалетна — винаги при едни и същи условия.</p>
    <div class="search mt-lg" style="padding:16px">
      <input id="weightInput" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="напр. 84.6" autocomplete="off">
      <span class="dim" style="font-weight:700;font-size:14px">кг</span>
    </div>
    <button class="btn wide mt" data-act="save-weight">Запази</button>
    ${list.length ? `<div class="block">
      <h3>Последни записи</h3>
      <div class="ing mt">${list.slice(-8).reverse().map(x =>
        `<div><span>${new Date(x.date).getDate()} ${MONTHS[new Date(x.date).getMonth()]}</span><b>${x.kg} кг</b></div>`).join('')}</div>
    </div>` : ''}
  `);
  setTimeout(() => $('#weightInput')?.focus(), 320);
}

/* ══════════════════════════════════════════════════════════
   НАВИГАЦИЯ
   ══════════════════════════════════════════════════════════ */
const RENDER = { today: renderToday, food: renderFood, workout: renderWorkout, shop: renderShop, recipes: renderRecipes, stats: renderStats };
const navStack = ['today'];

function go(view, skipHistory) {
  if (!RENDER[view]) return;
  app.view = view;
  applyAccent();
  const run = () => {
    // класът се вдига преди рендера, за да имат елементите реални размери
    $$('.view').forEach(v => v.classList.toggle('active', v.id === view + 'View'));
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    RENDER[view]();
    $('#scroll').scrollTop = 0;
  };
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(run);
  } else run();
  if (!skipHistory && navStack[navStack.length - 1] !== view) navStack.push(view);
}

function back() {
  navStack.pop();
  go(navStack[navStack.length - 1] || 'today', true);
}

function setProfile(id) {
  app.profile = id;
  store.set('profile', id);
  applyAccent();
  if (RENDER[app.view]) RENDER[app.view]();
  toast('Профил: ' + profiles[id].name);
}

function refresh() { if (RENDER[app.view]) RENDER[app.view](); }

/* ══════════════════════════════════════════════════════════
   СЪБИТИЯ
   ══════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (tab) { haptic(); go(tab.dataset.view); return; }

  if (e.target.closest('#fab')) { haptic(12); quickSheet(); return; }
  if (e.target.closest('#scrim')) { closeSheet(); return; }

  const node = e.target.closest('[data-act]');
  if (!node) return;
  const act = node.dataset.act;
  haptic();

  switch (act) {
    case 'close': closeSheet(); break;
    case 'back': closeSheet(); back(); break;
    case 'goto': go(node.dataset.view); break;
    case 'settings': settingsSheet(); break;
    case 'stats': closeSheet(); go('stats'); break;
    case 'recipes': case 'q-recipes': closeSheet(); go('recipes'); break;
    case 'q-shop': closeSheet(); go('shop'); break;
    case 'switch-profile': profileSheet(); break;

    case 'profile':
      setProfile(node.dataset.id);
      closeSheet();
      break;

    case 'today-jump':
      app.foodDate = new Date(today); refresh(); toast('Днес'); break;
    case 'today-jump-workout':
      app.workoutDate = new Date(today); refresh(); toast('Днес'); break;

    case 'food-date': {
      const [y, m, d] = node.dataset.date.split('-').map(Number);
      app.foodDate = new Date(y, m - 1, d, 12); renderFood(); break;
    }
    case 'workout-date': {
      const [y, m, d] = node.dataset.date.split('-').map(Number);
      app.workoutDate = new Date(y, m - 1, d, 12); renderWorkout(); break;
    }

    case 'eat': {
      e.stopPropagation();
      const i = +node.dataset.i;
      const list = getEaten(app.profile, app.foodDate);
      const at = list.indexOf(i);
      if (at >= 0) list.splice(at, 1); else { list.push(i); haptic(16); }
      setEaten(app.profile, app.foodDate, list);
      const s = daySummary(app.profile, app.foodDate);
      if (list.length === s.total) { celebrate(); toast('Целият ден е изкаран 🎯'); }
      refresh();
      break;
    }

    case 'eat-from-sheet': {
      const i = +node.dataset.i;
      const list = getEaten(app.profile, app.foodDate);
      const at = list.indexOf(i);
      if (at >= 0) list.splice(at, 1); else list.push(i);
      setEaten(app.profile, app.foodDate, list);
      closeSheet(); refresh();
      toast(at >= 0 ? 'Премахнато' : 'Отметнато ✓');
      break;
    }

    case 'open-meal': {
      const i = +node.dataset.i;
      const date = app.view === 'today' ? today : app.foodDate;
      if (app.view === 'today') app.foodDate = new Date(today);
      const key = dayKeyOf(date);
      mealSheet(profiles[app.profile].meals[key].items[i], app.profile, key, i);
      break;
    }

    case 'open-recipe': {
      const r = (RECIPES || (RECIPES = D.buildRecipeLibrary()))[+node.dataset.i];
      const owner = r.owners.includes(profiles[app.profile].name)
        ? app.profile
        : (Object.values(profiles).find(x => r.owners.includes(x.name)) || profiles.boby).id;
      mealSheet(r.meal, owner, null, null);
      break;
    }

    case 'toggle-two': {
      app.forTwo = !app.forTwo;
      store.set('forTwo', app.forTwo);
      if (sheetMealIndex != null && sheetMealKey)
        mealSheet(profiles[app.profile].meals[sheetMealKey].items[sheetMealIndex], app.profile, sheetMealKey, sheetMealIndex, true);
      break;
    }

    case 'open-exercise': exerciseSheet(+node.dataset.i); break;

    case 'set': {
      const id = node.dataset.ex, s = +node.dataset.s;
      const all = getSets(app.workoutDate);
      const marks = all[id] || [];
      marks[s] = !marks[s];
      all[id] = marks;
      store.set(setsKey(app.workoutDate), all);
      node.classList.toggle('on', !!marks[s]);
      if (marks[s]) { haptic(14); startTimer(+node.dataset.rest); }
      break;
    }

    case 'timer': startTimer(+node.dataset.rest); break;

    case 'finish-workout': {
      const was = store.get(doneKey(app.workoutDate), false);
      store.set(doneKey(app.workoutDate), !was);
      if (!was) { celebrate(); toast('Тренировката е записана 💪'); }
      renderWorkout();
      break;
    }

    case 'water': {
      const n = +node.dataset.n;
      const cur = getWater(app.profile, today);
      store.set(waterKey(app.profile, today), n === cur ? n - 1 : n);
      haptic(10);
      refresh();
      break;
    }
    case 'q-water': {
      const cur = getWater(app.profile, today);
      const goal = WATER_GOAL[app.profile];
      store.set(waterKey(app.profile, today), Math.min(goal, cur + 1));
      toast(`Вода: ${Math.min(goal, cur + 1)} / ${goal} чаши`);
      closeSheet(); refresh();
      break;
    }
    case 'q-meal': {
      const s = daySummary(app.profile, today);
      const next = nextMeal(s);
      if (!next) break;
      const list = getEaten(app.profile, today);
      list.push(next.i);
      setEaten(app.profile, today, list);
      closeSheet();
      app.foodDate = new Date(today);
      refresh();
      toast(next.m.type + ' ✓');
      if (list.length === s.total) celebrate();
      break;
    }
    case 'q-workout': closeSheet(); app.workoutDate = new Date(today); go('workout'); break;

    case 'shop-tab': app.shop = node.dataset.id; renderShop(); break;
    case 'shop-item': {
      const id = node.dataset.id;
      const next = !shopChecked(id);
      setShopChecked(id, next);
      node.classList.toggle('on', next);
      $('.tick', node)?.classList.toggle('on', next);
      haptic(next ? 12 : 6);
      updateShopProgress();
      break;
    }
    case 'shop-reset': {
      const data = shopping[app.shop];
      Object.entries(data.groups).forEach(([name, items]) => items.forEach((_, i) => {
        const id = `${app.shop}-${name}-${i}`;
        store.set('shop.' + id, false);
      }));
      if (window.hustleShoppingSync) window.hustleShoppingSync.resetList(app.shop).catch(() => {});
      renderShop();
      toast('Списъкът е изчистен');
      break;
    }

    case 'recipe-cat': app.recipeCat = node.dataset.id; renderRecipes(); break;

    case 'log-weight': weightSheet(); break;
    case 'save-weight': {
      const v = parseFloat($('#weightInput')?.value);
      if (!v || v < 30 || v > 250) { toast('Въведи тегло между 30 и 250 кг'); break; }
      const list = store.get('weight.' + app.profile, []);
      const stamp = iso(new Date());
      const idx = list.findIndex(x => x.date === stamp);
      if (idx >= 0) list[idx] = { date: stamp, kg: v }; else list.push({ date: stamp, kg: v });
      store.set('weight.' + app.profile, list);
      closeSheet();
      toast('Записано: ' + v + ' кг');
      if (app.view === 'stats') renderStats();
      break;
    }

    case 'toggle-theme':
      app.theme = app.theme === 'light' ? 'dark' : 'light';
      store.set('theme', app.theme);
      applyTheme();
      settingsSheet();
      break;

    case 'hide-install':
      store.set('hideInstall', true);
      renderToday();
      break;

    case 'clear-day':
      store.del(eatenKey(app.profile, today));
      store.del(waterKey(app.profile, today));
      store.del(setsKey(today));
      store.del(doneKey(today));
      closeSheet(); refresh();
      toast('Днешният ден е изчистен');
      break;
  }
});

function updateShopProgress() {
  const data = shopping[app.shop];
  let total = 0, done = 0;
  Object.entries(data.groups).forEach(([name, items]) => items.forEach((_, i) => {
    total++;
    if (shopChecked(`${app.shop}-${name}-${i}`)) done++;
  }));
  const row = $('#shopView .shop-progress .row');
  if (row) {
    row.innerHTML = `<b class="num">${done}<span style="font-size:16px;font-weight:650;opacity:.4"> / ${total}</span></b><span>${total ? Math.round(done / total * 100) : 0}% готово</span>`;
    $('#shopView .shop-progress .bar i').style.width = (total ? done / total * 100 : 0) + '%';
  }
  if (total && done === total) { celebrate(); toast('Пазарът е готов 🛒'); }
}

/* ── Плъзгане на листа ───────────────────────────────────── */
(function sheetDrag() {
  const sheet = $('#sheet'), grab = $('#grab');
  let startY = 0, delta = 0, dragging = false;
  const down = e => {
    dragging = true; delta = 0;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    sheet.classList.add('dragging');
  };
  const move = e => {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    delta = Math.max(0, y - startY);
    sheet.style.transform = `translateY(${delta}px)`;
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    if (delta > 110) closeSheet();
    else sheet.style.transform = '';
  };
  grab.addEventListener('touchstart', down, { passive: true });
  grab.addEventListener('touchmove', move, { passive: true });
  grab.addEventListener('touchend', up);
  grab.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
})();

/* ── Хоризонтално плъзгане между дните ───────────────────── */
(function swipeDays() {
  let x0 = null, y0 = null;
  $('#scroll').addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  $('#scroll').addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 62 || Math.abs(dy) > 44) return;
    const dir = dx < 0 ? 1 : -1;
    if (app.view === 'food') { app.foodDate = addDays(app.foodDate, dir); haptic(); renderFood(); }
    else if (app.view === 'workout') { app.workoutDate = addDays(app.workoutDate, dir); haptic(); renderWorkout(); }
  }, { passive: true });
})();

/* Escape и системният „назад“ затварят листа */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetOpen) { closeSheet(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) {
    e.preventDefault();
    e.target.click();
  }
});

/* Пазарът се обновява при промяна от другия телефон */
window.addEventListener('hustle-shopping-sync', () => { if (app.view === 'shop') renderShop(); });

window.addEventListener('resize', () => { positionThumb(); positionShopThumb(); });

/* Върни се към „днес“, ако приложението е стояло отворено през нощта */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const now = new Date(); now.setHours(12, 0, 0, 0);
  if (iso(now) !== iso(today)) location.reload();
});

/* ══════════════════════════════════════════════════════════
   СТАРТ
   ══════════════════════════════════════════════════════════ */
applyTheme();
applyAccent();

const startView = new URLSearchParams(location.search).get('go');
if (startView && RENDER[startView]) go(startView);
else renderToday();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

})();
