'use strict';
// Guard console: check passes, admit or refuse, register walk-ins, ask or call the host, check contractors, keep the shift log.
// Uses the admin's synthetic data (admin/data.js) and helpers (admin/helpers.js).
const QS = new URLSearchParams(location.search);
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* private mode */ } } };
const key = s => String(s ?? '').replace(/ /g, ' ').toLowerCase().replace(/[\s-]/g, '');
const isToday = d => !!d && d.toDateString() === NOW.toDateString();
const pn = id => PERSON.get(id)?.name || '—';
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
// Unit names break only after the comma: "No. 4," / "Jalan Harmoni 1", never "Jalan Harmoni" / "1"
const un = name => esc(name).replace(/, (.+)$/, (m, st) => ', ' + st.replace(/ /g, '\u00a0'));
const initials = n => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const telOf = p => 'tel:' + String(p).replace(/[^\d+]/g, '');
const fmtHM = s => { const [h, m] = s.split(':').map(Number); return dTime(new Date(2026, 0, 1, h, m)); };
const atHM = s => { const [h, m] = s.split(':').map(Number); const d = new Date(NOW); d.setHours(h, m, 0, 0); return d; };
const mins = ms => { const m = Math.max(0, Math.round(ms / 6e4)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim(); };
const DOW = (NOW.getDay() + 6) % 7; // index into a guard's rota, Monday = 0
const SHIFT = { D: ['Day shift', '7 am – 7 pm'], N: ['Night shift', '7 pm – 7 am'], O: ['Off today', ''] };
const GATES = TAMANS.flatMap(t => [...new Set(POSTS[t.id].filter(p => p !== 'Patrol'))].map(gate => ({ taman: t.id, gate, key: `${t.id}|${gate}` })));
// Pass codes are what residents read out or show under their QR; deterministic so the demo is repeatable
const passCode = id => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) { s += A[h % 32]; h = ((h >>> 5) ^ Math.imul(i + 1, 2654435761)) >>> 0; } return s; };

const G = { st: GATES.find(g => g.key === ss.get('tm-station')) || GATES[0], guard: null, who: null, pin: '', pick: null, reg: null, logTab: 'inside', logKind: 'all', events: [], parcels: [], stats: { in: 0, out: 0, deny: 0, walkin: 0, work: 0 }, askTimer: 0 };
const tm = () => G.st.taman;
const rank = g => (g.rota[DOW] === 'D' ? 0 : 2) + (g.post === G.st.gate ? 0 : 1);
const guardsHere = () => GUARDS.filter(g => g.taman === tm()).sort((a, b) => rank(a) - rank(b));
G.guard = GUARDS.find(g => g.id === ss.get('tm-guard') && g.taman === tm()) || (QS.has('demo') ? guardsHere()[0] : null);
const seedParcels = () => { G.parcels = UNITS.filter(u => u.taman === tm() && u.status === 'Occupied').slice(3, 5).map((u, i) => ({ id: 'PCL-' + (310 + i), unit: u.id, courier: ['Parcel courier', 'Grocery delivery'][i], at: at(0, 8 + i, 10 + i * 25), collected: false })); };
seedParcels();

// ---------- Lookups ----------
const myVisitors = () => VISITORS.filter(v => v.taman === tm());
const expected = () => myVisitors().filter(v => v.status === 'Expected').sort((a, b) => a.in - b.in);
const inside = () => myVisitors().filter(v => v.status === 'Inside').sort((a, b) => a.in - b.in);
const myPermits = () => PERMITS.filter(p => p.taman === tm());
const endToday = () => { const d = new Date(NOW); d.setHours(23, 59, 59, 999); return d; };
const contractorsToday = () => myPermits().filter(p => ['Approved', 'Work In Progress'].includes(p.status) && p.start <= endToday() && p.end >= atHM('00:00'));
const onsite = p => ONSITE.find(o => o.permit === p.id);
const residents = u => [u.tenant && { id: u.tenant, rel: 'Tenant, lives here' }, { id: u.owner, rel: u.tenant ? 'Owner, lives elsewhere' : u.status === 'Vacant' ? 'Owner, unit is vacant' : 'Owner, lives here' },
  ...OCC.filter(o => o.unit === u.id && o.rel === 'Sub-tenant' && o.status === 'Active' && o.scopes.includes('Visitor passes')).map(o => ({ id: o.person, rel: 'Sub-tenant' }))]
  .filter(Boolean).map(h => ({ ...h, name: pn(h.id), phone: PERSON.get(h.id)?.phone || '' }));
const unitByName = s => UNITS.find(u => u.taman === tm() && key(u.name) === key(s));
const hoursToday = () => { const w = WORK_HOURS[tm()], d = NOW.getDay(); return d === 0 ? (w.sunOff ? null : [w.satFrom, w.satTo]) : d === 6 ? [w.satFrom, w.satTo] : [w.wkFrom, w.wkTo]; };

// ---------- Verdicts ----------
function judgeVisitor(v) {
  const h = QR_POLICY.validity;
  if (v.taman !== tm()) return { tone: 'bad', icon: 'block', title: 'Do not admit', why: `This pass is for ${T(v.taman).name}, not ${T(tm()).short}.`, reason: 'Wrong taman' };
  if (v.status === 'Inside') return { tone: 'sun', icon: 'info', title: 'Already inside', why: `Came in at ${dTime(v.in)} through ${v.gate}. Check them out if they are leaving.` };
  if (v.status === 'Denied' && isToday(v.in)) return { tone: 'bad', icon: 'block', title: 'Do not admit', why: `Refused earlier today: ${v.denyReason}.`, reason: 'Refused earlier' };
  if (!isToday(v.in) || ['No-show', 'Overstayed', 'Denied'].includes(v.status)) return { tone: 'bad', icon: 'event_busy', title: 'Pass expired', why: `It was valid on ${dDay(v.in)} only. Ask the host for a new pass, or register a walk-in.`, reason: 'Pass expired' };
  if (v.status === 'Checked out') return { tone: 'sun', icon: 'help', title: 'Check with the host', why: `This pass was used today; they left at ${dTime(v.out)}. Call the host before letting them back in.` };
  return { tone: 'ok', icon: 'check_circle', title: 'Valid pass', why: `${v.via}. Valid ${h} hours from now, until ${dTime(new Date(+clock() + h * 36e5))}.` };
}
function judgePermit(p) {
  const hrs = hoursToday(), on = onsite(p)?.onSite || 0, left = p.workers - on;
  const bl = BLACKLIST.find(b => b.name === p.contractor && (b.scope === 'portfolio' || b.taman === p.taman));
  if (p.taman !== tm()) return { tone: 'bad', icon: 'block', title: 'Do not admit', why: `This permit is for ${T(p.taman).name}.`, reason: 'Wrong taman' };
  if (bl) return { tone: 'bad', icon: 'gpp_bad', title: 'Blacklisted contractor', why: bl.reason, reason: 'Blacklisted' };
  if (p.stopped) return { tone: 'bad', icon: 'pan_tool', title: 'Stop-work order', why: 'Management has stopped this work. Nobody from this contractor may enter.', reason: 'Stop-work order' };
  if (['Pending Review', 'Docs requested', 'Pending Deposit', 'Rejected'].includes(p.status)) return { tone: 'bad', icon: 'block', title: 'Permit not approved', why: `The permit is still “${p.status}”. Work cannot start yet.`, reason: 'Permit not approved' };
  if (['Inspection Scheduled', 'Completed', 'Deposit Refunded'].includes(p.status)) return { tone: 'bad', icon: 'event_busy', title: 'Permit has ended', why: `Work ended on ${dDay(p.end)}.`, reason: 'Permit ended' };
  if (p.start > endToday()) return { tone: 'bad', icon: 'event_busy', title: 'Not allowed yet', why: `This permit starts on ${dDay(p.start)}.`, reason: 'Permit not started' };
  if (!hrs) return { tone: 'bad', icon: 'schedule', title: 'No work today', why: 'Contractors may not work on Sundays or public holidays.', reason: 'Outside work hours' };
  const now = clock();
  if (now < atHM(hrs[0]) || now > atHM(hrs[1])) return { tone: 'bad', icon: 'schedule', title: 'Outside work hours', why: `Work is allowed ${fmtHM(hrs[0])} – ${fmtHM(hrs[1])} today.`, reason: 'Outside work hours' };
  if (left <= 0) return { tone: 'sun', icon: 'groups', title: 'Worker limit reached', why: `${on} of ${p.workers} workers are already inside. Nobody else from this permit until someone leaves.`, reason: 'Too many workers' };
  return { tone: 'ok', icon: 'check_circle', title: 'Permit valid', why: `Work allowed until ${fmtHM(hrs[1])} today. ${left} more worker${left > 1 ? 's' : ''} can enter.` };
}

// ---------- Small UI pieces ----------
const $sheet = () => $('#sheet');
function openSheet(html, focus) { const d = $sheet(), first = !d.open; d.innerHTML = html; if (first) $('.band', d)?.classList.add('enter'); if (first) d.showModal(); ($(focus || '[data-autofocus]', d) || $('.sh-close', d))?.focus(); }
const closeSheet = () => { const d = $sheet(); if (d.open) d.close(); };
const closeBtn = '<button type="button" class="sh-close" data-act="close" aria-label="Close"><span class="ms" aria-hidden="true">close</span></button>';
const band = j => `<div class="band band-${j.tone}">${icon(j.icon, 'big fill')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[28px] leading-9 sm:text-[34px] sm:leading-10 font-bold tracking-[-0.02em]">${j.title}</h2><p class="mt-1 text-[15px] leading-6 ${j.tone === 'sun' ? '' : 'opacity-90'}">${esc(j.why)}</p></div>${closeBtn}</div>`;
const note = (text, tone = 'indigo', ic = 'info') => `<p class="flex gap-2.5 rounded-2xl p-4 text-[14px] leading-5 ${{ indigo: 'bg-indigo-tint text-indigo', sun: 'bg-sun-tint text-sun-ink', bad: 'bg-bad-tint text-bad-ink', ok: 'bg-mint text-ok-ink' }[tone]}">${icon(ic, 'text-[20px]')}<span>${text}</span></p>`;
const field = (lab, inner, hint = '', id = '') => `<div class="min-w-0">${id ? `<label for="${id}" class="block text-[13px] font-medium mb-1.5">${lab}</label>` : `<span class="block text-[13px] font-medium mb-1.5">${lab}</span>`}${inner}${hint ? `<p class="mt-1.5 text-[12.5px] text-muted">${hint}</p>` : ''}</div>`;
const callList = (u, confirm = '') => `<div class="rounded-2xl p-4 shadow-[inset_0_0_0_1px_var(--line)]">
  <p class="text-[13px] font-medium text-muted mb-2">Call ${esc(u.name)}</p>
  <ul class="grid gap-3">${residents(u).map(h => `<li class="flex items-center gap-3"><span class="avatar">${initials(h.name)}</span><div class="min-w-0 flex-1"><p class="text-[15px] font-semibold truncate">${esc(h.name)}</p><p class="text-[12.5px] text-muted truncate">${h.rel} · <span class="num whitespace-nowrap">${esc(h.phone)}</span></p></div><a class="btn btn-t h-12 px-4" href="${telOf(h.phone)}" data-act="call" data-who="${esc(h.name)}" data-unit="${esc(u.name)}">${icon('call')}Call</a></li>`).join('')}</ul>
  ${confirm}</div>`;
