'use strict';
// Core: helpers, shell (sidebar, top bar, scope), router, and the shared index / drawer / form engine.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${n}</span>`;
const RM = n => 'RM\u00a0' + ((Number(n) || 0) + 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // + 0 turns -0 into 0
const RM0 = n => 'RM\u00a0' + (Math.round(n) + 0).toLocaleString('en-MY');
const N = n => Number(n).toLocaleString('en-MY');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const dDate = d => d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const dShort = d => d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
const dDay = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const dTime = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
const dWhen = d => `${dShort(d)}, ${dTime(d)}`;
const LOADED = performance.now();
const clock = () => new Date(NOW.getTime() + (performance.now() - LOADED));
const ago = d => {
  const m = Math.round((clock() - d) / 6e4);
  if (m < 0) { const f = -m; return f < 60 ? `in ${f} min` : f < 1440 ? `in ${Math.round(f / 60)} h` : `in ${Math.round(f / 1440)} days`; }
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24); return dd === 1 ? 'yesterday' : `${dd} days ago`;
};
const T = id => TAMANS.find(t => t.id === id);
const U = id => UNIT.get(id);
const PM = id => PERMITS.find(p => p.id === id);
const FAC = id => FACILITIES.find(f => f.id === id);
const chip = (label, tone = 'mute', plain = false) => `<span class="chip chip-${tone} ${plain ? 'plain' : ''}">${esc(label)}</span>`;
const t2 = (a, b) => `<div class="t2"><b>${esc(a)}</b>${b ? `<small>${esc(b)}</small>` : ''}</div>`;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

// ---------- State and scope ----------
const store = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } } };
const QS = new URLSearchParams(location.search);
const DEMO = QS.has('demo') || QS.has('signin');
// open = expanded sidebar groups; pinned = the ones the person expanded by hand (they stay open across pages)
const S = { authed: QS.has('demo') || (!QS.has('signin') && store.get('tm-auth') === '1'), scope: (!DEMO && store.get('tm-scope')) || 'all', open: new Set(), pinned: new Set(), tab: {}, path: null };
if (S.scope !== 'all' && !T(S.scope)) S.scope = 'all';
// A management company only ever sees its own tamans: every list, count and search goes through this.
const inScope = r => S.scope === 'all' || r.taman === S.scope || r.scope === 'portfolio';
const scopeName = () => S.scope === 'all' ? 'All tamans' : T(S.scope).name;
const myTamans = () => S.scope === 'all' ? TAMANS : [T(S.scope)];

const log = (action, target, taman = S.scope === 'all' ? '' : S.scope) => AUDIT.unshift({ id: 'AUD-' + (90001 + AUDIT.length), at: clock(), actor: ME.name, action, area: 'admin', taman: taman || 'all', target, ip: '175.143.20.11' });

// ---------- Navigation ----------
const NAV = [
  { id: 'overview', label: 'Overview', icon: 'space_dashboard', path: '' },
  { id: 'props', label: 'Properties', icon: 'holiday_village', items: [
    { label: 'Tamans', path: 'tamans' }, { label: 'Blocks & units', path: 'units' }, { label: 'Occupants', path: 'occupants' }] },
  { id: 'people', label: 'People & access', icon: 'group', items: [
    { label: 'Users', path: 'users' }, { label: 'Roles & permissions', path: 'roles' }] },
  { id: 'security', label: 'Security', icon: 'shield_person', items: [
    { label: 'Visitor registry', path: 'visitors' },
    { label: 'On site now', path: 'onsite', live: true, count: () => ONSITE.filter(inScope).length },
    { label: 'Guard roster', path: 'roster' },
    { label: 'Incidents', path: 'incidents', count: () => INCIDENTS.filter(i => inScope(i) && i.status !== 'Closed').length },
    { label: 'QR pass policy', path: 'qr-policy' }] },
  { id: 'permits', label: 'Permits', icon: 'assignment', items: [
    { label: 'Applications', path: 'permits', count: () => PERMITS.filter(p => inScope(p) && (p.status === 'Pending Review' || (p.status === 'Pending Deposit' && p.depositState === 'Receipt uploaded'))).length },
    { label: 'Inspections & refunds', path: 'refunds', count: () => PERMITS.filter(p => inScope(p) && p.status === 'Inspection Scheduled').length },
    { label: 'Enforcement', path: 'enforcement' },
    { label: 'Permit types & rules', path: 'permit-types' }] },
  { id: 'billing', label: 'Billing', icon: 'receipt_long', items: [
    { label: 'Invoices', path: 'invoices' },
    { label: 'Reconciliation', path: 'reconciliation', count: () => PAYMENTS.filter(p => inScope(p) && (p.status === 'Unmatched' || p.status === 'Receipt to verify')).length },
    { label: 'Deposit escrow', path: 'escrow' }, { label: 'Owner portfolios', path: 'portfolios' },
    { label: 'Late fees & reminders', path: 'late-fees' }, { label: 'Statements', path: 'statements' }] },
  { id: 'facilities', label: 'Facilities', icon: 'event_available', items: [
    { label: 'Catalog & calendar', path: 'facilities' },
    { label: 'Bookings', path: 'bookings', count: () => BOOKINGS.filter(b => inScope(b) && b.status === 'Pending approval').length },
    { label: 'Booking rules', path: 'booking-rules' }, { label: 'Utilization', path: 'utilization' }] },
  { id: 'market', label: 'Marketplace', icon: 'storefront', items: [
    { label: 'Listings', path: 'listings', count: () => LISTINGS.filter(l => inScope(l) && l.status === 'Pending approval').length },
    { label: 'Reported listings', path: 'reports', count: () => REPORTS.filter(r => inScope(r) && r.status === 'Open').length },
    { label: 'Categories & policy', path: 'market-policy' }] },
  { id: 'comms', label: 'Communications', icon: 'campaign', items: [
    { label: 'Announcements', path: 'announcements' }, { label: 'Broadcasts', path: 'broadcasts' }, { label: 'Templates', path: 'templates' }] },
  { id: 'analytics', label: 'Analytics', icon: 'monitoring', path: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings', items: [
    { label: 'Taman profile & branding', path: 'profile' }, { label: 'Integrations', path: 'integrations' }, { label: 'Audit log', path: 'audit' }] },
];
const NAV_ALIAS = { permit: 'permits' };
const groupOf = path => NAV.find(g => g.items?.some(i => i.path === (NAV_ALIAS[path] ?? path)));