const yesNo = (act, val) => `<div class="mt-3 grid grid-cols-2 gap-2"><button type="button" class="choice" data-act="${act}" data-v="yes" aria-pressed="${val === true}">${icon('thumb_up')}Host said yes</button><button type="button" class="choice" data-act="${act}" data-v="no" aria-pressed="${val === false}">${icon('thumb_down')}Host said no</button></div>`;
let toastT;
function toast(msg) { const t = $('#toast'); t.innerHTML = `<span>${msg}</span>`; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 4500); }
const logEvent = (kind, text, sub = '') => G.events.unshift({ at: clock(), kind, text, sub, who: G.guard?.name || '' });

// ---------- Sign in ----------
function signin() {
  document.body.className = 'bg-cream font-sans text-ink antialiased';
  const gs = guardsHere(), who = G.who && GUARDS.find(g => g.id === G.who);
  $('#app').innerHTML = `<div class="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <section class="on-dark bg-indigo text-white px-5 pt-7 pb-14 sm:px-10 lg:p-12 flex flex-col">
      <div class="flex items-center gap-3"><span class="mark"></span><span class="text-[22px] font-medium tracking-[-0.02em]">Tamanly</span><span class="chip chip-dark plain">Guard</span></div>
      <div class="mt-9 lg:my-auto max-w-[28rem]">
        <h1 class="text-[30px] sm:text-[38px] leading-[1.1] font-bold tracking-[-0.03em]">Start your shift</h1>
        <p class="mt-3 text-[16px] leading-relaxed text-lav">Tap your name, then enter your 4-digit PIN.</p>
        <label class="block mt-8 text-[13px] font-medium text-lav" for="station">This device is at</label>
        <select id="station" class="mt-1.5 w-full h-12 rounded-2xl bg-white/10 px-4 text-white text-[15px] font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]">${GATES.map(g => `<option class="text-ink" value="${esc(g.key)}" ${g.key === G.st.key ? 'selected' : ''}>${esc(T(g.taman).name)} · ${esc(g.gate)}</option>`).join('')}</select>
      </div>
    </section>
    <section class="-mt-7 lg:mt-0 rounded-t-[28px] lg:rounded-none bg-cream px-4 sm:px-10 pt-8 pb-12 lg:p-12 flex lg:items-center justify-center">
      <div class="w-full max-w-[560px]">${who ? pinPad(who) : `
        <h2 class="text-[22px] font-semibold tracking-[-0.01em]">Who is on duty?</h2>
        <p class="mt-1 text-[14.5px] text-muted">${esc(T(tm()).name)} · ${esc(G.st.gate)} · ${dDay(NOW)}</p>
        <ul class="mt-6 grid gap-3 sm:grid-cols-2">${gs.map(g => { const s = SHIFT[g.rota[DOW]]; return `<li><button type="button" class="w-full flex items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-[var(--sh)] hover:shadow-[0_10px_28px_rgba(61,43,107,.12)] transition-shadow min-h-[76px]" data-act="who" data-id="${g.id}">
          <span class="avatar w-12 h-12 text-[15px]">${initials(g.name)}</span><span class="min-w-0 flex-1"><span class="block text-[16px] font-semibold leading-5">${esc(g.name)}</span><span class="block mt-0.5 text-[13px]">${g.rota[DOW] === 'D' ? `<span class="font-semibold text-ok-ink">On shift now</span>${g.post === G.st.gate ? ` <span class="text-muted">· ${esc(g.post)}</span>` : ` <span class="font-semibold text-sun-ink">· rostered at ${esc(g.post)}</span>`}` : `<span class="text-muted">${esc(g.post)} · ${s[0]}</span>`}</span></span></button></li>`; }).join('')}</ul>
        <p class="mt-8 text-[12.5px] text-muted">Prototype: any 4-digit PIN signs in. Names and data are synthetic.</p>`}
      </div>
    </section></div>`;
  ($('[data-act="who"]') || $('#station'))?.focus({ preventScroll: true });
}
const pinPad = g => `<button type="button" class="btn btn-g -ml-2.5" data-act="who-back">${icon('arrow_back')}Not you?</button>
  <div class="mt-4 flex items-center gap-4"><span class="avatar w-14 h-14 text-[17px]">${initials(g.name)}</span><div class="min-w-0"><h2 class="text-[22px] font-semibold leading-7">${esc(g.name)}</h2><p class="text-[14px] text-muted">${esc(g.post)} · ${SHIFT[g.rota[DOW]].join(', ')}</p></div></div>
  <p class="mt-8 text-[15px] font-medium" id="pin-label">Enter your PIN</p>
  <div class="mt-3 dots" role="img" aria-labelledby="pin-label" aria-describedby="pin-count"><span></span><span></span><span></span><span></span></div><p id="pin-count" class="sr-only" aria-live="polite">0 of 4 digits</p>
  <div class="mt-6 grid grid-cols-3 gap-3 max-w-[320px]">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" class="key" data-act="key" data-k="${n}">${n}</button>`).join('')}<span></span><button type="button" class="key" data-act="key" data-k="0">0</button><button type="button" class="key" data-act="key" data-k="back" aria-label="Delete last digit">${icon('backspace')}</button></div>
  <p class="mt-6 text-[12.5px] text-muted">Prototype: any 4 digits work. You can also type them.</p>`;
function pinKey(k) {
  G.pin = k === 'back' ? G.pin.slice(0, -1) : (G.pin + k).slice(0, 4);
  $$('.dots span').forEach((s, i) => s.classList.toggle('on', i < G.pin.length));
  const c = $('#pin-count'); if (c) c.textContent = `${G.pin.length} of 4 digits`;
  if (G.pin.length === 4) setTimeout(() => { G.guard = GUARDS.find(g => g.id === G.who); ss.set('tm-guard', G.guard.id); G.who = null; G.pin = ''; G.stats = { in: 0, out: 0, deny: 0, walkin: 0, work: 0 }; location.hash = '#/gate'; render(); toast(`Shift started at ${dTime(clock())}. Good ${clock().getHours() < 12 ? 'morning' : clock().getHours() < 18 ? 'afternoon' : 'evening'}, ${esc(G.guard.name.split(' ')[0])}.`); }, 150);
}

// ---------- Shell ----------
const NAV = [['gate', 'Gate', 'sensor_door'], ['log', 'Log', 'list_alt'], ['permits', 'Permits', 'badge'], ['me', 'Me', 'person']];
function shell() {
  return `<div class="lg:flex min-h-dvh">
    <nav class="on-dark hidden lg:flex flex-col items-center gap-2 w-[96px] shrink-0 bg-indigo py-4 sticky top-0 h-dvh" aria-label="Guard console">
      <span class="mark mb-3" role="img" aria-label="Tamanly logo"></span>
      <button type="button" class="rail-item mb-2" data-act="scan"><span class="fab">${icon('qr_code_scanner')}</span>Scan</button>
      <div id="rail" class="grid gap-1"></div>
    </nav>
    <div class="flex-1 min-w-0 flex flex-col">
      <header id="top" class="on-dark sticky top-0 z-20 bg-indigo h-16 flex items-center gap-3 px-3 sm:px-5 lg:px-8"></header>
      <main class="flex-1 bg-cream rounded-t-[28px] lg:rounded-tr-none"><div id="view" class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 pt-6 pb-36 lg:pb-12"></div></main>
    </div>
    <nav id="bar" class="bbar lg:hidden" aria-label="Guard console"></nav>
  </div>`;
}
function topBar() {
  const g = G.guard;
  return `<span class="mark sm lg:hidden" role="img" aria-label="Tamanly logo"></span>
    <div class="min-w-0"><p class="text-white text-[15px] font-semibold leading-5 truncate">${esc(G.st.gate)} · ${esc(T(tm()).short)}</p><p class="text-lav text-[12.5px] leading-4 truncate"><span class="sm:hidden">${dTime(clock())} · </span>${SHIFT[g.rota[DOW]][0]} · ${esc(g.name.split(' ')[0])}</p></div>
    <div class="ml-auto flex items-center gap-2 sm:gap-4">
      <div class="hidden sm:block text-right"><p class="text-white text-[20px] leading-6 font-semibold num" data-clock>${dTime(clock())}</p><p class="text-lav text-[12px] leading-4">${dDay(NOW)}</p></div>
      <span class="hidden md:flex items-center gap-2 text-[12.5px] text-lav"><span class="live"></span>Synced</span>
      <a href="#/me" class="hidden md:flex items-center gap-2 rounded-full pl-1 pr-3 h-11 hover:bg-white/10"><span class="avatar">${initials(g.name)}</span><span class="text-white text-[13.5px] font-medium">${esc(g.name.split(' ')[0])}</span></a>
      <button type="button" class="btn btn-d h-12 px-4" data-act="sos">${icon('emergency')}SOS</button>
    </div>`;
}
function render() {
  if (!G.guard) return signin();
  if (!$('#rail')) { document.body.className = 'bg-indigo font-sans text-ink antialiased'; $('#app').innerHTML = shell(); }
  const v = location.hash.replace(/^#\/?/, '') || 'gate', view = VIEWS[v] ? v : 'gate', changed = G.view !== view;
  G.view = view;
  $('#rail').innerHTML = NAV.map(([k, l, ic]) => `<a class="rail-item" href="#/${k}" ${k === view ? 'aria-current="page"' : ''}>${icon(ic, k === view ? 'fill' : '')}${l}</a>`).join('');
  $('#bar').innerHTML = NAV.slice(0, 2).map(navBar(view)).join('') + `<button type="button" class="bar-item" data-act="scan"><span class="fab">${icon('qr_code_scanner')}</span>Scan</button>` + NAV.slice(2).map(navBar(view)).join('');
  $("#top").innerHTML = topBar();
  const y = scrollY; $('#view').innerHTML = VIEWS[view]();
  if (changed) { scrollTo(0, 0); $('#view h1')?.focus({ preventScroll: true }); } else scrollTo(0, y);
  document.title = `${NAV.find(n => n[0] === view)[1]} · Tamanly Guard`;
}
const navBar = view => ([k, l, ic]) => `<a class="bar-item" href="#/${k}" ${k === view ? 'aria-current="page"' : ''}>${icon(ic, k === view ? 'fill' : '')}${l}</a>`;
const h1 = (t, sub = '') => `<div class="mb-5"><h1 tabindex="-1" class="text-[24px] sm:text-[26px] leading-8 font-semibold tracking-[-0.02em] outline-none">${t}</h1>${sub ? `<p class="mt-1 text-[14.5px] text-muted">${sub}</p>` : ''}</div>`;

// ---------- Gate ----------
function gateView() {
  const arr = [...expected().map(v => ({ at: v.in, v })), ...contractorsToday().filter(p => !onsite(p) && judgePermit(p).tone !== 'bad').map(p => ({ at: atHM((hoursToday() || ['09:00'])[0]), p }))].sort((a, b) => a.at - b.at);
  const ins = inside(), over = ins.filter(v => +v.in + QR_POLICY.validity * 36e5 < clock()), held = G.parcels.filter(p => !p.collected), sos = SOS[tm()] || [];
  return `<h1 tabindex="-1" class="sr-only">Gate</h1>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
    <div class="grid gap-6">
      <section class="panel p-4 sm:p-5" aria-label="Check a visitor">
        <label class="search block"><span class="sr-only">Pass code, plate or name</span>${icon('search')}<input id="find" type="search" class="input h-14 text-[17px]" placeholder="Pass code, car plate or name" autocomplete="off" autocapitalize="characters" enterkeyhint="search"></label>
        <div id="find-res" aria-live="polite"></div>
        <div class="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr]">
          <button type="button" class="btn btn-p btn-xl col-span-2 sm:col-span-1" data-act="scan">${icon('qr_code_scanner')}Scan pass</button>
          <button type="button" class="btn btn-o btn-xl" data-act="walkin">${icon('person_add')}Walk-in</button>
          <button type="button" class="btn btn-o btn-xl" data-act="delivery">${icon('local_shipping')}Delivery</button>
        </div>
      </section>
      <section class="panel" aria-labelledby="arr-h">
        <div class="flex items-center gap-3 px-5 pt-5 pb-3"><h2 id="arr-h" class="text-[18px] font-semibold">Arriving today</h2><span class="count">${arr.length}</span><span class="ml-auto text-[13px] text-muted num">Now ${dTime(clock())}</span></div>
        ${arr.length ? `<ul class="divide-y divide-line border-t border-line">${arr.map(a => a.v ? arrivalRow(a.v) : contractorRow(a.p)).join('')}</ul>` : `<div class="border-t border-line px-6 py-12 text-center"><span class="tile tile-ok mx-auto">${icon('task_alt')}</span><p class="mt-3 font-semibold">Nobody else is expected today</p><p class="mt-1 text-[14px] text-muted">Walk-ins still need the host's OK before you let them in.</p></div>`}
      </section>
    </div>
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
      <a href="#/log" class="panel p-5 flex items-center gap-4 hover:shadow-[0_10px_28px_rgba(61,43,107,.12)] transition-shadow">
        <span class="tile tile-indigo w-12 h-12">${icon('groups')}</span><div class="min-w-0 flex-1"><p class="text-[13px] text-muted">Inside now</p><p class="text-[19px] font-semibold leading-7 num"><span class="whitespace-nowrap">${ins.length} visitors</span> · <span class="whitespace-nowrap">${sum(ONSITE.filter(o => o.taman === tm()), o => o.onSite)} workers</span></p>${over.length ? `<p class="text-[13px] font-semibold text-coral-ink">${over.length} pass${over.length > 1 ? 'es have' : ' has'} run out</p>` : ''}</div>${icon('chevron_right', 'text-muted')}</a>
      <section class="panel p-5" aria-labelledby="call-h">
        <h2 id="call-h" class="text-[16px] font-semibold">Call a unit</h2>
        <label class="search block mt-3"><span class="sr-only">Unit or resident name</span>${icon('search')}<input id="call-q" type="search" class="input h-12 text-[15px]" placeholder="Unit or resident name" autocomplete="off"></label>
        <div id="call-res" class="mt-3"><p class="text-[13.5px] text-muted">Owners and tenants appear here with a call button.</p></div>
      </section>
      ${held.length ? `<section class="panel p-5" aria-labelledby="pcl-h"><h2 id="pcl-h" class="text-[16px] font-semibold">Parcels held here <span class="text-muted font-medium num">${held.length}</span></h2>
        <ul class="mt-2 divide-y divide-line">${held.map(p => `<li class="py-3 flex items-center gap-3"><span class="tile tile-sun w-10 h-10">${icon('inventory_2')}</span><div class="min-w-0 flex-1"><p class="text-[15px] font-semibold leading-5">${un(U(p.unit).name)}</p><p class="text-[12.5px] text-muted">${esc(p.courier)} · ${dTime(p.at)}</p></div><button type="button" class="btn btn-o h-11 px-4 shrink-0" data-act="collected" data-id="${p.id}">Collected</button></li>`).join('')}</ul></section>` : ''}
      <section class="panel p-5" aria-labelledby="sos-h"><div class="flex items-center"><h2 id="sos-h" class="text-[16px] font-semibold">Emergency</h2><button type="button" class="ml-auto text-[13px] font-semibold text-indigo hover:underline" data-act="sos">All numbers</button></div>
        <ul class="mt-2 grid gap-2">${sos.slice(0, 3).map(([l, n]) => `<li><a class="flex items-center gap-3 rounded-2xl bg-paper px-4 min-h-12 py-2.5 hover:bg-cream" href="${telOf(n)}" data-act="call" data-who="${esc(l)}">${icon('call', 'text-bad-ink')}<span class="flex-1 text-[15px] font-medium">${esc(l)}</span><span class="text-[14px] num text-muted whitespace-nowrap">${esc(n)}</span></a></li>`).join('')}</ul></section>
    </div>
  </div>`;
}
const arriveRow = (act, id, time, when, title, sub) => `<li><button type="button" class="w-full flex items-center gap-3 sm:gap-4 px-5 py-3.5 text-left hover:bg-paper" data-act="${act}" data-id="${id}">
  <span class="w-[72px] sm:w-[80px] shrink-0"><span class="block text-[15px] sm:text-[16px] font-semibold num whitespace-nowrap">${time}</span><span class="block text-[12px] text-muted">${when}</span></span>
  <span class="min-w-0 flex-1"><span class="block text-[16px] font-semibold leading-5">${title}</span><span class="block mt-0.5 text-[13.5px] leading-5 text-muted">${sub}</span></span>
  <span class="hidden sm:inline-flex btn btn-t h-12 px-5">Check</span>${icon('chevron_right', 'sm:hidden text-muted')}</button></li>`;
const arrivalRow = v => arriveRow('open-visitor', v.id, dTime(v.in), ago(v.in), esc(v.name), `${esc(v.type)} · <span class="whitespace-nowrap">${esc(U(v.unit).name)}</span>${v.pax > 1 ? ` · ${v.pax} people` : ''}${v.plate ? ` · <span class="num whitespace-nowrap">${esc(v.plate)}</span>` : ''}`);
const contractorRow = p => arriveRow('open-permit', p.id, fmtHM((hoursToday() || ['09:00'])[0]), 'work starts', esc(p.contractor), `Contractor · <span class="whitespace-nowrap">${esc(U(p.unit).name)}</span> · up to ${p.workers} workers`);
function findResults(q) {
  const k = key(q), box = $('#find-res'); if (!box) return;
  if (k.length < 2) { box.innerHTML = ''; return; }
  const exactV = VISITORS.find(v => passCode(v.id) === k.toUpperCase() || key(v.id) === k), exactP = PERMITS.find(p => key(p.id) === k || passCode(p.id) === k.toUpperCase());
  const vis = myVisitors().filter(v => (isToday(v.in) || v.status === 'Inside') && v !== exactV && [v.name, v.host, U(v.unit).name, v.plate].some(s => key(s).includes(k))).slice(0, 5);
  const per = myPermits().filter(p => p !== exactP && ['Approved', 'Work In Progress'].includes(p.status) && [p.contractor, p.id, U(p.unit).name, ...p.plates].some(s => key(s).includes(k))).slice(0, 3);
  const row = (act, id, title, sub, tag, strong) => `<li><button type="button" class="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left ${strong ? 'bg-indigo-tint' : 'hover:bg-paper'}" data-act="${act}" data-id="${id}"><div class="min-w-0 flex-1"><p class="text-[15px] font-semibold truncate">${esc(title)}</p><p class="text-[13px] text-muted truncate">${sub}</p></div>${tag}</button></li>`;
  const items = [
    exactV && row('open-visitor', exactV.id, exactV.name, `Pass ${passCode(exactV.id)} · ${esc(U(exactV.unit).name)}, ${esc(T(exactV.taman).short)}`, chip('Code match', 'indigo'), true),
    exactP && row('open-permit', exactP.id, exactP.contractor, `${exactP.id} · ${esc(U(exactP.unit).name)}, ${esc(T(exactP.taman).short)}`, chip('Code match', 'indigo'), true),
    ...vis.map(v => row('open-visitor', v.id, v.name, `${esc(v.type)} · ${esc(U(v.unit).name)}${v.plate ? ` · ${esc(v.plate)}` : ''}`, chip(v.status === 'Inside' ? 'Inside' : v.status === 'Expected' ? `Expected ${dTime(v.in)}` : v.status, v.status === 'Inside' ? 'indigo' : 'mute'))),
    ...per.map(p => row('open-permit', p.id, p.contractor, `Contractor · ${esc(U(p.unit).name)} · ${esc(p.plates.join(', '))}`, chip('Permit', 'sun'))),
  ].filter(Boolean);
  box.innerHTML = items.length ? `<ul class="mt-3 grid gap-1">${items.join('')}</ul>` : `<div class="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-bad-tint px-4 py-3"><p class="flex-1 min-w-[12rem] text-[14px] text-bad-ink font-medium">No pass, plate or visitor matches “${esc(q)}”.</p><button type="button" class="btn btn-o h-11 px-4" data-act="walkin">${icon('person_add')}Register walk-in</button></div>`;
}
function callResults(q) {
  const k = key(q), box = $('#call-res'); if (!box) return;
  if (k.length < 2) { box.innerHTML = '<p class="text-[13.5px] text-muted">Owners and tenants appear here with a call button.</p>'; return; }
  const us = UNITS.filter(u => u.taman === tm() && (key(u.name).includes(k) || [u.owner, u.tenant].filter(Boolean).some(id => key(pn(id)).includes(k)))).slice(0, 4);
  box.innerHTML = us.length ? `<div class="grid gap-3">${us.map(u => callList(u)).join('')}</div>` : `<p class="text-[13.5px] text-muted">No unit or resident in ${esc(T(tm()).short)} matches “${esc(q)}”.</p>`;
}

// ---------- Visitor verdict ----------
function openVisitor(id) { G.pick = { kind: 'v', id, plate: null, hostOk: null, deny: false, reason: '' }; visitorSheet(); }
function visitorSheet() {
  const p = G.pick, v = VISITORS.find(x => x.id === p.id), j = judgeVisitor(v), u = U(v.unit);
  const needPlate = j.tone === 'ok' && !!v.plate, plateOk = !needPlate || p.plate === 'match' || p.plate === 'foot' || (p.plate === 'diff' && p.hostOk === true);
  const canAdmit = (j.tone === 'ok' && plateOk) || (j.tone === 'sun' && v.status === 'Checked out' && p.hostOk === true);
  const confirmHost = (j.tone === 'sun' && v.status === 'Checked out') || p.plate === 'diff';
  const body = `<div class="sh-body space-y-5">
    <div><p class="text-[24px] leading-8 font-semibold">${esc(v.name)}</p><p class="mt-1 text-[14.5px] text-muted">${esc(v.type)}${v.pax > 1 ? ` · ${v.pax} people` : ''} · pass <span class="num">${passCode(v.id)}</span></p></div>
    <dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-[15px]">
      <div><dt class="text-[12.5px] text-muted">Visiting</dt><dd class="font-semibold">${esc(u.name)}</dd></div><div><dt class="text-[12.5px] text-muted">Host</dt><dd class="font-semibold">${esc(v.host)}</dd></div>
      <div><dt class="text-[12.5px] text-muted">${v.status === 'Expected' ? 'Expected' : 'Pass date'}</dt><dd>${v.status === 'Expected' ? dTime(v.in) : dDay(v.in)}</dd></div><div><dt class="text-[12.5px] text-muted">Car on pass</dt><dd class="num">${esc(v.plate) || 'None'}</dd></div></dl>
    ${needPlate ? `<fieldset class="rounded-2xl bg-paper p-4"><legend class="sr-only">Check the car</legend><p class="text-[15px] font-semibold">Check the car: <span class="num">${esc(v.plate)}</span></p>
      <div class="mt-3 grid grid-cols-3 gap-2">${[['match', 'Plate matches', 'directions_car'], ['foot', 'On foot', 'directions_walk'], ['diff', 'Different car', 'swap_horiz']].map(([k, l, ic]) => `<button type="button" class="choice" data-act="plate" data-v="${k}" aria-pressed="${p.plate === k}" ${k === 'match' ? 'data-autofocus' : ''}>${icon(ic)}${l}</button>`).join('')}</div>
      ${p.plate === 'diff' ? `<p class="mt-3 text-[13.5px] font-semibold text-sun-ink">Call the host to confirm the car before you admit.</p>` : ''}</fieldset>` : ''}
    ${j.tone === 'bad' && v.taman !== tm() ? '' : callList(u, confirmHost ? yesNo('host', p.hostOk) : '')}
    ${p.deny ? denyBox(['Pass expired', 'Host said no', 'Car does not match', 'Wrong taman', 'Unsafe behaviour', 'Other'], p.reason) : ''}
  </div>`;
  const foot = p.deny ? `<button type="button" class="btn btn-o btn-xl" data-act="deny-back">Back</button><button type="button" class="btn btn-d btn-xl" data-act="deny-confirm" ${p.reason ? '' : 'disabled'}>${icon('block')}Confirm refusal</button>`
    : j.tone === 'bad' ? `<button type="button" class="btn btn-o btn-xl" data-act="walkin-from">${icon('person_add')}Register as walk-in</button><button type="button" class="btn btn-d btn-xl" data-act="deny" data-autofocus>${icon('block')}Refuse entry</button>`
    : v.status === 'Inside' ? `<button type="button" class="btn btn-o btn-xl" data-act="close">Close</button><button type="button" class="btn btn-p btn-xl" data-act="checkout" data-id="${v.id}" data-autofocus>${icon('logout')}Check out now</button>`
    : `<button type="button" class="btn btn-o btn-xl" data-act="deny">Refuse</button><button type="button" class="btn btn-ok btn-xl" data-act="admit" ${canAdmit ? 'data-autofocus' : 'disabled'}>${icon('check')}${canAdmit ? `Admit${v.pax > 1 ? ` ${v.pax} people` : ''}` : needPlate && !p.plate ? 'Check the car first' : 'Confirm with host first'}</button>`;
  const focus = $sheet().open ? document.activeElement?.dataset?.act && `[data-act="${document.activeElement.dataset.act}"]${document.activeElement.dataset.v ? `[data-v="${CSS.escape(document.activeElement.dataset.v)}"]` : ''}` : null;
  openSheet(band(p.deny ? { ...j, tone: 'bad', icon: 'block', title: 'Refuse entry', why: `${v.name} will not be let in. The host is told why.` } : j) + body + `<div class="sh-foot">${foot}</div>`, focus);
}
const denyBox = (reasons, cur) => `<fieldset class="rounded-2xl bg-bad-tint p-4"><legend class="sr-only">Reason</legend><p class="text-[15px] font-semibold text-bad-ink">Why are you refusing entry?</p><div class="mt-3 flex flex-wrap gap-2">${reasons.map(r => `<button type="button" class="choice row" data-act="reason" data-v="${esc(r)}" aria-pressed="${cur === r}">${esc(r)}</button>`).join('')}</div></fieldset>`;

// ---------- Contractor verdict ----------
function openPermit(id) { const p = PM(id), j = judgePermit(p), left = p.workers - (onsite(p)?.onSite || 0); G.pick = { kind: 'p', id, n: Math.max(1, Math.min(left, p.workers)), deny: false, reason: j.reason || '' }; permitSheet(); }
function permitSheet() {
  const pk = G.pick, p = PM(pk.id), j = judgePermit(p), on = onsite(p)?.onSite || 0, left = p.workers - on, hrs = hoursToday(), w = WORK_HOURS[tm()];
  const body = `<div class="sh-body space-y-5">
    <div><p class="text-[24px] leading-8 font-semibold">${esc(p.contractor)}</p><p class="mt-1 text-[14.5px] text-muted">${esc(p.category)} · ${esc(U(p.unit).name)} · <span class="num">${p.id}</span></p></div>
    <dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-[15px]">
      <div><dt class="text-[12.5px] text-muted">Allowed today</dt><dd class="font-semibold">${hrs ? `${fmtHM(hrs[0])} – ${fmtHM(hrs[1])}` : 'No work'}</dd></div><div><dt class="text-[12.5px] text-muted">Workers inside</dt><dd class="font-semibold num">${on} of ${p.workers}</dd></div>
      <div><dt class="text-[12.5px] text-muted">Permit dates</dt><dd>${dShort(p.start)} – ${dShort(p.end)}</dd></div><div><dt class="text-[12.5px] text-muted">Vehicles allowed</dt><dd class="num">${esc(p.plates.join(', '))}</dd></div></dl>
    ${j.tone === 'ok' ? `<div class="flex items-center justify-between gap-4 rounded-2xl bg-paper p-4"><div><p class="text-[15px] font-semibold">Workers entering now</p><p class="text-[13px] text-muted">Check each IC or passport against the permit in the app</p></div>
      <div class="flex items-center gap-3"><button type="button" class="stepper" data-act="step" data-d="-1" ${pk.n <= 1 ? 'disabled' : ''} aria-label="One fewer worker">−</button><span class="w-8 text-center text-[26px] font-semibold num" aria-live="polite">${pk.n}</span><button type="button" class="stepper" data-act="step" data-d="1" ${pk.n >= left ? 'disabled' : ''} aria-label="One more worker">+</button></div></div>` : ''}
    ${NOW.getDay() % 6 === 0 && w.quiet && j.tone !== 'bad' ? note('Weekend rule: no hacking or drilling today. Quiet work only.', 'sun', 'volume_off') : ''}
    ${j.tone !== 'ok' ? note(`Site contact: ${esc(p.contact)}. Call the management office if the contractor disputes this.`, 'indigo', 'support_agent') : ''}
    ${pk.deny ? denyBox(['Stop-work order', 'Outside work hours', 'Permit not approved', 'Too many workers', 'Wrong vehicle', 'Blacklisted', 'Other'], pk.reason) : ''}
  </div>`;
  const foot = pk.deny ? `<button type="button" class="btn btn-o btn-xl" data-act="deny-back">Back</button><button type="button" class="btn btn-d btn-xl" data-act="deny-confirm" ${pk.reason ? '' : 'disabled'}>${icon('block')}Confirm refusal</button>`
    : j.tone === 'ok' ? `<button type="button" class="btn btn-o btn-xl" data-act="deny">Refuse</button><button type="button" class="btn btn-ok btn-xl" data-act="admit" data-autofocus>${icon('check')}Check in ${pk.n} worker${pk.n > 1 ? 's' : ''}</button>`
    : `<a class="btn btn-o btn-xl" href="${telOf(T(tm()).phone)}" data-act="call" data-who="Management office">${icon('call')}Call office</a><button type="button" class="btn btn-d btn-xl" data-act="deny" data-autofocus>${icon('block')}Refuse entry</button>`;
  const focus = $sheet().open && document.activeElement?.dataset?.act === 'step' ? `[data-act="step"][data-d="${document.activeElement.dataset.d}"]` : null;
  openSheet(band(pk.deny ? { tone: 'bad', icon: 'block', title: 'Refuse entry', why: `${p.contractor} will not be let in. Management is told why.` } : j) + body + `<div class="sh-foot">${foot}</div>`, focus);
}
function checkoutWorkers(id) {
  const p = PM(id), o = onsite(p); if (!o) return;
  G.pick = { kind: 'out', id, n: o.onSite };
  const draw = () => openSheet(`<div class="band band-neutral">${icon('logout', 'big')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[24px] font-bold">Workers leaving</h2><p class="mt-1 text-[15px] text-lav">${esc(p.contractor)} · ${esc(U(p.unit).name)}</p></div>${closeBtn}</div>
    <div class="sh-body"><div class="flex items-center justify-between gap-4 rounded-2xl bg-paper p-4"><div><p class="text-[15px] font-semibold">How many are leaving?</p><p class="text-[13px] text-muted">${o.onSite} inside now</p></div>
    <div class="flex items-center gap-3"><button type="button" class="stepper" data-act="out-step" data-d="-1" ${G.pick.n <= 1 ? 'disabled' : ''} aria-label="One fewer">−</button><span class="w-8 text-center text-[26px] font-semibold num">${G.pick.n}</span><button type="button" class="stepper" data-act="out-step" data-d="1" ${G.pick.n >= o.onSite ? 'disabled' : ''} aria-label="One more">+</button></div></div></div>
    <div class="sh-foot"><button type="button" class="btn btn-o btn-xl" data-act="close">Cancel</button><button type="button" class="btn btn-p btn-xl" data-act="out-confirm" data-autofocus>${icon('logout')}Check out ${G.pick.n}</button></div>`);
  G.drawOut = draw; draw();
}

// ---------- Walk-in and delivery ----------
const unitList = () => `<datalist id="units-here">${UNITS.filter(u => u.taman === tm()).map(u => `<option value="${esc(u.name)}">`).join('')}</datalist>`;
function walkin(prefill = {}) {
  clearTimeout(G.askTimer);
  G.reg = { name: prefill.name || '', purpose: 'Guest', unit: prefill.unit || null, pax: 1, plate: prefill.plate || '', ask: null, hostOk: null, deny: false, reason: '' };
  openSheet(`<div class="band band-neutral">${icon('person_add', 'big')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[24px] font-bold">Register a walk-in</h2><p class="mt-1 text-[15px] text-lav">No pass? Get the host's OK before you let them in.</p></div>${closeBtn}</div>
    <form id="reg" class="sh-body space-y-5" novalidate autocomplete="off">
      ${field('Visitor’s name', `<input id="reg-name" name="name" class="input h-12 text-[16px]" value="${esc(G.reg.name)}" required><p class="err" data-err="name"></p>`, '', 'reg-name')}
      <fieldset><legend class="text-[13px] font-medium mb-1.5">Here for</legend><div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${[['Guest', 'person'], ['Delivery', 'local_shipping'], ['E-hailing', 'local_taxi'], ['Service', 'handyman']].map(([k, ic]) => `<label class="choice relative"><input type="radio" name="purpose" value="${k}" ${k === G.reg.purpose ? 'checked' : ''}>${icon(ic)}${k}</label>`).join('')}</div></fieldset>
      ${field('Unit to visit', `<input id="reg-unit" name="unit" class="input h-12 text-[16px]" list="units-here" placeholder="e.g. No. 12, Jalan Harmoni 3" value="${esc(G.reg.unit ? U(G.reg.unit).name : '')}" required>${unitList()}<p class="err" data-err="unit"></p>`, 'Pick from the list so the right people are asked.', 'reg-unit')}
      <div class="grid grid-cols-2 gap-4">
        ${field('People', `<div class="flex items-center gap-3 h-12" role="group" aria-label="People"><button type="button" class="stepper" data-act="pax" data-d="-1" aria-label="One fewer person">−</button><span id="pax" class="w-8 text-center text-[22px] font-semibold num">1</span><button type="button" class="stepper" data-act="pax" data-d="1" aria-label="One more person">+</button></div>`)}
        ${field('Car plate', `<input id="reg-plate" name="plate" class="input h-12 text-[16px] uppercase num" placeholder="None if on foot" value="${esc(G.reg.plate)}">`, '', 'reg-plate')}
      </div>
      ${QR_POLICY.ic ? field('IC or passport, last 4 digits', '<input id="reg-ic" name="ic" class="input h-12 text-[16px] num" inputmode="numeric" maxlength="4">', '', 'reg-ic') : ''}
      <div id="reg-host"></div>
    </form>
    <div class="sh-foot" id="reg-foot"></div>`, '#reg-name');
  regRefresh();
}
function regRefresh() {
  const f = $('#reg'); if (!f || !G.reg) return;
  const r = G.reg, d = new FormData(f);
  r.name = String(d.get('name') || '').trim(); r.purpose = d.get('purpose'); r.plate = String(d.get('plate') || '').trim().toUpperCase();
  const u = unitByName(d.get('unit') || ''); if ((u?.id || null) !== r.unit) { r.unit = u?.id || null; r.ask = null; r.hostOk = null; clearTimeout(G.askTimer); }
  const host = u && residents(u)[0];
  // Only touch the DOM when something changed: redrawing under a pointer swallows the click the guard is making
  const paint = (sel, html) => { const el = $(sel); if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } };
  paint('#reg-host', !u ? note('Pick the unit to see who lives there and ask them.', 'indigo', 'home') : `
    <div class="grid gap-3">
      <div class="flex flex-wrap items-center gap-3 rounded-2xl bg-paper p-4"><div class="min-w-0 flex-1"><p class="text-[15px] font-semibold">Ask in the app</p><p class="text-[13px] text-muted">${esc(host.name)} gets a request and taps Allow or Refuse.</p></div>
        ${r.ask === 'waiting' ? `<span class="flex items-center gap-2 text-[14px] font-semibold text-indigo"><span class="spin"></span>Waiting…</span>` : r.ask === 'yes' ? chip('Allowed in the app', 'ok') : `<button type="button" class="btn btn-t h-12 px-4" data-act="ask">${icon('notifications_active')}Send request</button>`}</div>
      ${callList(u, yesNo('reg-host', r.hostOk))}
      ${r.ask === 'yes' ? note(`${esc(host.name)} allowed this visit in the app at ${dTime(r.askAt)}.`, 'ok', 'check_circle') : r.hostOk === true ? note('Host confirmed by phone.', 'ok', 'check_circle') : r.hostOk === false ? note('Host said no. Refuse entry.', 'bad', 'block') : ''}
      ${r.deny ? denyBox(['Host said no', 'Host not reachable', 'No ID shown', 'Unsafe behaviour', 'Other'], r.reason) : ''}
    </div>`);
  const ok = r.ask === 'yes' || r.hostOk === true;
  paint('#reg-foot', r.deny ? `<button type="button" class="btn btn-o btn-xl" data-act="deny-back">Back</button><button type="button" class="btn btn-d btn-xl" data-act="deny-confirm" ${r.reason ? '' : 'disabled'}>${icon('block')}Confirm refusal</button>`
    : `<button type="button" class="btn btn-o btn-xl" data-act="deny">Refuse</button><button type="button" class="btn btn-ok btn-xl" data-act="admit" ${ok && r.hostOk !== false ? '' : 'disabled'}>${icon('check')}${ok && r.hostOk !== false ? `Admit${r.pax > 1 ? ` ${r.pax} people` : ''}` : 'Waiting for the host'}</button>`);
}
function delivery() {
  openSheet(`<div class="band band-neutral">${icon('local_shipping', 'big')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[24px] font-bold">Delivery</h2><p class="mt-1 text-[15px] text-lav">Hold the parcel here, or let the rider in for ${QR_POLICY.delivery} minutes.</p></div>${closeBtn}</div>
    <form id="dlv" class="sh-body space-y-5" novalidate autocomplete="off">
      <fieldset><legend class="text-[13px] font-medium mb-1.5">From</legend><div class="flex flex-wrap gap-2">${COURIERS.map((c, i) => `<label class="choice row relative"><input type="radio" name="courier" value="${esc(c)}" ${i === 0 ? 'checked' : ''}>${esc(c)}</label>`).join('')}</div></fieldset>
      ${field('Unit', `<input id="dlv-unit" name="unit" class="input h-12 text-[16px]" list="units-here" placeholder="e.g. No. 12, Jalan Harmoni 3" required data-autofocus>${unitList()}<p class="err" data-err="unit"></p>`, '', 'dlv-unit')}
      <fieldset><legend class="text-[13px] font-medium mb-1.5">What happens</legend><div class="grid sm:grid-cols-2 gap-2">
        <label class="choice relative"><input type="radio" name="mode" value="hold" checked>${icon('inventory_2')}Hold parcel at the guardhouse</label>
        <label class="choice relative"><input type="radio" name="mode" value="in">${icon('two_wheeler')}Let the rider in (${QR_POLICY.delivery} min)</label></div></fieldset>
      ${field('Plate', '<input id="dlv-plate" name="plate" class="input h-12 text-[16px] uppercase num" placeholder="Rider’s motorbike or van">', 'Optional when you hold the parcel.', 'dlv-plate')}
    </form>
    <div class="sh-foot"><button type="button" class="btn btn-o btn-xl" data-act="close">Cancel</button><button type="button" class="btn btn-p btn-xl" data-act="delivery-save">${icon('check')}Save</button></div>`);
}

// ---------- Log ----------
function todayLog() {
  const ev = [];
  for (const v of myVisitors()) {
    if (isToday(v.in) && ['Inside', 'Checked out', 'Overstayed'].includes(v.status)) ev.push({ at: v.in, kind: 'in', text: `${v.name} in`, sub: `${v.type} · ${U(v.unit).name}${v.plate ? ` · ${v.plate}` : ''}`, who: v.guard });
    if (v.out && isToday(v.out) && v.out <= clock()) ev.push({ at: v.out, kind: 'out', text: `${v.name} out`, sub: U(v.unit).name, who: v.guard });
    if (v.status === 'Denied' && isToday(v.in)) ev.push({ at: v.in, kind: 'deny', text: `${v.name} refused`, sub: v.denyReason, who: v.guard });
  }
  return [...ev, ...G.events].filter(e => e.at <= clock()).sort((a, b) => b.at - a.at);
}
const KIND = { in: ['login', 'tile-ok', 'In'], out: ['logout', 'tile-indigo', 'Out'], deny: ['block', 'tile-bad', 'Refused'], work: ['construction', 'tile-sun', 'Contractor'], parcel: ['inventory_2', 'tile-sun', 'Parcel'], call: ['call', 'tile-indigo', 'Call'], request: ['notifications_active', 'tile-indigo', 'Request'], note: ['edit_note', 'tile-indigo', 'Note'], incident: ['report', 'tile-bad', 'Incident'], sos: ['emergency', 'tile-bad', 'SOS'] };
function logView() {
  const ins = inside(), all = todayLog(), tab = G.logTab, kinds = [['all', 'All'], ['in', 'In'], ['out', 'Out'], ['deny', 'Refused'], ['other', 'Other']];
  const list = all.filter(e => G.logKind === 'all' || (G.logKind === 'other' ? !['in', 'out', 'deny'].includes(e.kind) : e.kind === G.logKind));
  return h1('Log', `${esc(T(tm()).name)} · ${esc(G.st.gate)} · ${dDay(NOW)}`)
    + `<div class="seg mb-5" role="tablist" aria-label="Log">${[['inside', `Inside now`, ins.length], ['today', 'Today', all.length]].map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-act="log-tab" data-v="${k}">${l} <span class="n">${n}</span></button>`).join('')}</div>`
    + (tab === 'inside' ? `<section class="panel">${ins.length ? `<ul class="divide-y divide-line">${ins.map(v => { const end = +v.in + QR_POLICY.validity * 36e5, over = end < clock(); return `<li class="grid gap-3 px-5 py-4 sm:flex sm:items-center sm:gap-4">
        <div class="min-w-0 flex-1"><p class="text-[16px] font-semibold truncate">${esc(v.name)}${v.pax > 1 ? ` <span class="text-muted font-medium">+${v.pax - 1}</span>` : ''}</p><p class="text-[13.5px] text-muted truncate">${esc(v.type)} · ${esc(U(v.unit).name)}${v.plate ? ` · <span class="num">${esc(v.plate)}</span>` : ''}</p></div>
        <div class="text-[13.5px] num"><p>In ${dTime(v.in)} · ${mins(clock() - v.in)}</p><p class="${over ? 'font-semibold text-coral-ink' : 'text-muted'}">${over ? `Pass ran out ${mins(clock() - end)} ago` : `Pass valid until ${dTime(new Date(end))}`}</p></div>
        <button type="button" class="btn btn-o h-12 px-5 w-full sm:w-auto" data-act="checkout" data-id="${v.id}">${icon('logout')}Check out</button></li>`; }).join('')}</ul>` : `<p class="px-6 py-12 text-center text-[15px] text-muted">Nobody is inside on a visitor pass right now.</p>`}</section>`
    : `<div class="flex gap-2 mb-4 overflow-x-auto no-sb">${kinds.map(([k, l]) => `<button type="button" class="choice row shrink-0" data-act="log-kind" data-v="${k}" aria-pressed="${G.logKind === k}">${l}</button>`).join('')}</div>
      <section class="panel">${list.length ? `<ol class="divide-y divide-line">${list.map(e => { const [ic, tile, lab] = KIND[e.kind] || KIND.note; return `<li class="flex items-center gap-4 px-5 py-3.5"><span class="w-[68px] shrink-0 text-[14px] font-semibold num">${dTime(e.at)}</span><span class="tile ${tile} w-10 h-10" aria-label="${lab}">${icon(ic)}</span><div class="min-w-0 flex-1"><p class="text-[15px] font-semibold truncate">${esc(e.text)}</p><p class="text-[13px] text-muted truncate">${esc(e.sub || '')}${e.who ? ` · ${esc(e.who)}` : ''}</p></div></li>`; }).join('')}</ol>` : `<p class="px-6 py-12 text-center text-[15px] text-muted">Nothing logged here yet today.</p>`}</section>`);
}

// ---------- Permits ----------
function permitsView() {
  const ps = contractorsToday(), hrs = hoursToday(), w = WORK_HOURS[tm()];
  const blocked = myPermits().filter(p => !ps.includes(p) && (['Pending Deposit', 'Approved', 'Inspection Scheduled'].includes(p.status) || p.stopped)).slice(0, 6);
  return h1('Contractors today', hrs ? `Allowed ${fmtHM(hrs[0])} – ${fmtHM(hrs[1])}${NOW.getDay() % 6 === 0 && w.quiet ? ' · no hacking or drilling on weekends' : ''}` : 'No contractor work today')
    + `<section class="panel">${ps.length ? `<ul class="divide-y divide-line">${ps.map(p => { const o = onsite(p), j = judgePermit(p); return `<li class="px-5 py-4 grid gap-3 sm:flex sm:items-center sm:gap-4">
      <div class="min-w-0 flex-1"><div class="flex items-center gap-2 flex-wrap"><p class="text-[16px] font-semibold">${esc(p.contractor)}</p>${j.tone === 'bad' ? chip(j.title, 'bad') : o ? chip(`${o.onSite} of ${p.workers} inside`, o.onSite > p.workers ? 'coral' : 'indigo') : chip('Not in yet', 'mute')}</div>
        <p class="text-[13.5px] text-muted">${esc(p.category)} · ${esc(U(p.unit).name)} · <span class="num">${p.id}</span> · <span class="num">${esc(p.plates.join(', '))}</span></p>${o?.note ? `<p class="mt-1 text-[13px] font-semibold text-sun-ink">${esc(o.note)}</p>` : ''}</div>
      <div class="flex flex-wrap gap-2"><button type="button" class="btn btn-t h-12 px-4" data-act="open-permit" data-id="${p.id}">${icon('login')}Check in</button>${o ? `<button type="button" class="btn btn-o h-12 px-4" data-act="work-out" data-id="${p.id}">${icon('logout')}Check out</button>` : ''}<button type="button" class="btn btn-g h-12 px-3" data-act="report" data-id="${p.id}">${icon('report')}Report</button></div></li>`; }).join('')}</ul>` : `<p class="px-6 py-12 text-center text-[15px] text-muted">No contractor permits are active today.</p>`}</section>`
    + (blocked.length ? `<h2 class="mt-8 mb-3 text-[16px] font-semibold">Do not admit today</h2><section class="panel"><ul class="divide-y divide-line">${blocked.map(p => { const j = judgePermit(p); return `<li class="flex items-center gap-4 px-5 py-3.5"><span class="tile tile-bad w-10 h-10">${icon(j.icon)}</span><div class="min-w-0 flex-1"><p class="text-[15px] font-semibold truncate">${esc(p.contractor)}</p><p class="text-[13px] text-muted truncate">${esc(j.title)} · ${esc(U(p.unit).name)}</p></div><button type="button" class="btn btn-g h-12 px-3" data-act="open-permit" data-id="${p.id}">Why</button></li>`; }).join('')}</ul></section>` : '');
}

// ---------- Me ----------
function meView() {
  const g = G.guard, s = G.stats, notes = SHIFT_NOTES.filter(n => n.taman === tm()).slice(0, 6), sos = SOS[tm()] || [];
  return h1(esc(g.name), `On duty at ${esc(G.st.gate)}, ${esc(T(tm()).short)}${g.post !== G.st.gate ? ` (rostered at ${esc(g.post)})` : ''} · ${esc(g.company)} · ${SHIFT[g.rota[DOW]].join(', ')}`)
    + `<div class="grid gap-6 lg:grid-cols-2 items-start">
      <section class="panel p-5" aria-labelledby="sh-h"><h2 id="sh-h" class="text-[16px] font-semibold">This shift</h2>
        <dl class="mt-3 grid grid-cols-5 divide-x divide-line border-y border-line">${[['In', s.in], ['Out', s.out], ['Refused', s.deny], ['Walk-ins', s.walkin], ['Workers', s.work]].map(([k, v]) => `<div class="flex flex-col-reverse items-center py-3 px-1"><dt class="text-[12px] text-muted whitespace-nowrap">${k}</dt><dd class="text-[24px] leading-8 font-semibold num">${v}</dd></div>`).join('')}</dl>
        <div class="mt-5 flex flex-wrap gap-2"><button type="button" class="btn btn-o h-12 px-4" data-act="incident">${icon('report')}Report an incident</button><button type="button" class="btn btn-p h-12 px-4" data-act="end-shift">${icon('logout')}End shift</button></div></section>
      <section class="panel p-5" aria-labelledby="em-h"><h2 id="em-h" class="text-[16px] font-semibold">Emergency numbers</h2>
        <ul class="mt-3 grid gap-2">${[...sos, [`Taman manager, ${T(tm()).manager}`, T(tm()).phone]].map(([l, n]) => `<li><a class="flex items-center gap-3 rounded-2xl bg-paper px-4 min-h-12 py-2.5 hover:bg-cream" href="${telOf(n)}" data-act="call" data-who="${esc(l)}">${icon('call', 'text-bad-ink')}<span class="flex-1 text-[15px] font-medium">${esc(l)}</span><span class="text-[14px] num text-muted whitespace-nowrap">${esc(n)}</span></a></li>`).join('')}</ul></section>
      <section class="panel p-5 lg:col-span-2" aria-labelledby="hn-h"><h2 id="hn-h" class="text-[16px] font-semibold">Handover notes</h2><p class="mt-1 text-[13.5px] text-muted">The next guard and management read these.</p>
        <form id="note-f" class="mt-4 flex flex-col sm:flex-row gap-2" novalidate><label class="sr-only" for="note-t">New note</label><textarea id="note-t" class="input flex-1 min-h-[56px] text-[15px]" rows="2" placeholder="What does the next shift need to know?"></textarea><button type="submit" class="btn btn-p btn-xl sm:self-start">${icon('send')}Post</button></form>
        <ul class="mt-4 divide-y divide-line">${notes.map(n => `<li class="py-3"><p class="text-[15px] leading-6">${esc(n.text)}</p><p class="mt-0.5 text-[12.5px] text-muted">${esc(n.guard)} · ${dShort(n.at)}, ${dTime(n.at)}</p></li>`).join('') || '<li class="py-4 text-[14px] text-muted">No notes yet.</li>'}</ul></section>
    </div>`;
}
const VIEWS = { gate: gateView, log: logView, permits: permitsView, me: meView };

// ---------- Scan and other sheets ----------
function scanSheet() {
  const t = tm(), mine = myVisitors(), ct = contractorsToday();
  const demos = [
    ['Guest pass', expected().find(v => !v.plate) || expected()[0]], ['Guest pass with a car', expected().find(v => v.plate)],
    ['Visitor already inside', inside()[0]], ['Old pass from another day', mine.find(v => !isToday(v.in) && v.status === 'Checked out')],
    ['Pass for another taman', VISITORS.find(v => v.taman !== t && v.status === 'Expected')],
  ].filter(d => d[1]).map(([l, v]) => [l, `${v.name} · ${U(v.unit).name}`, 'open-visitor', v.id])
    .concat([['Contractor pass', ct.find(p => judgePermit(p).tone === 'ok')], ['Contractor at the worker limit', ct.find(p => judgePermit(p).tone === 'sun')], ['Contractor, permit not active', myPermits().find(p => judgePermit(p).tone === 'bad')]]
      .filter(d => d[1]).map(([l, p]) => [l, `${p.contractor} · ${p.id}`, 'open-permit', p.id]));
  openSheet(`<div class="band band-neutral">${icon('qr_code_scanner', 'big')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[24px] font-bold">Scan a pass</h2><p class="mt-1 text-[15px] text-lav">Hold the resident's QR inside the frame.</p></div>${closeBtn}</div>
    <div class="sh-body space-y-5">
      <div><div class="viewfinder" role="img" aria-label="Camera viewfinder"></div><p class="mt-2 text-center text-[13px] text-muted">The camera opens here on the gate tablet. In this prototype, pick a pass below.</p></div>
      <div><p class="text-[13px] font-medium text-muted mb-2">Simulate a scan</p><ul class="grid gap-2 sm:grid-cols-2">${demos.map(([l, s, act, id], i) => `<li><button type="button" class="w-full rounded-2xl bg-paper px-4 py-3 text-left hover:bg-cream min-h-[64px]" data-act="${act}" data-id="${id}" ${i === 0 ? 'data-autofocus' : ''}><span class="block text-[14.5px] font-semibold">${l}</span><span class="block text-[12.5px] text-muted truncate">${esc(s)}</span></button></li>`).join('')}</ul></div>
      <p class="text-[13.5px] text-muted">No QR? Type the 6-letter code from the resident's app in the search box on the Gate screen.</p>
    </div>`);
}
function sosSheet() {
  const sos = SOS[tm()] || [];
  openSheet(`<div class="band band-bad">${icon('emergency', 'big fill')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[26px] font-bold">Emergency</h2><p class="mt-1 text-[15px] opacity-90">Call first. Then alert management so they can help.</p></div>${closeBtn}</div>
    <div class="sh-body space-y-2">${[...sos, [`Taman manager, ${T(tm()).manager}`, T(tm()).phone]].map(([l, n], i) => `<a class="flex items-center gap-4 rounded-2xl bg-paper px-4 min-h-[60px] py-3 hover:bg-cream" href="${telOf(n)}" data-act="call" data-who="${esc(l)}" ${i === 0 ? 'data-autofocus' : ''}><span class="tile tile-bad w-11 h-11">${icon('call')}</span><span class="flex-1 text-[16px] font-semibold">${esc(l)}</span><span class="text-[16px] num font-semibold whitespace-nowrap">${esc(n)}</span></a>`).join('')}</div>
    <div class="sh-foot"><button type="button" class="btn btn-d btn-xl" data-act="alert-mgmt">${icon('notifications_active')}Alert management now</button></div>`);
}
function incidentSheet(permitId) {
  const p = permitId && PM(permitId);
  openSheet(`<div class="band band-neutral">${icon('report', 'big')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[24px] font-bold">${p ? 'Report a contractor' : 'Report an incident'}</h2><p class="mt-1 text-[15px] text-lav">${p ? `${esc(p.contractor)} · ${esc(U(p.unit).name)}` : 'Management sees it straight away.'}</p></div>${closeBtn}</div>
    <form id="inc" class="sh-body space-y-5" novalidate data-permit="${p ? p.id : ''}">
      <fieldset><legend class="text-[13px] font-medium mb-1.5">What happened</legend><div class="flex flex-wrap gap-2">${(p ? ['Hacking on a weekend', 'Too many workers', 'Wrong vehicle', 'Debris left outside', 'Working outside hours', 'Other'] : ['Suspicious person', 'Tailgating', 'Vehicle damage', 'Noise', 'Gate or boom barrier fault', 'Fire alarm', 'Other']).map((c, i) => `<label class="choice row relative"><input type="radio" name="cat" value="${esc(c)}" ${i === 0 ? 'checked' : ''}>${esc(c)}</label>`).join('')}</div></fieldset>
      <fieldset><legend class="text-[13px] font-medium mb-1.5">How serious</legend><div class="grid grid-cols-3 gap-2">${[['Low', 'Log only'], ['Medium', 'Needs follow-up'], ['High', 'Call the manager now']].map(([k, d], i) => `<label class="choice relative"><input type="radio" name="sev" value="${k}" ${i === 1 ? 'checked' : ''}><span>${k}</span><span class="text-[11.5px] font-medium opacity-75">${d}</span></label>`).join('')}</div></fieldset>
      ${field('Where', `<input id="inc-where" name="where" class="input h-12 text-[16px]" value="${esc(p ? U(p.unit).name : G.st.gate)}">`, '', 'inc-where')}
      ${field('Details', '<textarea id="inc-details" name="details" class="input text-[15px]" rows="3" placeholder="What you saw, who was involved, what you did"></textarea><p class="err" data-err="details"></p>', '', 'inc-details')}
    </form>
    <div class="sh-foot"><button type="button" class="btn btn-o btn-xl" data-act="close">Cancel</button><button type="button" class="btn btn-p btn-xl" data-act="incident-save">${icon('send')}Send report</button></div>`);
}
function endShiftSheet() {
  const s = G.stats;
  openSheet(`<div class="band band-neutral">${icon('logout', 'big')}<div class="min-w-0 flex-1"><h2 id="sh-title" class="text-[24px] font-bold">End your shift</h2><p class="mt-1 text-[15px] text-lav">${s.in} admitted · ${s.out} checked out · ${s.deny} refused · ${s.work} workers in</p></div>${closeBtn}</div>
    <div class="sh-body space-y-4">${inside().length ? note(`${inside().length} visitor${inside().length > 1 ? 's are' : ' is'} still inside. The next guard sees them in the Log.`, 'sun', 'groups') : ''}
      ${field('Handover note (optional)', '<textarea id="end-note" class="input text-[15px]" rows="3" placeholder="Anything the next guard should know" data-autofocus></textarea>', '', 'end-note')}</div>
    <div class="sh-foot"><button type="button" class="btn btn-o btn-xl" data-act="close">Not yet</button><button type="button" class="btn btn-p btn-xl" data-act="end-confirm">${icon('logout')}End shift and sign out</button></div>`);
}

// ---------- Actions ----------
const ACT = {
  close: closeSheet,
  who: el => { G.who = el.dataset.id; G.pin = ''; signin(); $('[data-act="key"]')?.focus(); },
  'who-back': () => { G.who = null; G.pin = ''; signin(); },
  key: el => pinKey(el.dataset.k),
  scan: scanSheet, sos: sosSheet, walkin: () => walkin(), delivery,
  'open-visitor': el => openVisitor(el.dataset.id),
  'open-permit': el => openPermit(el.dataset.id),
  plate: el => { G.pick.plate = el.dataset.v; if (el.dataset.v !== 'diff') G.pick.hostOk = null; visitorSheet(); },
  host: el => { G.pick.hostOk = el.dataset.v === 'yes'; if (!G.pick.hostOk) { G.pick.deny = true; G.pick.reason = 'Host said no'; } visitorSheet(); },
  deny: () => { const pk = G.reg || G.pick; pk.deny = true; if (G.reg) { if (G.reg.hostOk === false) G.reg.reason = 'Host said no'; regRefresh(); } else { if (!pk.reason) pk.reason = (pk.kind === 'v' ? judgeVisitor(VISITORS.find(v => v.id === pk.id)) : judgePermit(PM(pk.id))).reason || ''; pk.kind === 'v' ? visitorSheet() : permitSheet(); } },
  'deny-back': () => { const pk = G.reg || G.pick; pk.deny = false; G.reg ? regRefresh() : pk.kind === 'v' ? visitorSheet() : permitSheet(); },
  reason: el => { const pk = G.reg || G.pick; pk.reason = el.dataset.v; G.reg ? regRefresh() : pk.kind === 'v' ? visitorSheet() : permitSheet(); },
  'deny-confirm': () => {
    const pk = G.reg || G.pick, why = pk.reason;
    if (G.reg) { logEvent('deny', `${G.reg.name || 'Walk-in visitor'} refused`, `${why}${G.reg.unit ? ` · ${U(G.reg.unit).name}` : ''}`); }
    else if (pk.kind === 'v') { const v = VISITORS.find(x => x.id === pk.id); if (v.taman === tm()) { v.status = 'Denied'; v.denyReason = why; v.in = clock(); v.gate = G.st.gate; v.guard = G.guard.name; } else logEvent('deny', `${v.name} refused`, why); }
    else { const p = PM(pk.id); logEvent('deny', `${p.contractor} refused`, `${why} · ${p.id}`); }
    G.stats.deny++; closeSheet(); render(); toast(`Entry refused: ${esc(why.toLowerCase())}. Logged${G.reg ? '' : ' and the host is told'}.`);
  },
  admit: () => {
    if (G.reg) {
      const r = G.reg; regRefresh();
      if (!r.name) return showErr('name', 'Write the visitor’s name.');
      const u = U(r.unit);
      VISITORS.unshift({ id: 'VIS-' + (21500 + VISITORS.length), taman: tm(), unit: u.id, host: residents(u)[0].name, type: r.purpose, name: r.name, plate: r.plate, pax: r.pax, gate: G.st.gate, guard: G.guard.name, status: 'Inside', via: r.ask === 'yes' ? 'Walk-in, allowed in the app' : 'Walk-in, host confirmed by phone', in: clock(), out: null, denyReason: '' });
      G.stats.in++; G.stats.walkin++; closeSheet(); render(); toast(`${esc(r.name)} admitted to ${esc(u.name)} at ${dTime(clock())}`); return;
    }
    const pk = G.pick;
    if (pk.kind === 'v') { const v = VISITORS.find(x => x.id === pk.id); Object.assign(v, { status: 'Inside', in: clock(), gate: G.st.gate, guard: G.guard.name }); G.stats.in++; closeSheet(); render(); toast(`${esc(v.name)} admitted at ${dTime(v.in)}`); return; }
    const p = PM(pk.id), o = onsite(p);
    if (o) o.onSite += pk.n; else ONSITE.push({ permit: p.id, taman: p.taman, in: clock(), onSite: pk.n, guard: G.guard.name, note: '' });
    if (p.status === 'Approved') p.status = 'Work In Progress';
    logEvent('work', `${p.contractor}: ${pk.n} worker${pk.n > 1 ? 's' : ''} in`, `${p.id} · ${U(p.unit).name}`); G.stats.work += pk.n;
    closeSheet(); render(); toast(`${pk.n} worker${pk.n > 1 ? 's' : ''} from ${esc(p.contractor)} checked in`);
  },
  step: el => { const p = PM(G.pick.id), left = p.workers - (onsite(p)?.onSite || 0); G.pick.n = Math.min(left, Math.max(1, G.pick.n + +el.dataset.d)); permitSheet(); },
  pax: el => { G.reg.pax = Math.min(10, Math.max(1, G.reg.pax + +el.dataset.d)); $('#pax').textContent = G.reg.pax; regRefresh(); },
  ask: () => {
    const r = G.reg, u = U(r.unit), host = residents(u)[0]; r.ask = 'waiting'; regRefresh();
    logEvent('request', `Asked ${host.name} in the app`, `${r.name || 'Walk-in'} · ${u.name}`);
    clearTimeout(G.askTimer);
    G.askTimer = setTimeout(() => { if (G.reg === r && r.ask === 'waiting') { r.ask = 'yes'; r.askAt = clock(); regRefresh(); toast(`${esc(host.name)} allowed the visit`); } }, 2400); // ponytail: simulated resident reply; the real app pushes the answer back
  },
  'reg-host': el => { G.reg.hostOk = el.dataset.v === 'yes'; if (!G.reg.hostOk) { G.reg.deny = true; G.reg.reason = 'Host said no'; } regRefresh(); },
  'walkin-from': () => { const v = VISITORS.find(x => x.id === G.pick.id); const keep = { name: v.name, plate: v.plate, unit: v.taman === tm() ? v.unit : null }; closeSheet(); walkin(keep); },
  checkout: el => { const v = VISITORS.find(x => x.id === el.dataset.id); v.status = 'Checked out'; v.out = clock(); G.stats.out++; closeSheet(); render(); toast(`${esc(v.name)} checked out at ${dTime(v.out)}`); },
  'work-out': el => checkoutWorkers(el.dataset.id),
  'out-step': el => { const o = onsite(PM(G.pick.id)); G.pick.n = Math.min(o.onSite, Math.max(1, G.pick.n + +el.dataset.d)); G.drawOut(); },
  'out-confirm': () => { const p = PM(G.pick.id), o = onsite(p), n = G.pick.n; o.onSite -= n; if (o.onSite <= 0) ONSITE.splice(ONSITE.indexOf(o), 1); logEvent('out', `${p.contractor}: ${n} worker${n > 1 ? 's' : ''} out`, p.id); closeSheet(); render(); toast(`${n} worker${n > 1 ? 's' : ''} checked out`); },
  report: el => incidentSheet(el.dataset.id),
  incident: () => incidentSheet(),
  'incident-save': () => {
    const f = $('#inc'), d = new FormData(f), details = String(d.get('details') || '').trim(), p = f.dataset.permit && PM(f.dataset.permit);
    if (!details && d.get('cat') === 'Other') return showErr('details', 'Say what happened.');
    INCIDENTS.unshift({ id: 'INC-0' + (200 + INCIDENTS.length), title: p ? `${d.get('cat')}: ${p.contractor}` : d.get('cat'), cat: p ? 'Contractor' : d.get('cat'), sev: d.get('sev'), status: 'Open', taman: tm(), at: clock(), where: d.get('where'), by: G.guard.name, updates: details ? [{ at: clock(), text: details, who: G.guard.name }] : [] });
    logEvent('incident', p ? `Reported ${p.contractor}` : `Incident: ${d.get('cat')}`, `${d.get('sev')} · ${d.get('where')}`);
    closeSheet(); render(); toast(d.get('sev') === 'High' ? `Report sent. ${esc(T(tm()).manager)} has been alerted.` : 'Report sent to management');
  },
  'delivery-save': () => {
    const f = $('#dlv'), d = new FormData(f), u = unitByName(d.get('unit') || '');
    if (!u) return showErr('unit', 'Pick the unit from the list.');
    const c = d.get('courier'), plate = String(d.get('plate') || '').trim().toUpperCase();
    if (d.get('mode') === 'hold') { G.parcels.unshift({ id: 'PCL-' + (320 + G.parcels.length), unit: u.id, courier: c, at: clock(), collected: false }); logEvent('parcel', `Parcel held for ${u.name}`, c); closeSheet(); render(); toast(`Parcel logged. ${esc(residents(u)[0].name)} has been told it's at the guardhouse.`); return; }
    VISITORS.unshift({ id: 'VIS-' + (21500 + VISITORS.length), taman: tm(), unit: u.id, host: residents(u)[0].name, type: 'Delivery', name: c, plate, pax: 1, gate: G.st.gate, guard: G.guard.name, status: 'Inside', via: 'Delivery, let in by guard', in: clock(), out: null, denyReason: '' });
    G.stats.in++; closeSheet(); render(); toast(`Rider let in until ${dTime(new Date(+clock() + QR_POLICY.delivery * 6e4))}`);
  },
  collected: el => { const p = G.parcels.find(x => x.id === el.dataset.id); p.collected = true; logEvent('parcel', `Parcel collected · ${U(p.unit).name}`, p.courier); render(); toast('Parcel marked as collected'); },
  call: el => logEvent('call', `Called ${el.dataset.who}`, el.dataset.unit || ''),
  'alert-mgmt': () => { logEvent('sos', 'Alerted management', `${G.st.gate} · ${T(tm()).short}`); closeSheet(); toast(`Alert sent to ${esc(T(tm()).manager)} and the management office`); },
  'log-tab': el => { G.logTab = el.dataset.v; render(); },
  'log-kind': el => { G.logKind = el.dataset.v; render(); },
  'end-shift': endShiftSheet,
  'end-confirm': () => {
    const t = $('#end-note').value.trim();
    if (t) SHIFT_NOTES.unshift({ id: 'n' + SHIFT_NOTES.length, at: clock(), taman: tm(), guard: G.guard.name, text: t });
    const name = G.guard.name.split(' ')[0]; G.guard = null; ss.set('tm-guard', null); closeSheet(); render(); toast(`Shift ended. Thank you, ${esc(name)}.`);
  },
};
function showErr(name, msg) { const el = $(`[name="${name}"]`, $sheet()), box = $(`[data-err="${name}"]`, $sheet()); el?.setAttribute('aria-invalid', 'true'); if (box) box.textContent = msg; el?.focus(); }

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a || a.disabled || !ACT[a.dataset.act] || a.tagName === 'SELECT') return;
  if (a.tagName === 'BUTTON') e.preventDefault();
  ACT[a.dataset.act](a, e);
});
document.addEventListener('input', e => {
  if (e.target.id === 'find') findResults(e.target.value);
  else if (e.target.id === 'call-q') callResults(e.target.value);
  else if (e.target.closest('#reg')) { e.target.removeAttribute('aria-invalid'); const box = $(`[data-err="${e.target.name}"]`, $sheet()); if (box) box.textContent = ''; regRefresh(); }
  else if (e.target.closest('#dlv, #inc')) { e.target.removeAttribute('aria-invalid'); const box = $(`[data-err="${e.target.name}"]`, $sheet()); if (box) box.textContent = ''; }
});
document.addEventListener('change', e => {
  if (e.target.id === 'station') { G.st = GATES.find(g => g.key === e.target.value); ss.set('tm-station', G.st.key); seedParcels(); signin(); $('#station').focus(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'note-f') return; e.preventDefault();
  const t = $('#note-t'), text = t.value.trim(); if (!text) { t.setAttribute('aria-invalid', 'true'); t.focus(); return; }
  SHIFT_NOTES.unshift({ id: 'n' + SHIFT_NOTES.length, at: clock(), taman: tm(), guard: G.guard.name, text }); logEvent('note', 'Posted a handover note', text.slice(0, 60)); render(); toast('Note posted for the next shift');
});
document.addEventListener('keydown', e => {
  if (!G.guard && G.who && !$sheet().open) { if (/^\d$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') pinKey('back'); return; }
  if (e.key === 'Enter' && e.target.id === 'find') { e.preventDefault(); $('#find-res [data-act]')?.click(); }
});
$sheet().addEventListener('close', () => { clearTimeout(G.askTimer); G.pick = null; G.reg = null; });
$sheet().addEventListener('click', e => { if (e.target === e.currentTarget) closeSheet(); });
window.addEventListener('hashchange', () => { closeSheet(); render(); });
setInterval(() => { $$('[data-clock]').forEach(el => { el.textContent = dTime(clock()); }); }, 1000);

render();
if (QS.get('act') && G.guard) ACT[QS.get('act')]?.(document.createElement('button'));