function navHTML(path) {
  const cur = NAV_ALIAS[path] ?? path;
  return NAV.map(g => {
    if (!g.items) return `<li><a class="nl" href="#/${g.path}" ${cur === g.path ? 'aria-current="page"' : ''}>${icon(g.icon)}<span>${g.label}</span></a></li>`;
    const open = S.open.has(g.id), holds = g.items.some(i => i.path === cur);
    const total = g.items.reduce((s, i) => s + (i.count && !i.live ? i.count() : 0), 0);
    return `<li>
      <button type="button" class="nl ${holds && !open ? 'holds-current' : ''}" data-act="group" data-g="${g.id}" aria-expanded="${open}" aria-controls="g-${g.id}">${icon(g.icon)}<span>${g.label}</span>${!open && total ? `<span class="count">${total}<span class="sr-only"> waiting</span></span>` : ''}${icon('expand_more', 'chev')}</button>
      <div class="sub" id="g-${g.id}" ${open ? '' : 'hidden'}>${g.items.map(i => {
        const c = i.count?.();
        return `<a class="ns" href="#/${i.path}" ${cur === i.path ? 'aria-current="page"' : ''}>${i.live ? '<span class="live" aria-hidden="true"></span>' : ''}<span>${i.label}</span>${c ? `<span class="count" ${i.live ? 'style="background:#7ED8AE"' : ''}>${c}<span class="sr-only">${i.live ? ' on site' : ' waiting'}</span></span>` : ''}</a>`;
      }).join('')}</div></li>`;
  }).join('');
}

function shellHTML() {
  return `
  <div class="flex h-dvh overflow-hidden">
    <div id="scrim" class="fixed inset-0 z-40 bg-ink/45 lg:hidden" data-act="nav-close" hidden></div>
    <aside id="sidebar" class="on-dark fixed inset-y-0 left-0 z-50 w-[288px] max-w-[86vw] -translate-x-full transition-transform duration-200 lg:static lg:z-auto lg:w-[288px] lg:translate-x-0 shrink-0 bg-indigo flex flex-col">
      <div class="flex items-center gap-3 pl-5 pr-3 h-[76px] shrink-0">
        <span class="mark" role="img" aria-label="Tamanly logo"></span>
        <div class="min-w-0">
          <div class="text-white text-[19px] leading-6 font-medium tracking-[-0.02em]">Tamanly</div>
          <div class="text-lav text-[12px] leading-4 truncate">${esc(ORG.name)}</div>
        </div>
        <button type="button" class="btn btn-icon btn-dark ml-auto lg:hidden" data-act="nav-close" aria-label="Close menu">${icon('close')}</button>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main"><ul id="nav" class="grid gap-0.5"></ul></nav>
      <div class="shrink-0 p-3 border-t border-white/10">
        <div class="flex items-center gap-3 px-2 py-1">
          <span class="avatar">${ME.initials}</span>
          <div class="min-w-0 flex-1"><div class="text-white text-[13.5px] font-semibold truncate">${ME.name}</div><div class="text-lav text-[12px] truncate">${ME.role} · ${ORG.short}</div></div>
          <button type="button" class="btn btn-icon btn-dark" data-act="signout" aria-label="Sign out" title="Sign out">${icon('logout')}</button>
        </div>
      </div>
    </aside>
    <div class="flex-1 min-w-0 flex flex-col">
      <header id="topbar" class="on-dark h-16 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6"></header>
      <main id="main" class="flex-1 min-h-0 overflow-y-auto bg-cream rounded-t-[28px] lg:rounded-tr-none">
        <div id="page" class="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 pt-6 pb-20 lg:pt-8"></div>
      </main>
    </div>
  </div>
  <div popover id="scope-pop" role="dialog" aria-label="Choose taman scope"></div>
  <div popover id="bell-pop" role="dialog" aria-label="Notifications"></div>`;
}

function topbarHTML() {
  const unread = NOTIFS.filter(n => n.unread).length;
  return `
    <button type="button" class="btn btn-icon btn-dark lg:hidden" data-act="nav-open" aria-label="Open menu" aria-controls="sidebar">${icon('menu')}</button>
    <button type="button" class="scope-pill" popovertarget="scope-pop" aria-label="Taman scope: ${esc(scopeName())}. Change">${icon(S.scope === 'all' ? 'location_city' : 'home_work', 'text-lav')}<span class="truncate">${esc(scopeName())}</span>${S.scope === 'all' ? `<span class="hidden sm:inline text-lav font-medium">· ${TAMANS.length}</span>` : ''}${icon('expand_more', 'text-lav')}</button>
    <button type="button" class="search-btn hidden md:flex" data-act="palette">${icon('search')}<span class="truncate">Search units, people, permits…</span><kbd>${IS_MAC ? '⌘' : 'Ctrl'} K</kbd></button>
    <div class="ml-auto flex items-center gap-1">
      <button type="button" class="btn btn-icon btn-dark md:hidden" data-act="palette" aria-label="Search">${icon('search')}</button>
      <button type="button" class="btn btn-icon btn-dark relative" popovertarget="bell-pop" aria-label="Notifications, ${unread} new">${icon('notifications')}${unread ? '<span class="bell-dot"></span>' : ''}</button>
      <a href="../storyboard/" class="btn btn-sm btn-dark hidden xl:inline-flex">${icon('smartphone')}Mobile app</a>
    </div>`;
}

function scopePopHTML() {
  const opt = (v, name, sub) => `<button type="button" class="pop-item" role="menuitemradio" aria-checked="${S.scope === v}" data-act="scope" data-v="${v}">
    <span class="tile ${v === 'all' ? 'tile-indigo' : 'tile-sun'} w-9 h-9">${icon(v === 'all' ? 'location_city' : 'home_work')}</span>
    <span class="min-w-0 flex-1"><span class="block text-[14px] font-semibold">${esc(name)}</span><span class="block text-[12.5px] text-muted">${esc(sub)}</span></span>${S.scope === v ? icon('check', 'text-indigo') : ''}</button>`;
  const units = id => N(UNITS.filter(u => u.taman === id).length);
  return `<p class="px-3 pt-2 pb-2 text-[12.5px] text-muted">${esc(ORG.name)} manages</p>
    ${opt('all', 'All tamans', `${TAMANS.length} tamans · ${N(UNITS.length)} units`)}
    ${TAMANS.map(t => opt(t.id, t.name, `${t.city} · ${units(t.id)} units`)).join('')}
    <p class="flex gap-2 mx-1 mt-2 p-3 rounded-xl bg-paper text-[12.5px] leading-5 text-muted">${icon('lock', 'text-[18px]')}<span>Only tamans under your company's management contract appear here. Other companies' tamans are never shown or editable.</span></p>`;
}

let NOTIFS = [];
function buildNotifs() {
  const p = PERMITS.find(x => x.status === 'Pending Review'), r = PAYMENTS.find(x => x.status === 'Receipt to verify'), o = ONSITE.find(x => x.note), inc = INCIDENTS.find(x => x.sev === 'High' && x.status !== 'Closed'), b = BOOKINGS.find(x => x.status === 'Pending approval');
  NOTIFS = [
    p && { icon: 'assignment', tone: 'sun', text: `New ${p.category.toLowerCase()} permit from ${p.applicant}`, sub: `${U(p.unit).name} · ${ago(p.submitted)}`, href: `#/permit/${p.id}`, unread: true },
    o && { icon: 'campaign', tone: 'bad', text: `Guard report: ${o.note.split(' (')[0].toLowerCase()}`, sub: `${PM(o.permit).contractor} · ${U(PM(o.permit).unit).name}`, href: '#/onsite', unread: true },
    r && { icon: 'receipt', tone: 'coral', text: `Bank transfer receipt uploaded, ${RM(r.amount)}`, sub: `${r.payer} · ${ago(r.at)}`, href: '#/reconciliation', unread: true },
    inc && { icon: 'emergency_home', tone: 'bad', text: inc.title, sub: `${T(inc.taman).short} · ${inc.sev} · ${ago(inc.at)}`, href: '#/incidents' },
    b && { icon: 'event_available', tone: 'ok', text: `${FAC(b.facility).name} booking needs approval`, sub: `${b.purpose} · ${dDay(b.start)}`, href: '#/bookings' },
  ].filter(Boolean);
}
function bellHTML() {
  return `<div class="flex items-center justify-between px-3 pt-2 pb-2"><h2 class="text-[15px] font-semibold">Notifications</h2><button type="button" class="btn btn-g btn-sm" data-act="notifs-read">Mark all read</button></div>
    <ul class="grid">${NOTIFS.map(n => `<li><a class="pop-item" href="${n.href}" data-act="pop-go"><span class="tile tile-${n.tone} w-9 h-9">${icon(n.icon)}</span><span class="min-w-0 flex-1"><span class="block text-[13.5px] ${n.unread ? 'font-semibold' : 'font-medium'} leading-5">${esc(n.text)}</span><span class="block text-[12.5px] text-muted truncate">${esc(n.sub)}</span></span>${n.unread ? '<span class="w-2 h-2 rounded-full bg-coral shrink-0" aria-label="unread"></span>' : ''}</a></li>`).join('')}</ul>`;
}

// ---------- Router ----------
const ROUTES = {};
const route = () => { const [p = '', id] = location.hash.replace(/^#\/?/, '').split('/'); return [p, id ? decodeURIComponent(id) : undefined]; };
let NAVOPEN = false;
function render(keep) {
  if (!S.authed) return ROUTES.signin.render();
  if (!$('#sidebar')) { document.body.className = 'bg-indigo font-sans text-ink antialiased'; $('#app').innerHTML = shellHTML(); }
  const [p, id] = route(); const r = ROUTES[p] || ROUTES['404'];
  const key = p + '/' + (id || ''), changed = S.path !== key; S.path = key;
  const g = groupOf(p); if (changed) S.open = new Set([...S.pinned, ...(g ? [g.id] : [])]);
  $('#nav').innerHTML = navHTML(p);
  $('#topbar').innerHTML = topbarHTML();
  $('#scope-pop').innerHTML = scopePopHTML();
  $('#bell-pop').innerHTML = bellHTML();
  const top = $('#main').scrollTop;
  $('#page').innerHTML = r.render(id);
  $$('form[data-form]', $('#page')).forEach(showWhen);
  document.title = `${typeof r.title === 'function' ? r.title(id) : r.title} · Tamanly Admin`;
  if (changed && !keep) { $('#main').scrollTop = 0; closeNav(); $('#page h1')?.focus({ preventScroll: true }); } else $('#main').scrollTop = top;
  r.after?.(id);
  fitAll();
}
const rerender = () => render(true);
window.addEventListener('hashchange', () => { if ($('#drawer').open) $('#drawer').close(); $$('[popover]').forEach(p => { if (p.matches(':popover-open')) p.hidePopover(); }); render(); });

function head({ title, sub = '', actions = '' }) {
  return `<div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-6">
    <div class="min-w-0 max-w-[76ch]">
      <h1 tabindex="-1" class="text-[24px] sm:text-[26px] leading-8 font-semibold tracking-[-0.02em] text-ink outline-none">${title}</h1>
      ${sub ? `<p class="mt-1.5 text-[14.5px] leading-6 text-muted">${sub}</p>` : ''}
    </div>
    ${actions ? `<div class="flex flex-wrap items-center gap-2">${actions}</div>` : ''}
  </div>`;
}
const sect = (title, body, { sub = '', cls = '', aside = '' } = {}) => `<section class="panel p-5 sm:p-6 ${cls}">
  <div class="flex items-start justify-between gap-4"><div class="min-w-0"><h2 class="text-[16px] font-semibold tracking-[-0.01em]">${title}</h2>${sub ? `<p class="mt-1 text-[13.5px] leading-5 text-muted">${sub}</p>` : ''}</div>${aside}</div>
  <div class="mt-4">${body}</div></section>`;
const tabs = (key, list, def) => { const cur = S.tab[key] ?? def ?? list[0][0]; return `<div class="seg mb-5" role="tablist">${list.map(([v, l, n]) => `<button type="button" role="tab" aria-selected="${cur === v}" data-act="tab" data-k="${key}" data-v="${v}">${l}${n != null ? ` <span class="n">${n}</span>` : ''}</button>`).join('')}</div>`; };
const tabOf = (key, def) => S.tab[key] ?? def;
const dl = rows => `<dl class="grid sm:grid-cols-2 gap-x-6 gap-y-4">${rows.filter(Boolean).map(([k, v, wide]) => `<div class="min-w-0 ${wide ? 'sm:col-span-2' : ''}"><dt class="text-[12.5px] text-muted">${k}</dt><dd class="mt-0.5 text-[14px] text-ink">${v}</dd></div>`).join('')}</dl>`;

// ---------- Index engine: search, filters, sort, pages, table on desktop, cards on phones ----------
const IX = {}, IXC = {}, IXR = {};
const tamanF = () => ({ k: 'taman', label: 'Taman', all: 'All tamans', opts: TAMANS.map(t => [t.id, t.short]) });
const dateF = (get, label = 'Date', future = false) => ({ k: '_date', label, all: 'Any time', opts: future ? [['today', 'Today'], ['n7', 'Next 7 days'], ['p7', 'Last 7 days']] : [['today', 'Today'], ['p7', 'Last 7 days'], ['p30', 'Last 30 days']],
  test: (r, v) => { const d = get(r); if (!d) return false; const day0 = new Date(NOW); day0.setHours(0, 0, 0, 0); const diff = (d - day0) / DAY; return v === 'today' ? diff >= 0 && diff < 1 : v === 'n7' ? diff >= 0 && diff < 8 : diff < 1 && diff >= -(+v.slice(1)); } });
const ixState = cfg => IX[cfg.id] ||= { q: '', f: { ...(cfg.f0 || {}) }, sort: cfg.sort ?? null, dir: cfg.dir ?? -1, page: 1, view: cfg.views?.[0][0] };
const ixFilters = cfg => (cfg.filters || []).filter(f => !(f.k === 'taman' && S.scope !== 'all'));
function ixRows(cfg) {
  const st = ixState(cfg);
  let rows = cfg.rows().filter(cfg.scope || inScope);
  if (st.q.trim()) { const q = st.q.trim().toLowerCase(); rows = rows.filter(r => cfg.text(r).replace(/\u00a0/g, ' ').toLowerCase().includes(q)); }
  for (const f of ixFilters(cfg)) { const v = st.f[f.k]; if (v) rows = rows.filter(r => f.test ? f.test(r, v) : String(f.get ? f.get(r) : r[f.k]) === v); }
  if (st.sort != null && cfg.cols[st.sort]?.s) { const key = cfg.cols[st.sort].s; rows = [...rows].sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; }); }
  return rows;
}
const optList = o => o.map(x => typeof x === 'string' ? [x, x] : x);
function ixHTML(cfg) {
  IXC[cfg.id] = cfg; const st = ixState(cfg);
  const filters = ixFilters(cfg).map(f => { const v = st.f[f.k] || ''; return `<label class="fsel ${v ? 'on' : ''}"><span class="sr-only">${f.label}</span><select data-ixf="${cfg.id}" data-k="${f.k}"><option value="">${f.all}</option>${optList(f.opts).map(([val, l]) => `<option value="${esc(val)}" ${String(val) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${icon('expand_more')}</label>`; }).join('');
  const tools = (cfg.views ? `<div class="seg" role="group" aria-label="View">${cfg.views.map(([v, l, ic]) => `<button type="button" data-act="ix-view" data-ix="${cfg.id}" data-v="${v}" aria-pressed="${st.view === v}">${icon(ic)}${l}</button>`).join('')}</div>` : '')
    + (cfg.csv !== false ? `<button type="button" class="btn btn-o btn-sm" data-act="csv" data-ix="${cfg.id}">${icon('download')}Export CSV</button>` : '') + (cfg.tools || '');
  return `<section class="panel ${cfg.cls || ''}" data-ix="${cfg.id}">
    <div class="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-start border-b border-line">
      <div class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:flex-1">
        <label class="search lg:w-[280px] shrink-0"><span class="sr-only">Search ${cfg.noun}</span>${icon('search')}<input type="search" class="input" data-ixq="${cfg.id}" value="${esc(st.q)}" placeholder="${esc(cfg.ph || 'Search')}" autocomplete="off"></label>
        ${filters ? `<div class="flex items-center gap-2 overflow-x-auto no-sb -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 lg:overflow-visible lg:flex-wrap" role="group" aria-label="Filters">${filters}</div>` : ''}
      </div>
      ${tools ? `<div class="flex flex-wrap items-center gap-2 lg:shrink-0 lg:min-h-10">${tools}</div>` : ''}
    </div>
    <p class="sr-only" aria-live="polite" data-ix-live></p>
    <div data-ix-results>${ixResults(cfg)}</div>
  </section>`;
}
function ixResults(cfg) {
  const st = ixState(cfg), all = ixRows(cfg), n = all.length, per = cfg.per || 20;
  const pages = Math.max(1, Math.ceil(n / per)); st.page = Math.min(st.page, pages);
  const active = !!st.q.trim() || ixFilters(cfg).some(f => st.f[f.k] && !(cfg.f0 && cfg.f0[f.k] === st.f[f.k]));
  const noun = n === 1 ? (cfg.one || cfg.noun.replace(/s$/, '')) : cfg.noun;
  const top = `<div class="flex items-center justify-between gap-3 min-h-[44px] px-4 py-1.5 text-[13px] text-muted border-b border-line"><span><b class="text-ink font-semibold num">${N(n)}</b> ${noun}${cfg.sum && n ? ` · ${cfg.sum(all)}` : ''}</span>${active ? `<button type="button" class="btn btn-g btn-sm" data-act="ix-clear" data-ix="${cfg.id}">${icon('filter_alt_off')}Clear filters</button>` : ''}</div>`;
  if (!n) return top + emptyHTML(cfg, active);
  if (st.view === 'board' && cfg.board) { IXR[cfg.id] = all; return top + cfg.board(all); }
  const rows = all.slice((st.page - 1) * per, st.page * per); IXR[cfg.id] = rows;
  const cols = cfg.cols.filter(c => !(c.taman && S.scope !== 'all') && !c.cardOnly);
  const cardCols = cfg.cols.filter(c => !(c.taman && S.scope !== 'all') && !c.tableOnly);
  const th = c => { const i = cfg.cols.indexOf(c), on = st.sort === i; return `<th class="${c.num ? 'num' : ''} ${c.hide || ''}" ${on ? `aria-sort="${st.dir > 0 ? 'ascending' : 'descending'}"` : ''}>${c.s ? `<button type="button" data-act="sort" data-ix="${cfg.id}" data-i="${i}">${c.h}${icon(on ? (st.dir > 0 ? 'arrow_upward' : 'arrow_downward') : 'unfold_more', on ? 'text-indigo' : 'opacity-40')}</button>` : c.h}</th>`; };
  return top + `
    <div class="ix-t hidden md:block overflow-x-auto"><table class="tbl"><thead><tr>${cols.map(th).join('')}</tr></thead>
      <tbody>${rows.map((r, i) => `<tr ${cfg.open ? `data-i="${i}" data-ix-row="${cfg.id}" tabindex="0"` : ''}>${cols.map(c => `<td class="${c.num ? 'num' : ''} ${c.hide || ''} ${c.cls || ''}">${c.v(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <ul class="ix-c md:hidden divide-y divide-line">${rows.map((r, i) => cardHTML(cfg, cardCols, r, i)).join('')}</ul>
    ${pages > 1 ? pagerHTML(cfg, st, n, per, pages) : ''}`;
}
function cardHTML(cfg, cols, r, i) {
  const badge = cols.find(c => c.badge), act = cols.find(c => c.act);
  const meta = cols.slice(1).filter(c => !c.badge && !c.act && !c.noCard).slice(0, 4);
  return `<li ${cfg.open ? `data-i="${i}" data-ix-row="${cfg.id}" tabindex="0" class="px-4 py-3.5 cursor-pointer"` : 'class="px-4 py-3.5"'}>
    <div class="flex items-start gap-3"><div class="min-w-0 flex-1 text-[14px]">${cols[0].v(r)}</div>${badge ? `<div class="shrink-0">${badge.v(r)}</div>` : ''}</div>
    ${meta.length ? `<dl class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[12.5px]">${meta.map(c => `<div class="min-w-0"><dt class="text-muted">${c.h}</dt><dd class="truncate text-ink ${c.num ? 'num' : ''}">${c.cv ? c.cv(r) : c.v(r)}</dd></div>`).join('')}</dl>` : ''}
    ${act ? `<div class="mt-3 flex flex-wrap gap-2">${act.v(r)}</div>` : ''}
  </li>`;
}
function pagerHTML(cfg, st, n, per, pages) {
  const a = (st.page - 1) * per + 1, b = Math.min(n, st.page * per);
  return `<div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-line text-[13px] text-muted">
    <span class="num">${N(a)}–${N(b)} of ${N(n)}</span>
    <div class="flex items-center gap-2"><span class="hidden sm:inline num">Page ${st.page} of ${N(pages)}</span>
      <button type="button" class="btn btn-o btn-sm btn-icon" data-act="ix-page" data-ix="${cfg.id}" data-d="-1" ${st.page === 1 ? 'disabled' : ''} aria-label="Previous page">${icon('chevron_left')}</button>
      <button type="button" class="btn btn-o btn-sm btn-icon" data-act="ix-page" data-ix="${cfg.id}" data-d="1" ${st.page === pages ? 'disabled' : ''} aria-label="Next page">${icon('chevron_right')}</button></div></div>`;
}
const emptyHTML = (cfg, active) => `<div class="px-6 py-14 text-center max-w-md mx-auto">
  <span class="tile tile-indigo mx-auto">${icon(active ? 'search_off' : cfg.emptyIcon || 'inbox')}</span>
  <h3 class="mt-3 text-[15px] font-semibold">${active ? `No ${cfg.noun} match` : cfg.emptyTitle || `No ${cfg.noun} yet`}</h3>
  <p class="mt-1 text-[13.5px] leading-5 text-muted">${active ? `Nothing in ${esc(scopeName())} matches this search and these filters. Clear them, or switch the taman scope in the top bar.` : cfg.emptyText || ''}</p>
  ${active ? `<button type="button" class="btn btn-t btn-sm mt-4" data-act="ix-clear" data-ix="${cfg.id}">Clear search and filters</button>` : cfg.emptyAction || ''}</div>`;
// A list shows its table only when the table fits its panel; otherwise it falls back to cards.
// Measured, not breakpoint-guessed, so laptops and tablets beside the sidebar never get clipped columns.
function fitIx(box) {
  const t = $('.ix-t', box); if (!t) return;
  box.classList.remove('cardview');
  if (t.offsetParent && t.scrollWidth > t.clientWidth + 1) box.classList.add('cardview');
}
const fitAll = () => $$('[data-ix]').forEach(fitIx);
const fitObs = new ResizeObserver(entries => entries.forEach(e => fitIx(e.target)));
new MutationObserver(() => $$('[data-ix]').forEach(b => { if (!b.dataset.fit) { b.dataset.fit = 1; fitObs.observe(b); } })).observe(document.body, { childList: true, subtree: true });
document.fonts?.ready.then(fitAll);
function refreshIx(id) {
  const box = $(`[data-ix="${id}"]`); if (!box) return;
  $('[data-ix-results]', box).innerHTML = ixResults(IXC[id]);
  fitIx(box);
  const n = ixRows(IXC[id]).length; $('[data-ix-live]', box).textContent = `${n} ${IXC[id].noun}`;
}
const resetPages = () => Object.values(IX).forEach(s => { s.page = 1; });

const strip = h => String(h).replace(/<span class="ms[^>]*>[^<]*<\/span>/g, '').replace(/<small[^>]*>/g, ' · ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const download = (name, text, type = 'text/csv') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const toCSV = (cols, rows) => [cols.map(c => c[0]), ...rows.map(r => cols.map(c => c[1](r)))].map(line => line.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
function exportIx(cfg) {
  const rows = ixRows(cfg), cols = cfg.cols.filter(c => !c.act && !c.cardOnly).map(c => [strip(c.h), r => c.t ? c.t(r) : strip(c.v(r))]);
  download(`tamanly-${cfg.id}-${S.scope}-${NOW.toISOString().slice(0, 10)}.csv`, toCSV(cols, rows));
  toast(`Exported ${N(rows.length)} ${cfg.noun} as CSV`); log('Exported CSV', `${cfg.noun} (${rows.length})`);
}

// ---------- Forms ----------
function F(f) {
  const id = 'f-' + f.k.replace(/\W/g, '_') + (f.idx ?? ''), req = f.req ? 'required' : '', dis = f.dis ? 'disabled' : '';
  const lab = `<span class="block text-[13px] font-medium text-ink mb-1.5">${f.label}${f.req || f.noOpt ? '' : ' <span class="font-normal text-muted">(optional)</span>'}</span>`;
  const hint = f.hint ? `<p class="mt-1.5 text-[12.5px] leading-5 text-muted">${f.hint}</p>` : '';
  const err = `<p class="err" data-err="${f.k}"></p>`;
  const show = f.when ? `data-when="${f.when}"` : '';
  const wrap = inner => `<div class="${f.span ? 'sm:col-span-2' : ''} min-w-0" ${show}>${inner}</div>`;
  const o = optList(f.opts || []);
  const msg = f.msg ? `data-msg="${esc(f.msg)}"` : '';
  switch (f.type) {
    case 'select': return wrap(`<label for="${id}">${lab}</label><select id="${id}" name="${f.k}" class="input" ${req} ${dis} ${msg}>${f.ph ? `<option value="">${f.ph}</option>` : ''}${o.map(([v, l]) => `<option value="${esc(v)}" ${String(f.v) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${hint}${err}`);
    case 'textarea': return wrap(`<label for="${id}">${lab}</label><textarea id="${id}" name="${f.k}" class="input" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}" ${req} ${msg} ${f.max ? `maxlength="${f.max}"` : ''} ${f.af ? 'autofocus' : ''}>${esc(f.v || '')}</textarea>${hint}${err}`);
    case 'radio': return wrap(`<fieldset><legend class="p-0">${lab}</legend><div class="grid gap-2 ${f.cols === 2 ? 'sm:grid-cols-2' : f.cols === 3 ? 'sm:grid-cols-3' : ''}">${o.map(([v, l, d]) => `<label class="pick"><input type="radio" name="${f.k}" value="${esc(v)}" ${String(f.v) === String(v) ? 'checked' : ''} ${req} ${msg}><span class="min-w-0"><span class="block text-[14px] font-semibold leading-5">${l}</span>${d ? `<span class="block text-[12.5px] leading-5 text-muted mt-0.5">${d}</span>` : ''}</span></label>`).join('')}</div>${hint}${err}</fieldset>`);
    case 'checks': return wrap(`<fieldset><legend class="p-0">${lab}</legend><div class="flex flex-wrap gap-2">${o.map(([v, l]) => `<label class="pickc"><input type="checkbox" name="${f.k}[]" value="${esc(v)}" ${(f.v || []).includes(v) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>${hint}${err}</fieldset>`);
    case 'switch': return wrap(`<label class="flex items-center justify-between gap-4 py-1 cursor-pointer"><span class="min-w-0"><span class="block text-[14px] font-medium">${f.label}</span>${f.hint ? `<span class="block text-[12.5px] leading-5 text-muted mt-0.5">${f.hint}</span>` : ''}</span><input type="checkbox" role="switch" class="sw" name="${f.k}" ${f.v ? 'checked' : ''} ${dis}></label>`);
    case 'money': return wrap(`<label for="${id}">${lab}</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted pointer-events-none">RM</span><input id="${id}" name="${f.k}" type="number" inputmode="decimal" min="${f.min ?? 0}" ${f.max != null ? `max="${f.max}"` : ''} step="0.01" class="input pl-11 num" value="${f.v ?? ''}" placeholder="0.00" ${req} ${dis} ${msg}></div>${hint}${err}`);
    default: return wrap(`<label for="${id}">${lab}</label><input id="${id}" name="${f.k}" type="${f.type || 'text'}" class="input ${f.type === 'number' ? 'num' : ''}" value="${esc(f.v ?? '')}" placeholder="${esc(f.ph || '')}" ${req} ${dis} ${msg} ${f.list ? `list="${f.list}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.auto ? `autocomplete="${f.auto}"` : ''} ${f.af ? 'autofocus' : ''}>${hint}${err}`);
  }
}
const grid = (...fields) => `<div class="grid sm:grid-cols-2 gap-x-4 gap-y-5">${fields.join('')}</div>`;
// Fields marked data-when="name=value" show only while that choice is made
function showWhen(form) {
  $$('[data-when]', form).forEach(el => {
    const [k, v] = el.dataset.when.split('=');
    const ctl = $$(`[name="${k}"]`, form); const cur = ctl.find(c => c.type === 'radio' ? c.checked : true);
    const val = !cur ? '' : cur.type === 'checkbox' ? String(cur.checked) : cur.value;
    const on = v.split('|').includes(val); el.hidden = !on;
    $$('input,select,textarea', el).forEach(i => { i.disabled = !on; });
  });
}
function formData(f) {
  const o = {};
  for (const el of f.elements) {
    if (!el.name || el.disabled) continue;
    const k = el.name.replace(/\[\]$/, '');
    if (el.name.endsWith('[]')) { o[k] ||= []; if (el.checked) o[k].push(el.value); }
    else if (el.type === 'checkbox') o[k] = el.checked;
    else if (el.type === 'radio') { if (el.checked) o[k] = el.value; else o[k] ??= ''; }
    else o[k] = el.value;
  }
  return o;
}
function validate(f) {
  let first = null;
  $$('[aria-invalid]', f).forEach(x => x.removeAttribute('aria-invalid')); $$('.err', f).forEach(x => { x.textContent = ''; });
  for (const el of f.elements) {
    if (!el.name || !el.willValidate || el.checkValidity()) continue;
    el.setAttribute('aria-invalid', 'true');
    const box = $(`[data-err="${el.name.replace(/\[\]$/, '')}"]`, f);
    if (box && !box.textContent) box.textContent = el.validity.valueMissing ? (el.dataset.msg || (el.type === 'radio' ? 'Choose one option.' : 'Fill in this field.')) : el.validationMessage;
    first ||= el;
  }
  first?.focus(); return !first;
}
function fieldErr(f, k, msg) { const el = $(`[name="${k}"]`, f); el?.setAttribute('aria-invalid', 'true'); const box = $(`[data-err="${k}"]`, f); if (box) box.textContent = msg; el?.focus(); return false; }

// ---------- Drawer, toast, palette ----------
const DR = {};
function drawer({ title, sub = '', body, foot = '', wide = false, submit, input }) {
  const d = $('#drawer');
  DR.submit = submit; DR.input = input;
  d.classList.toggle('wide', wide);
  $('#dr-title').innerHTML = title; $('#dr-sub').innerHTML = sub; $('#dr-sub').hidden = !sub;
  $('#dr-body').innerHTML = body; $('#dr-foot').innerHTML = foot; $('#dr-foot').hidden = !foot;
  const f = $('#dr-form'); if (f) { showWhen(f); input?.(f); }
  if (!d.open) d.showModal();
  $('#dr-body').scrollTop = 0;
  ($('[autofocus]', d) || $('.dr-close', d)).focus();
}
const closeDrawer = () => $('#drawer').open && $('#drawer').close();
const footSave = (label = 'Save', extra = '') => `${extra}<button type="button" class="btn btn-o" data-act="drawer-close">Cancel</button><button type="submit" form="dr-form" class="btn btn-p">${label}</button>`;

let toastT;
function toast(msg, act) {
  const t = $('#toast');
  t.innerHTML = `<span>${msg}</span>${act ? `<a href="${act.href}">${act.label}</a>` : ''}`;
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 5000);
}

let palIdx = 0, palList = [];
function openPalette() { const d = $('#palette'); if (!d.open) d.showModal(); $('#pal-q').value = ''; palRender(); $('#pal-q').focus(); }
function palData(q) {
  const pages = NAV.flatMap(g => g.items ? g.items.map(i => ({ ic: g.icon, l: i.label, s: g.label, href: '#/' + i.path })) : [{ ic: g.icon, l: g.label, s: 'Page', href: '#/' + g.path }]);
  if (!q) return [['Pages', pages]];
  const m = s => String(s).replace(/\u00a0/g, ' ').toLowerCase().includes(q);
  return [
    ['Pages', pages.filter(p => m(p.l) || m(p.s))],
    ['Units', UNITS.filter(u => inScope(u) && m(u.name)).slice(0, 5).map(u => ({ ic: 'home', l: u.name, s: `${T(u.taman).short} · ${u.status}`, href: `#/units/${u.id}` }))],
    ['People', USERS.filter(u => (S.scope === 'all' || u.tamans.includes(S.scope)) && (m(u.name) || m(u.contact))).slice(0, 5).map(u => ({ ic: 'person', l: u.name, s: `${u.title || u.role} · ${u.tamans.map(t => T(t).short).join(', ')}`, href: `#/users/${u.id}` }))],
    ['Permits', PERMITS.filter(p => inScope(p) && (m(p.id) || m(U(p.unit).name) || m(p.contractor) || m(p.applicant))).slice(0, 5).map(p => ({ ic: 'assignment', l: `${p.id} · ${p.category}`, s: `${U(p.unit).name} · ${p.status}`, href: `#/permit/${p.id}` }))],
    ['Invoices', q.length < 4 ? [] : INVOICES.filter(i => inScope(i) && m(i.id)).slice(0, 5).map(i => ({ ic: 'receipt_long', l: i.id, s: `${U(i.unit).name} · ${RM(i.amount)} · ${i.status}`, href: `#/invoices/${i.id}` }))],
  ].filter(g => g[1].length);
}
function palRender() {
  const q = $('#pal-q').value.trim().toLowerCase(), groups = palData(q);
  palList = groups.flatMap(g => g[1]); palIdx = 0; let i = 0;
  $('#pal-list').innerHTML = groups.length ? groups.map(([name, items]) => `<div class="px-3 pt-3 pb-1 text-[12px] font-medium text-muted" role="presentation">${name}</div>${items.map(it => `<div class="pal-opt" role="option" id="pal-${i}" data-pi="${i}" aria-selected="${i++ === 0}">${icon(it.ic, 'text-muted')}<span class="min-w-0 flex-1"><span class="block text-[14px] font-medium truncate">${esc(it.l)}</span><span class="block text-[12.5px] text-muted truncate">${esc(it.s)}</span></span></div>`).join('')}`).join('')
    : `<p class="px-4 py-10 text-center text-[14px] text-muted">Nothing in ${esc(scopeName())} matches “${esc(q)}”.</p>`;
  $('#pal-q').setAttribute('aria-activedescendant', palList.length ? 'pal-0' : '');
}
function palMove(d) {
  if (!palList.length) return;
  palIdx = (palIdx + d + palList.length) % palList.length;
  $$('.pal-opt').forEach(o => o.setAttribute('aria-selected', +o.dataset.pi === palIdx));
  $(`#pal-${palIdx}`).scrollIntoView({ block: 'nearest' }); $('#pal-q').setAttribute('aria-activedescendant', `pal-${palIdx}`);
}
function palGo(i) { const it = palList[i]; if (!it) return; $('#palette').close(); location.hash = it.href; }

function openNav() { const s = $('#sidebar'); s.classList.remove('-translate-x-full'); s.classList.add('translate-x-0'); $('#scrim').hidden = false; $('#main').inert = true; $('#topbar').inert = true; NAVOPEN = true; ($('[aria-current="page"]', s) || $('a,button', s))?.focus(); }
function closeNav() { if (!NAVOPEN) return; const s = $('#sidebar'); s.classList.add('-translate-x-full'); s.classList.remove('translate-x-0'); $('#scrim').hidden = true; $('#main').inert = false; $('#topbar').inert = false; NAVOPEN = false; }

// ---------- Actions and events ----------
const ACT = {
  'nav-open': openNav, 'nav-close': closeNav, palette: openPalette, 'drawer-close': closeDrawer,
  group: el => { const g = el.dataset.g; if (S.open.has(g)) { S.open.delete(g); S.pinned.delete(g); } else { S.open.add(g); S.pinned.add(g); } $('#nav').innerHTML = navHTML(route()[0]); $(`[data-g="${g}"]`).focus(); },
  scope: el => { S.scope = el.dataset.v; if (!DEMO) store.set('tm-scope', S.scope); const sp = $('#scope-pop'); if (sp.matches(':popover-open')) sp.hidePopover(); resetPages(); buildNotifs(); rerender(); toast(`Showing ${esc(scopeName())}`); },
  signout: () => { S.authed = false; store.set('tm-auth', '0'); history.replaceState(null, '', location.pathname + location.search.replace(/[?&]demo[^&]*/, '')); render(); },
  'notifs-read': () => { NOTIFS.forEach(n => { n.unread = false; }); $('#bell-pop').innerHTML = bellHTML(); $('#topbar').innerHTML = topbarHTML(); },
  'pop-go': () => { $('#bell-pop').hidePopover(); },
  tab: el => { S.tab[el.dataset.k] = el.dataset.v; rerender(); },
  'ix-view': el => { ixState(IXC[el.dataset.ix]).view = el.dataset.v; $$(`[data-act="ix-view"][data-ix="${el.dataset.ix}"]`).forEach(b => b.setAttribute('aria-pressed', b === el)); refreshIx(el.dataset.ix); },
  'ix-clear': el => { const cfg = IXC[el.dataset.ix], st = ixState(cfg); st.q = ''; st.f = { ...(cfg.f0 || {}) }; st.page = 1; const box = $(`[data-ix="${cfg.id}"]`); box.outerHTML = ixHTML(cfg); $(`[data-ixq="${cfg.id}"]`).focus(); },
  'ix-page': el => { const st = IX[el.dataset.ix]; st.page += +el.dataset.d; refreshIx(el.dataset.ix); $(`[data-ix="${el.dataset.ix}"]`).scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  sort: el => { const st = IX[el.dataset.ix], i = +el.dataset.i; st.dir = st.sort === i ? -st.dir : 1; st.sort = i; refreshIx(el.dataset.ix); $(`[data-ix="${el.dataset.ix}"] [data-act="sort"][data-i="${i}"]`)?.focus(); },
  csv: el => exportIx(IXC[el.dataset.ix]),
  undo: () => { rerender(); toast('Changes discarded'); },
};
const FORMS = {}, LIVE = {};
function openRow(el) { const cfg = IXC[el.dataset.ixRow]; const r = IXR[cfg.id]?.[+el.dataset.i]; if (r) cfg.open(r); }

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a && !a.disabled && ACT[a.dataset.act]) { if (a.tagName === 'BUTTON') e.preventDefault(); ACT[a.dataset.act](a, e); return; }
  const opt = e.target.closest('[data-pi]'); if (opt) { palGo(+opt.dataset.pi); return; }
  const row = e.target.closest('[data-ix-row]');
  if (row && !e.target.closest('a,button,input,select,textarea,label')) openRow(row);
});
document.addEventListener('input', e => {
  const q = e.target.closest('[data-ixq]');
  if (q) { const st = IX[q.dataset.ixq]; st.q = q.value; st.page = 1; refreshIx(q.dataset.ixq); return; }
  if (e.target.id === 'pal-q') { palRender(); return; }
  const f = e.target.closest('form[data-form]'); if (!f) return;
  showWhen(f);
  if (f.dataset.form === 'drawer') DR.input?.(f, e); else LIVE[f.dataset.form]?.(f, e);
});
document.addEventListener('change', e => {
  const s = e.target.closest('[data-ixf]');
  if (s) { const st = IX[s.dataset.ixf]; st.f[s.dataset.k] = s.value; st.page = 1; s.parentElement.classList.toggle('on', !!s.value); refreshIx(s.dataset.ixf); return; }
  const f = e.target.closest('form[data-form]'); if (!f) return;
  showWhen(f);
  if (f.dataset.form === 'drawer') DR.input?.(f, e); else LIVE[f.dataset.form]?.(f, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  if (!validate(f)) return;
  const data = formData(f), name = f.dataset.form;
  const res = name === 'drawer' ? DR.submit?.(data, f, e.submitter) : FORMS[name]?.(data, f, e.submitter);
  if (name === 'drawer' && res !== false) closeDrawer();
});
document.addEventListener('keydown', e => {
  const typing = e.target.closest('input, textarea, select, [contenteditable]');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && S.authed) { e.preventDefault(); openPalette(); return; }
  if (e.target.id === 'pal-q') {
    if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); } else if (e.key === 'Enter') { e.preventDefault(); palGo(palIdx); }
    return;
  }
  if (e.key === '/' && !typing && S.authed && !$('#drawer').open) { const q = $('[data-ixq]'); if (q) { e.preventDefault(); q.focus(); q.select(); } }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-ix-row]')) { e.preventDefault(); openRow(e.target); }
  if (e.key === 'Escape' && NAVOPEN) closeNav();
});
document.addEventListener('DOMContentLoaded', () => {
  $('#drawer').addEventListener('click', e => { if (e.target === e.currentTarget) closeDrawer(); });
  $('#palette').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
});

// ---------- Small charts (CSS bars) ----------
function vbars(data, { fmt = v => v, h = 150, label = '' } = {}) {
  const max = Math.max(...data.map(d => d.v)) || 1;
  return `<div class="flex items-end gap-1.5 sm:gap-3" style="height:${h + 44}px" role="img" aria-label="${esc(label)}: ${data.map(d => `${d.l} ${fmt(d.v)}`).join(', ')}">${data.map(d => `<div class="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5"><span class="text-[11px] sm:text-[11.5px] font-semibold num text-ink whitespace-nowrap">${fmt(d.v)}</span><div class="w-full max-w-[44px] rounded-t-[8px] rounded-b-[3px] ${d.hl ? 'bg-coral' : 'bg-indigo'}" style="height:${Math.max(3, d.v / max * h)}px"></div><span class="text-[11px] sm:text-[11.5px] text-muted truncate max-w-full">${esc(d.l)}</span></div>`).join('')}</div>`;
}
function hbars(data, { fmt = v => v, max, label = '' } = {}) {
  max ??= Math.max(...data.map(d => d.v)) || 1;
  return `<ul class="grid gap-3" role="img" aria-label="${esc(label)}: ${data.map(d => `${d.l} ${fmt(d.v)}`).join(', ')}">${data.map(d => `<li class="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3"><span class="text-[13px] truncate">${esc(d.l)}</span><div class="bar"><span style="width:${Math.max(1, d.v / max * 100)}%;${d.c ? `background:${d.c}` : ''}"></span></div><span class="text-[13px] font-semibold num w-16 text-right">${fmt(d.v)}</span></li>`).join('')}</ul>`;
}
