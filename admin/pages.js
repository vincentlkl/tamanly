'use strict';
// Pages, part 1: sign-in, overview, properties, people & access, security.
UNITS.forEach((u, i) => { u.ord = i; });
const TONE = {
  'Pending Review': 'sun', 'Docs requested': 'coral', 'Pending Deposit': 'coral', Approved: 'ok', 'Work In Progress': 'indigo', 'Inspection Scheduled': 'sun', Completed: 'ok', 'Deposit Refunded': 'ok', Rejected: 'bad',
  Occupied: 'ok', Vacant: 'mute', 'Under notice': 'sun', Active: 'ok', Invited: 'sun', Suspended: 'bad', 'Invite pending': 'sun', Ending: 'sun',
  Inside: 'indigo', 'Checked out': 'mute', Expected: 'sun', Denied: 'bad', 'No-show': 'mute', Overstayed: 'coral',
  Paid: 'ok', Due: 'sun', Overdue: 'bad', 'Partially paid': 'coral', Void: 'mute', Matched: 'ok', Unmatched: 'coral', 'Receipt to verify': 'sun', Failed: 'bad',
  Confirmed: 'ok', 'Pending approval': 'sun', Cancelled: 'mute', Overridden: 'indigo', Declined: 'bad',
  Live: 'ok', 'Taken down': 'bad', Sold: 'mute', Expired: 'mute', Open: 'coral', Dismissed: 'mute', Resolved: 'ok',
  Sent: 'ok', Scheduled: 'indigo', Draft: 'mute', 'Partly failed': 'coral', Investigating: 'sun', Closed: 'mute',
  Low: 'mute', Medium: 'sun', High: 'bad', Lifted: 'mute', Acknowledged: 'indigo', Paused: 'mute', Connected: 'ok', 'Not set up': 'mute',
  'Awaiting payout': 'sun', 'Paid out': 'ok', 'Inspection due': 'sun',
};
const stc = (s, tone) => chip(s, tone || TONE[s] || 'mute');
const pn = id => PERSON.get(id)?.name || '—';
const uname = id => U(id)?.name || id;
const unitsOf = tid => UNITS.filter(u => u.taman === tid);
const occRate = list => pct(list.filter(u => u.status !== 'Vacant').length, list.length);
const muted = s => `<span class="text-muted">${s}</span>`;
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const tamanOpts = () => myTamans().map(t => [t.id, t.name]);
const staffNames = () => USERS.filter(u => u.role === 'Management staff').map(u => u.name);
const findOrNew = name => { const n = name.trim(); if (!n) return null; const hit = PEOPLE.find(p => p.name.toLowerCase() === n.toLowerCase()); return (hit || newPerson(n)).id; };
// Destructive buttons ask for a second click instead of a modal
const armed = (el, label = 'Click again to confirm') => {
  if (el.dataset.armed) return true;
  const was = el.innerHTML; el.dataset.armed = '1'; el.innerHTML = icon('warning') + label;
  setTimeout(() => { if (el.isConnected) { el.innerHTML = was; delete el.dataset.armed; } }, 4000);
  return false;
};
const timeline = ev => `<ol class="relative grid gap-5 pl-8 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-line">${ev.map((e, i) => `<li class="relative">
  <span class="absolute -left-8 top-0.5 w-5 h-5 rounded-full grid place-items-center ${i === ev.length - 1 ? 'bg-indigo text-white' : 'bg-white text-indigo shadow-[inset_0_0_0_1.5px_#CFC6E6]'}">${icon(e.ic || 'circle', 'text-[12px]')}</span>
  <p class="text-[14px] leading-5">${esc(e.text)}</p><p class="mt-0.5 text-[12.5px] text-muted">${e.who ? esc(e.who) + ' · ' : ''}${dDate(e.at)}, ${dTime(e.at)}</p></li>`).join('')}</ol>`;
const note = (text, tone = 'indigo', ic = 'info') => `<p class="flex gap-3 rounded-2xl bg-${tone === 'indigo' ? 'indigo-tint text-indigo' : tone === 'sun' ? 'sun-tint text-sun-ink' : tone === 'bad' ? 'bad-tint text-bad-ink' : 'coral-tint text-coral-ink'} p-4 text-[13.5px] leading-5">${icon(ic)}<span>${text}</span></p>`;
function outOfScope(kind, tid) {
  const t = T(tid);
  return head({ title: `This ${kind} is outside your current scope` }) + `<section class="panel p-8 text-center max-w-xl">
    <span class="tile tile-sun mx-auto">${icon('lock')}</span>
    <p class="mt-4 text-[15px] leading-6">It belongs to <b>${esc(t.name)}</b>, and you're viewing ${esc(scopeName())}.</p>
    <button type="button" class="btn btn-p mt-5" data-act="scope" data-v="${t.id}">Switch to ${esc(t.short)}</button></section>`;
}
// Sample QR for pass previews (not a scannable code)
function qrSVG(text, px = 120) {
  let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const r = () => { h = Math.imul(h ^ h >>> 13, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const n = 25, fin = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  let d = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fin(x, y) && r() < .47) d += `M${x} ${y}h1v1h-1z`;
  const fp = (x, y) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" width="${px}" height="${px}" role="img" aria-label="Pass QR (sample)" shape-rendering="crispEdges"><path fill="#1F1A2E" fill-rule="evenodd" d="${fp(0, 0)}${fp(n - 7, 0)}${fp(0, n - 7)}${d}"/></svg>`;
}

// ================= Sign in =================
ROUTES.signin = { title: 'Sign in', render() {
  document.body.className = 'bg-cream font-sans text-ink antialiased';
  document.title = 'Sign in · Tamanly Admin';
  $('#app').innerHTML = `
  <div class="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    <section class="on-dark relative bg-indigo text-white px-6 pt-8 pb-16 sm:px-10 lg:p-12 xl:p-16 flex flex-col">
      <div class="flex items-center gap-3"><span class="mark"></span><span class="text-[22px] font-medium tracking-[-0.02em]">Tamanly</span><span class="chip chip-dark plain ml-1">Admin</span></div>
      <div class="mt-10 lg:my-auto max-w-[30rem]">
        <h1 class="text-[30px] sm:text-[36px] xl:text-[42px] leading-[1.1] font-bold tracking-[-0.03em]">Run every taman you manage from one console.</h1>
        <p class="mt-4 text-[15.5px] leading-relaxed text-lav">Permits and deposits, billing, visitors, facilities and the community marketplace, for the tamans under your management contract. Residents and guards use the Tamanly app.</p>
      </div>
      <ul class="hidden lg:grid gap-4 mt-12 text-[14px] text-[#EEEBF6] max-w-[30rem]">
        <li class="flex gap-3">${icon('lock', 'text-lav')}<span>You see your company's tamans and nothing else.</span></li>
        <li class="flex gap-3">${icon('sync', 'text-lav')}<span>Guardhouses sync visitor logs and contractor passes as they scan.</span></li>
        <li class="flex gap-3">${icon('history', 'text-lav')}<span>Every admin action is kept in the audit log.</span></li>
      </ul>
    </section>
    <section class="relative -mt-7 lg:mt-0 rounded-t-[28px] lg:rounded-none bg-cream px-5 sm:px-10 pt-10 pb-12 lg:p-12 flex lg:items-center justify-center">
      <div class="w-full max-w-[400px]">
        <h2 class="text-[24px] font-semibold tracking-[-0.02em]">Sign in to your organisation</h2>
        <p class="mt-1.5 text-[14.5px] leading-6 text-muted">Use your work email. Your company and its tamans load after you sign in.</p>
        <form data-form="signin" novalidate class="mt-8 grid gap-5">
          ${F({ k: 'email', label: 'Work email', type: 'email', v: ME.email, req: true, auto: 'username', msg: 'Enter your work email.' })}
          <p id="org-hint" class="-mt-3 flex items-center gap-2 text-[13px] text-ok-ink" aria-live="polite"></p>
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-1.5"><label for="f-password" class="text-[13px] font-medium">Password</label><button type="button" class="text-[13px] font-semibold text-indigo hover:underline" data-act="forgot">Forgot password?</button></div>
            <div class="relative"><input id="f-password" name="password" type="password" class="input pr-12" required autocomplete="current-password" data-msg="Enter your password."><button type="button" class="btn btn-g btn-sm btn-icon absolute right-1 top-1" data-act="peek" aria-label="Show password" aria-pressed="false">${icon('visibility')}</button></div>
            <p class="err" data-err="password"></p>
          </div>
          <label class="flex items-center gap-3 text-[14px]"><input type="checkbox" name="remember" checked>Keep me signed in on this device</label>
          <button type="submit" class="btn btn-p h-12 text-[15px] w-full">Sign in</button>
          <div class="flex items-center gap-3 text-[12.5px] text-muted"><span class="h-px flex-1 bg-line"></span>or<span class="h-px flex-1 bg-line"></span></div>
          <button type="button" class="btn btn-o h-12 w-full" data-act="sso">${icon('key')}Continue with company SSO</button>
        </form>
        <p class="mt-10 text-[12.5px] leading-5 text-muted">Prototype: any password signs in for <b class="font-semibold text-ink">@lestarifm.my</b>. All tamans, people and amounts are synthetic. <a class="font-semibold text-indigo underline" href="mobile.html">See every section on a phone</a></p>
      </div>
    </section>
  </div>`;
  LIVE.signin($('form[data-form="signin"]'));
} };
LIVE.signin = f => {
  const e = f.email.value.trim(), ok = /@lestarifm\.my$/i.test(e), hint = $('#org-hint');
  hint.className = `-mt-3 flex items-center gap-2 text-[13px] ${ok ? 'text-ok-ink' : 'text-muted'}`;
  hint.innerHTML = ok ? `${icon('verified', 'text-[18px]')}<span>${esc(ORG.name)} · ${TAMANS.length} tamans</span>` : e.includes('@') ? `${icon('domain', 'text-[18px]')}<span>We'll look up your organisation when you sign in.</span>` : '';
};
FORMS.signin = (d, f, btn) => {
  if (!/@lestarifm\.my$/i.test(d.email)) return fieldErr(f, 'email', 'No organisation on Tamanly uses this email domain. Check the address, or ask your company admin for an invite.');
  btn.classList.add('busy'); btn.textContent = 'Signing in…';
  setTimeout(() => { S.authed = true; if (!DEMO && d.remember) store.set('tm-auth', '1'); log('Signed in', '—', 'all'); render(); }, 650);
};
ACT.peek = el => { const i = $('#f-password'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.setAttribute('aria-pressed', show); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); el.innerHTML = icon(show ? 'visibility_off' : 'visibility'); };
ACT.forgot = () => { const e = $('#f-email').value.trim(); toast(e ? `If ${esc(e)} has an account, a reset link is on its way. It expires in 30 minutes.` : 'Enter your work email first, then choose Forgot password.'); };
ACT.sso = () => { S.authed = true; if (!DEMO) store.set('tm-auth', '1'); render(); toast(`Signed in with ${esc(ORG.short)} SSO`); };

// ================= Overview =================
function onsiteFlags(o) {
  const p = PM(o.permit), f = [];
  if (p.stopped) f.push(['Stop-work order', 'bad']);
  if (o.onSite > p.workers) f.push([`${o.onSite - p.workers} over limit`, 'coral']);
  if (o.note) f.push(['Noise report', 'sun']);
  return f;
}
const fmtHM = s => { const [h, m] = s.split(':').map(Number); return dTime(new Date(2026, 0, 1, h, m)); };
const until = tid => { const w = WORK_HOURS[tid]; return NOW.getDay() === 6 ? fmtHM(w.satTo) : NOW.getDay() === 0 ? 'no work today' : fmtHM(w.wkTo); };
ROUTES[''] = { title: 'Overview', render() {
  const P_ = PERMITS.filter(inScope), byOld = (a, k) => [...a].sort((x, y) => x[k] - y[k]);
  const groups = [
    { label: 'Permits to review', icon: 'assignment', tone: 'sun', href: '#/permits', rows: byOld(P_.filter(p => p.status === 'Pending Review'), 'submitted'),
      item: p => [`${p.category} · ${uname(p.unit)}`, `${p.applicant} · ${p.contractor} · ${ago(p.submitted)}`], act: p => `<a class="btn btn-t btn-sm" href="#/permit/${p.id}">Review</a>` },
    { label: 'Deposit receipts to verify', icon: 'request_quote', tone: 'coral', href: '#/reconciliation', rows: P_.filter(p => p.status === 'Pending Deposit' && p.depositState === 'Receipt uploaded'),
      item: p => [`${RM(p.deposit + p.fee)} · ${p.category} permit`, `${uname(p.unit)} · bank transfer receipt`], act: p => `<a class="btn btn-t btn-sm" href="#/permit/${p.id}">Verify</a>` },
    { label: 'Inspections due', icon: 'fact_check', tone: 'indigo', href: '#/refunds', rows: byOld(P_.filter(p => p.status === 'Inspection Scheduled'), 'inspection'),
      item: p => [`${uname(p.unit)} · ${p.category}`, `${dDay(p.inspection)}, ${dTime(p.inspection)} · ${RM(p.deposit)} deposit held`], act: p => `<button type="button" class="btn btn-t btn-sm" data-act="inspect" data-id="${p.id}">Inspect</button>` },
    { label: 'Payments to match', icon: 'account_balance', tone: 'coral', href: '#/reconciliation', rows: PAYMENTS.filter(x => inScope(x) && x.kind === 'Invoice' && (x.status === 'Unmatched' || x.status === 'Receipt to verify')),
      item: x => [`${RM(x.amount)} from ${x.payer}`, `${x.channel} · ${uname(x.unit)} · ${ago(x.at)}`], act: x => `<button type="button" class="btn btn-t btn-sm" data-act="match" data-id="${x.id}">${x.receipt ? 'Verify' : 'Match'}</button>` },
    { label: 'Bookings to approve', icon: 'event_available', tone: 'ok', href: '#/bookings', rows: BOOKINGS.filter(b => inScope(b) && b.status === 'Pending approval'),
      item: b => [`${FAC(b.facility).name} · ${b.purpose}`, `${dDay(b.start)}, ${dTime(b.start)} · ${uname(b.unit)}`], act: b => `<button type="button" class="btn btn-t btn-sm" data-act="bk-approve" data-id="${b.id}">Approve</button>` },
    { label: 'Reported listings', icon: 'flag', tone: 'bad', href: '#/reports', rows: REPORTS.filter(r => inScope(r) && r.status === 'Open'),
      item: r => [LISTINGS.find(l => l.id === r.listing).title, `${r.reason} · reported ${ago(r.at)}`], act: r => `<button type="button" class="btn btn-t btn-sm" data-act="report-open" data-id="${r.id}">Review</button>` },
    { label: 'Open incidents', icon: 'emergency_home', tone: 'bad', href: '#/incidents', rows: INCIDENTS.filter(i => inScope(i) && i.status !== 'Closed'),
      item: i => [i.title, `${i.sev} · ${i.where} · ${ago(i.at)}`], act: i => `<button type="button" class="btn btn-t btn-sm" data-act="incident-open" data-id="${i.id}">Open</button>` },
  ].filter(g => g.rows.length);
  const total = sum(groups, g => g.rows.length);
  const on = ONSITE.filter(inScope), flagged = on.filter(o => onsiteFlags(o).length);
  const today = VISITORS.filter(v => inScope(v) && v.in.toDateString() === NOW.toDateString());
  const inv = INVOICES.filter(inScope), oct = inv.filter(i => i.period === 'Oct 2026'), sep = inv.filter(i => i.period === 'Sep 2026');
  const billed = sum(oct, i => i.amount), collected = sum(oct, i => i.paid);
  const overdue = sep.filter(i => i.status === 'Overdue' || i.status === 'Partially paid');
  const units = UNITS.filter(inScope), held = escrowHeld(), heldN = PERMITS.filter(p => inScope(p) && p.depositState === 'Held').length;
  const cell = (label, value, foot, href, bar) => `<a href="${href}" class="block bg-white p-5 hover:bg-paper transition-colors"><p class="text-[13px] text-muted">${label}</p><p class="mt-1 text-[22px] leading-8 font-semibold tracking-[-0.02em] num">${value}</p>${bar != null ? `<div class="bar mt-2.5"><span style="width:${bar}%"></span></div>` : ''}<p class="mt-2 text-[12.5px] text-muted">${foot}</p></a>`;
  const g0 = NOW.getHours() < 12 ? 'Good morning' : NOW.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  return head({ title: `${g0}, ${ME.first}`, sub: `${NOW.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${esc(scopeName())}`,
    actions: `<button type="button" class="btn btn-t" data-act="new-invoice">${icon('receipt_long')}Create invoice</button><button type="button" class="btn btn-p" data-act="new-ann">${icon('campaign')}New announcement</button>` })
  + `<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
    <section class="panel" aria-labelledby="wl-h">
      <div class="flex items-center gap-3 px-5 sm:px-6 pt-5 pb-4"><h2 id="wl-h" class="text-[17px] font-semibold tracking-[-0.01em]">Waiting on you</h2>${total ? `<span class="count">${total}</span>` : ''}<span class="ml-auto text-[12.5px] text-muted hidden sm:inline">Longest waiting first</span></div>
      ${groups.length ? groups.map(g => `<div class="border-t border-line">
        <div class="flex items-center gap-3 px-5 sm:px-6 pt-4 pb-1.5">
          <span class="tile tile-${g.tone} w-8 h-8 rounded-[10px]">${icon(g.icon, 'text-[18px]')}</span>
          <h3 class="text-[14px] font-semibold">${g.label}</h3><span class="text-[13px] text-muted num">${g.rows.length}</span>
          <a class="ml-auto text-[13px] font-semibold text-indigo hover:underline whitespace-nowrap" href="${g.href}">See all</a>
        </div>
        <ul class="pb-3">${g.rows.slice(0, 2).map(r => { const [a, b] = g.item(r); return `<li class="flex items-center gap-3 px-5 sm:px-6 py-2 sm:pl-[68px]"><div class="min-w-0 flex-1"><p class="text-[14px] font-medium truncate">${esc(a)}</p><p class="text-[12.5px] text-muted truncate">${esc(b)}</p></div>${g.act(r)}</li>`; }).join('')}</ul>
      </div>`).join('') : `<div class="border-t border-line px-6 py-12 text-center"><span class="tile tile-ok mx-auto">${icon('task_alt')}</span><p class="mt-3 font-semibold">Nothing is waiting on you</p><p class="mt-1 text-[13.5px] text-muted">New permits, payments and reports for ${esc(scopeName())} will appear here.</p></div>`}
    </section>
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
      <section class="panel p-5" aria-labelledby="os-h">
        <div class="flex items-center gap-2"><h2 id="os-h" class="text-[16px] font-semibold">On site now</h2><span class="ml-auto flex items-center gap-2 text-[12.5px] text-muted"><span class="live"></span><span data-tick>Synced just now</span></span></div>
        <p class="mt-0.5 text-[13px] text-muted">${on.length} contractors · ${sum(on, o => o.onSite)} workers · Saturday work ends ${until(S.scope === 'all' ? 'dh' : S.scope)}</p>
        <ul class="mt-3 divide-y divide-line">${on.slice().sort((a, b) => onsiteFlags(b).length - onsiteFlags(a).length).slice(0, 5).map(o => { const p = PM(o.permit), fl = onsiteFlags(o)[0]; return `<li class="py-2.5 flex items-center gap-3"><div class="min-w-0 flex-1"><p class="text-[13.5px] font-semibold truncate">${esc(p.contractor)}</p><p class="text-[12.5px] text-muted truncate">${esc(uname(p.unit))} · ${o.onSite}/${p.workers} workers</p></div>${fl ? stc(fl[0], fl[1]) : ''}</li>`; }).join('') || `<li class="py-6 text-center text-[13.5px] text-muted">No contractors on site.</li>`}</ul>
        <a class="btn btn-o btn-sm w-full mt-3" href="#/onsite">${flagged.length ? `${flagged.length} need attention · ` : ''}Open live board</a>
      </section>
      <section class="panel p-5" aria-labelledby="gt-h">
        <div class="flex items-center"><h2 id="gt-h" class="text-[16px] font-semibold">Today at the gates</h2><a class="ml-auto text-[13px] font-semibold text-indigo hover:underline" href="#/visitors">Registry</a></div>
        <dl class="mt-3 grid grid-cols-3 gap-2">${[['Inside now', today.filter(v => v.status === 'Inside').length], ['Expected', today.filter(v => v.status === 'Expected').length], ['Denied', today.filter(v => v.status === 'Denied').length]].map(([k, v]) => `<div class="rounded-2xl bg-paper px-3 py-3"><dt class="text-[12.5px] text-muted">${k}</dt><dd class="mt-0.5 text-[20px] font-semibold num">${v}</dd></div>`).join('')}</dl>
        <p class="mt-3 text-[12.5px] text-muted">${today.length} visitors logged since midnight · ${today.filter(v => v.via === 'Pre-registered QR').length} with pre-registered QR passes</p>
      </section>
    </div>
  </div>
  <section class="mt-6 panel overflow-hidden" aria-label="This month">
    <div class="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
      ${cell('October fees collected', RM0(collected), `${pct(collected, billed)}% of ${RM0(billed)} billed · due 15 Oct`, '#/invoices', pct(collected, billed))}
      ${cell('September overdue', RM0(sum(overdue, i => i.amount - i.paid)), `${overdue.length} units · late charges start after 7 days`, '#/invoices', null)}
      ${cell('Deposits held in escrow', RM0(held), `${heldN} active permits · refunds after inspection`, '#/escrow', null)}
      ${cell('Occupancy', occRate(units) + '%', `${units.filter(u => u.status === 'Vacant').length} vacant · ${units.filter(u => u.status === 'Under notice').length} under notice`, '#/units', occRate(units))}
    </div>
  </section>`;
} };
setInterval(() => { const s = Math.floor((performance.now() - LOADED) / 1000) % 15; $$('[data-tick]').forEach(el => { el.textContent = s < 2 ? 'Synced just now' : `Synced ${s} s ago`; }); }, 1000);

// ================= Properties =================
ROUTES.tamans = { title: 'Tamans', render: () => head({ title: 'Tamans', path: 'tamans', sub: `The tamans ${esc(ORG.short)} manages. Add one when a new management contract starts.`, actions: `<button type="button" class="btn btn-p" data-act="taman-new">${icon('add')}Add taman</button>` })
  + ixHTML({ id: 'tamans', noun: 'tamans', ph: 'Search taman, town or manager', rows: () => TAMANS.map(t => ({ ...t, taman: t.id })), text: t => `${t.name} ${t.city} ${t.manager}`,
    filters: [{ k: 'kind', label: 'Type', all: 'All types', opts: ['Landed', 'Strata'] }],
    cols: [
      { h: 'Taman', v: t => t2(t.name, t.city), s: t => t.name, t: t => t.name },
      { h: 'Type', v: t => esc(t.kind), s: t => t.kind },
      { h: 'Units', num: true, v: t => N(unitsOf(t.id).length), s: t => unitsOf(t.id).length },
      { h: 'Occupancy', v: t => { const o = occRate(unitsOf(t.id)); return `<div class="flex items-center gap-2 min-w-[120px]"><div class="bar flex-1"><span style="width:${o}%"></span></div><span class="num text-[13px] w-9 text-right">${o}%</span></div>`; }, cv: t => occRate(unitsOf(t.id)) + '%', s: t => occRate(unitsOf(t.id)), t: t => occRate(unitsOf(t.id)) + '%' },
      { h: 'Streets / blocks', num: true, v: t => t.blocks.length, s: t => t.blocks.length },
      { h: 'Manager', v: t => esc(t.manager), s: t => t.manager },
      { h: 'Contract', badge: true, v: t => T(t.id).ending ? stc(`Ends ${dShort(T(t.id).ending)}`, 'sun') : stc('Active') },
    ], open: t => tamanDrawer(T(t.id)), emptyText: 'Add the first taman your company manages.' }) };
ACT['taman-new'] = () => tamanDrawer();
function tamanDrawer(t) {
  const isNew = !t, units = t ? unitsOf(t.id) : [];
  drawer({ title: isNew ? 'Add taman' : esc(t.name), sub: isNew ? `Adds a taman to ${esc(ORG.short)}'s portfolio` : `${esc(t.city)} · ${t.kind}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Details', grid(
        F({ k: 'name', label: 'Taman name', v: t?.name, req: true, span: true, af: isNew, ph: 'e.g. Taman Sri Mewah' }),
        F({ k: 'city', label: 'Town and state', v: t?.city, req: true, ph: 'e.g. Kajang, Selangor' }),
        F({ k: 'kind', label: 'Property type', type: 'select', v: t?.kind || 'Landed', opts: ['Landed', 'Strata'], req: true }),
        F({ k: 'manager', label: 'Taman manager', type: 'select', v: t?.manager, opts: staffNames(), req: true, ph: 'Choose a manager' }),
        F({ k: 'gates', label: 'Guarded gates', type: 'number', v: t?.gates ?? 1, min: 0, max: 6, req: true }),
        F({ k: 'phone', label: 'Management office phone', type: 'tel', v: t?.phone, req: true, ph: '+60 3-…' }),
        isNew ? F({ k: 'start', label: 'Management contract starts', type: 'date', v: '2026-11-01', req: true }) : ''))}
      ${isNew ? note(`Only ${esc(ORG.name)} staff can see this taman. Residents join after you add units and send invites.`, 'indigo', 'lock')
        : sect('Portfolio', dl([['Units', N(units.length)], ['Occupancy', occRate(units) + '%'], ['Streets / blocks', esc(t.blocks.join(', ')) || '—', true]]))
        + sect('End management contract', `<button type="button" class="btn btn-d" data-act="taman-end" data-id="${t.id}">${icon('logout')}End contract on 31 Dec 2026</button>`, { sub: 'Hands the taman back. Residents keep the app; your staff lose access on the end date.' })}
    </form>`,
    foot: footSave(isNew ? 'Add taman' : 'Save changes'),
    submit: d => {
      const rec = { name: d.name.trim(), city: d.city.trim(), kind: d.kind, manager: d.manager, gates: +d.gates, phone: d.phone.trim() };
      if (isNew) {
        const id = 't' + TAMANS.length;
        TAMANS.push({ id, short: rec.name.replace(/^(Taman|Residensi)\s+/i, ''), blocks: [], size: 0, fee: 0, ...rec });
        WORK_HOURS[id] = { ...WORK_HOURS.dh }; BRANDING[id] = { primary: '#3D2B6B', accent: '#E87A6B', logo: null }; SOS[id] = [['Guardhouse', ''], ['Police (PDRM)', '999']];
        log('Added taman', rec.name, id); toast(`${esc(rec.name)} added. Add its streets or blocks next.`, { href: '#/units', label: 'Add units' });
      } else { Object.assign(t, rec); log('Updated taman details', t.name, t.id); toast('Taman details saved'); }
      rerender();
    } });
}
ACT['taman-end'] = el => { if (!armed(el)) return; const t = T(el.dataset.id); t.ending = new Date(2026, 11, 31); log('Ended management contract', t.name, t.id); closeDrawer(); rerender(); toast(`Contract for ${esc(t.name)} ends on 31 Dec 2026`); };

const blocksOf = (tid, b) => UNITS.filter(u => u.taman === tid && u.block === b);
ROUTES.units = { title: 'Blocks & units', render() {
  const tab = tabOf('units', 'units');
  return head({ title: 'Blocks & units', path: 'units', sub: 'Every unit with its owner, tenant and occupancy status. Owners and tenants here are who the app treats as residents.',
    actions: tab === 'units' ? `<button type="button" class="btn btn-p" data-act="unit-new">${icon('add')}Add unit</button>` : `<button type="button" class="btn btn-p" data-act="block-new">${icon('add')}Add street or block</button>` })
    + tabs('units', [['units', 'Units', N(UNITS.filter(inScope).length)], ['blocks', 'Streets & blocks', sum(myTamans(), t => t.blocks.length)]])
    + (tab === 'units' ? ixHTML({ id: 'units', noun: 'units', ph: 'Search unit, owner or tenant', rows: () => UNITS,
      text: u => `${u.name} ${pn(u.owner)} ${u.tenant ? pn(u.tenant) : ''}`,
      filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Occupied', 'Vacant', 'Under notice'] }, { k: 'block', label: 'Street or block', all: 'All streets & blocks', opts: myTamans().flatMap(t => t.blocks) }, { k: 'kind', label: 'Type', all: 'All types', opts: [...new Set(UNITS.filter(inScope).map(u => u.kind))] }],
      cols: [
        { h: 'Unit', v: u => t2(u.name, `${T(u.taman).short} · ${u.kind}`), s: u => u.ord, t: u => `${u.name}, ${T(u.taman).name}` },
        { h: 'Owner', v: u => esc(pn(u.owner)), s: u => pn(u.owner), t: u => pn(u.owner) },
        { h: 'Tenant', v: u => u.tenant ? esc(pn(u.tenant)) : muted('—'), s: u => u.tenant ? pn(u.tenant) : '' },
        { h: 'Size', num: true, hide: 'hidden xl:table-cell', v: u => `${N(u.sqft)} sq ft`, s: u => u.sqft },
        { h: 'Monthly charge', num: true, v: u => RM(u.fee), s: u => u.fee },
        { h: 'Status', badge: true, v: u => stc(u.status), s: u => u.status, t: u => u.status },
      ], sort: 0, dir: 1, open: u => unitDrawer(u) })
    : ixHTML({ id: 'blocks', noun: 'streets & blocks', one: 'street or block', ph: 'Search street or block', rows: () => TAMANS.flatMap(t => t.blocks.map(b => ({ id: t.id + '|' + b, taman: t.id, name: b }))),
      text: b => `${b.name} ${T(b.taman).name}`, filters: [tamanF()],
      cols: [
        { h: 'Street or block', v: b => t2(b.name, T(b.taman).name), s: b => b.name, t: b => b.name },
        { h: 'Taman', taman: true, v: b => esc(T(b.taman).short), cardOnly: true },
        { h: 'Units', num: true, v: b => N(blocksOf(b.taman, b.name).length), s: b => blocksOf(b.taman, b.name).length },
        { h: 'Occupancy', num: true, v: b => occRate(blocksOf(b.taman, b.name)) + '%' },
        { h: 'Type', v: b => T(b.taman).kind },
      ], open: b => blockDrawer(b) }));
}, after: id => { if (id && U(id)) U(id) && inScope(U(id)) ? unitDrawer(U(id)) : toast('That unit is outside the current taman scope.'); } };
ACT['unit-new'] = () => unitDrawer();
ACT['block-new'] = () => blockDrawer();
function unitDrawer(u) {
  const isNew = !u, out = u ? INVOICES.filter(i => i.unit === u.id && ['Due', 'Overdue', 'Partially paid'].includes(i.status)) : [];
  drawer({ title: isNew ? 'Add unit' : esc(u.name), sub: isNew ? esc(scopeName()) : `${esc(T(u.taman).name)} · ${esc(u.kind)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${isNew ? sect('Unit', grid(
        F({ k: 'block', label: 'Taman and street or block', type: 'select', opts: myTamans().flatMap(x => x.blocks.map(b => [x.id + '|' + b, `${x.short} · ${b}`])), req: true, ph: 'Choose', span: true, msg: 'Choose where the unit is.' }),
        F({ k: 'name', label: 'Unit number', req: true, ph: 'e.g. No. 52, Jalan Harmoni 8 or A-18-11', span: true, af: true }),
        F({ k: 'kind', label: 'Type', type: 'select', opts: ['Double-storey terrace', 'Corner lot', 'Semi-D', 'Bungalow', 'Condo 2R2B', 'Condo 3R2B', 'Condo 4R3B'], req: true }),
        F({ k: 'sqft', label: 'Built-up (sq ft)', type: 'number', min: 100, req: true }),
        F({ k: 'fee', label: 'Monthly charge', type: 'money', req: true })))
      : sect('Unit', dl([['Street or block', esc(u.block)], ['Built-up', `${N(u.sqft)} sq ft`], ['Monthly charge', RM(u.fee)], ['Outstanding', out.length ? `<span class="font-semibold text-bad-ink">${RM(sum(out, i => i.amount - i.paid))}</span> · ${out.length} invoice${out.length > 1 ? 's' : ''}` : 'Nothing outstanding']]))}
      ${sect('Occupancy', grid(
        F({ k: 'status', label: 'Status', type: 'radio', cols: 3, v: u?.status || 'Vacant', opts: ['Occupied', 'Vacant', 'Under notice'], req: true, span: true }),
        F({ k: 'notice', label: 'Tenant moves out on', type: 'date', when: 'status=Under notice', req: true, v: '2026-10-31' }),
        F({ k: 'owner', label: 'Owner', v: u ? pn(u.owner) : '', req: true, ph: 'Full name as on the title', msg: 'Every unit needs an owner.' }),
        F({ k: 'tenant', label: 'Tenant', v: u?.tenant ? pn(u.tenant) : '', ph: 'Empty if owner-occupied or vacant' })), { sub: 'Sub-tenants and their access are set under Occupants.' })}
      ${isNew ? '' : `<a class="btn btn-o w-full" href="#/occupants">${icon('group')}Sub-tenants and access</a>`}
    </form>`,
    foot: (isNew ? '' : `<button type="button" class="btn btn-d sm:mr-auto" data-act="unit-del" data-id="${u.id}">${icon('delete')}Delete unit</button>`) + footSave(isNew ? 'Add unit' : 'Save changes'),
    submit: (d, f) => {
      if (d.status === 'Occupied' && !d.owner) return fieldErr(f, 'owner', 'Every unit needs an owner.');
      if (isNew) {
        const [tid, block] = d.block.split('|');
        if (UNITS.some(x => x.taman === tid && x.name.toLowerCase() === d.name.trim().toLowerCase())) return fieldErr(f, 'name', `${d.name} already exists in ${T(tid).short}.`);
        u = { id: `${tid}-${UNITS.length + 1}`, taman: tid, block, name: d.name.trim(), kind: d.kind, sqft: +d.sqft, fee: +d.fee, status: d.status, owner: null, tenant: null, ord: UNITS.length };
        UNITS.push(u); UNIT.set(u.id, u);
      }
      const owner = findOrNew(d.owner), tenant = d.tenant ? findOrNew(d.tenant) : null;
      const oo = OCC.find(o => o.unit === u.id && o.rel === 'Owner');
      if (oo) oo.person = owner; else OCC.push({ id: 'o' + OCC.length, unit: u.id, taman: u.taman, person: owner, rel: 'Owner', since: clock(), status: 'Active', scopes: [] });
      const to = OCC.find(o => o.unit === u.id && o.rel === 'Tenant');
      if (tenant && to) to.person = tenant; else if (tenant) OCC.push({ id: 'o' + OCC.length, unit: u.id, taman: u.taman, person: tenant, rel: 'Tenant', since: clock(), status: 'Active', scopes: [] });
      else if (to) OCC.splice(OCC.indexOf(to), 1);
      if (to && d.status === 'Under notice') { to.status = 'Ending'; to.ends = new Date(d.notice); }
      Object.assign(u, { status: d.status, owner, tenant });
      log(isNew ? 'Added unit' : 'Updated unit', u.name, u.taman); toast(isNew ? `${esc(u.name)} added` : `${esc(u.name)} saved`); rerender();
    } });
}
ACT['unit-del'] = el => { if (!armed(el, 'Delete unit and its history?')) return; const u = U(el.dataset.id); UNITS.splice(UNITS.indexOf(u), 1); UNIT.delete(u.id); log('Deleted unit', u.name, u.taman); closeDrawer(); rerender(); toast(`${esc(u.name)} deleted`); };
function blockDrawer(b) {
  const isNew = !b, n = b ? blocksOf(b.taman, b.name).length : 0;
  drawer({ title: isNew ? 'Add street or block' : esc(b.name), sub: b ? esc(T(b.taman).name) : '',
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Details', grid(
      isNew ? F({ k: 'taman', label: 'Taman', type: 'select', opts: tamanOpts(), v: myTamans()[0].id, req: true, span: true }) : '',
      F({ k: 'name', label: 'Street or block name', v: b?.name, req: true, span: true, af: true, ph: 'e.g. Jalan Harmoni 9 or Block D', hint: isNew ? '' : `Renaming updates the address of all ${n} units on it.` })))}
      ${isNew ? '' : sect('Remove', n ? `<p class="text-[13.5px] text-muted">Move or delete its ${n} units first. A street or block with units can't be removed.</p>` : `<button type="button" class="btn btn-d" data-act="block-del" data-id="${esc(b.id)}">${icon('delete')}Remove ${esc(b.name)}</button>`)}</form>`,
    foot: footSave(isNew ? 'Add' : 'Save'),
    submit: (d, f) => {
      const name = d.name.trim(), t = T(isNew ? d.taman : b.taman);
      if (t.blocks.some(x => x.toLowerCase() === name.toLowerCase() && x !== b?.name)) return fieldErr(f, 'name', `${t.short} already has ${name}.`);
      if (isNew) t.blocks.push(name);
      else { t.blocks[t.blocks.indexOf(b.name)] = name; blocksOf(t.id, b.name).forEach(u => { u.block = name; u.name = u.name.replace(b.name, name); }); }
      log(isNew ? 'Added street/block' : 'Renamed street/block', name, t.id); toast(`${esc(name)} saved`); rerender();
    } });
}
ACT['block-del'] = el => { const [tid, name] = el.dataset.id.split('|'); const t = T(tid); t.blocks.splice(t.blocks.indexOf(name), 1); log('Removed street/block', name, tid); closeDrawer(); rerender(); toast(`${esc(name)} removed`); };

ROUTES.occupants = { title: 'Occupants', render: () => head({ title: 'Occupants', path: 'occupants', sub: 'Who is linked to each unit and what they can do in the app. Sub-tenants only get the access their owner or tenant grants.', actions: `<button type="button" class="btn btn-p" data-act="occ-new">${icon('person_add')}Assign occupant</button>` })
  + ixHTML({ id: 'occupants', noun: 'occupants', ph: 'Search name, phone or unit', rows: () => OCC, text: o => `${pn(o.person)} ${PERSON.get(o.person)?.phone} ${uname(o.unit)}`,
    filters: [tamanF(), { k: 'rel', label: 'Relationship', all: 'All relationships', opts: ['Owner', 'Tenant', 'Sub-tenant'] }, { k: 'status', label: 'Status', all: 'All statuses', opts: ['Active', 'Invite pending', 'Ending'] }],
    cols: [
      { h: 'Person', v: o => t2(pn(o.person), PERSON.get(o.person)?.phone), s: o => pn(o.person), t: o => pn(o.person) },
      { h: 'Unit', v: o => t2(uname(o.unit), T(o.taman).short), s: o => U(o.unit)?.ord, t: o => uname(o.unit) },
      { h: 'Relationship', v: o => chip(o.rel, o.rel === 'Owner' ? 'indigo' : o.rel === 'Tenant' ? 'sun' : 'coral', true), s: o => o.rel, t: o => o.rel },
      { h: 'App access', v: o => o.rel === 'Sub-tenant' ? `<div class="flex flex-wrap gap-1">${o.scopes.map(s => chip(s, 'mute', true)).join('')}</div>` : muted(`Full ${o.rel.toLowerCase()} access`), cv: o => o.rel === 'Sub-tenant' ? esc(o.scopes.join(', ')) : 'Full', t: o => o.rel === 'Sub-tenant' ? o.scopes.join('; ') : 'Full' },
      { h: 'Since', v: o => dDate(o.since), s: o => o.since, hide: 'hidden lg:table-cell' },
      { h: 'Status', badge: true, v: o => o.status === 'Ending' && o.ends ? stc(`Leaving ${dShort(o.ends)}`, 'sun') : stc(o.status), s: o => o.status, t: o => o.status },
    ], open: o => occDrawer(o) }) };
ACT['occ-new'] = () => occDrawer();
function occDrawer(o) {
  const isNew = !o;
  drawer({ title: isNew ? 'Assign occupant' : esc(pn(o.person)), sub: isNew ? 'Link a person to a unit and choose their access' : `${o.rel} · ${esc(uname(o.unit))}, ${esc(T(o.taman).short)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${isNew ? sect('Who and where', grid(
        F({ k: 'unit', label: 'Unit', req: true, list: 'unit-list', ph: 'Start typing, e.g. No. 12, Jalan Harmoni 3', span: true, af: true, msg: 'Choose a unit from the list.' }),
        F({ k: 'name', label: 'Full name', req: true }), F({ k: 'phone', label: 'Mobile number', type: 'tel', req: true, ph: '+60 12-345 6789', hint: 'The invite goes to this number by SMS.' }),
        F({ k: 'rel', label: 'Relationship', type: 'radio', cols: 3, v: 'Sub-tenant', req: true, span: true, opts: [['Owner', 'Owner'], ['Tenant', 'Tenant'], ['Sub-tenant', 'Sub-tenant', 'Limited access']] }))
        + `<datalist id="unit-list">${UNITS.filter(inScope).map(u => `<option value="${esc(u.name)}">${esc(T(u.taman).short)}</option>`).join('')}</datalist>`)
      : sect('Details', dl([['Phone', `<span class="whitespace-nowrap">${esc(PERSON.get(o.person)?.phone)}</span>`], ['Unit', `${esc(uname(o.unit))}, ${esc(T(o.taman).short)}`], ['Since', dDate(o.since)], o.grantedBy && ['Access granted by', esc(o.grantedBy)]]))}
      ${isNew || o.rel === 'Sub-tenant' ? sect('App access', F({ k: 'scopes', label: 'This person can', type: 'checks', noOpt: true, opts: SCOPES, v: o?.scopes || ['Bills: view', 'Visitor passes'], when: isNew ? 'rel=Sub-tenant' : '', hint: '“Bills: pay” lets them pay on the owner’s behalf; without it they only see amounts.' }), { sub: 'Owners and tenants have full access to their unit.' }) : ''}
    </form>`,
    foot: (isNew ? '' : `<button type="button" class="btn btn-d sm:mr-auto" data-act="occ-end" data-id="${o.id}">${icon('person_remove')}End access</button>`) + footSave(isNew ? 'Send invite' : 'Save access'),
    submit: (d, f) => {
      if (isNew) {
        const u = UNITS.find(x => inScope(x) && x.name.toLowerCase() === d.unit.trim().toLowerCase());
        if (!u) return fieldErr(f, 'unit', 'No unit with that number in your tamans. Pick one from the suggestions.');
        if (d.rel === 'Sub-tenant' && !(d.scopes || []).length) return fieldErr(f, 'scopes', 'Give at least one kind of access.');
        const p = newPerson(d.name.trim()); p.phone = d.phone.trim();
        OCC.unshift({ id: 'o' + OCC.length, unit: u.id, taman: u.taman, person: p.id, rel: d.rel, since: clock(), status: 'Invite pending', scopes: d.rel === 'Sub-tenant' ? d.scopes : [] });
        USERS.push({ id: p.id, name: p.name, contact: p.phone, role: d.rel === 'Owner' ? 'Owner' : d.rel === 'Tenant' ? 'Resident' : 'Sub-tenant', tamans: [u.taman], units: [u.id], status: 'Invited', last: clock() });
        log('Invited occupant', `${p.name} → ${u.name}`, u.taman); toast(`Invite sent to ${esc(p.phone)}`);
      } else { o.scopes = d.scopes || []; log('Changed sub-tenant access', pn(o.person), o.taman); toast('Access updated'); }
      rerender();
    } });
}
ACT['occ-end'] = el => { if (!armed(el, 'End access now?')) return; const o = OCC.find(x => x.id === el.dataset.id); OCC.splice(OCC.indexOf(o), 1); log('Ended occupant access', pn(o.person), o.taman); closeDrawer(); rerender(); toast(`${esc(pn(o.person))} no longer has access to ${esc(uname(o.unit))}`); };

// ================= People & access =================
const userScope = u => S.scope === 'all' || u.tamans.includes(S.scope);
ROUTES.users = { title: 'Users', render: () => head({ title: 'Users', path: 'users', sub: 'Everyone with a Tamanly account in your tamans: staff, guards, owners, residents and sub-tenants.', actions: `<button type="button" class="btn btn-p" data-act="user-new">${icon('person_add')}Invite user</button>` })
  + ixHTML({ id: 'users', noun: 'users', ph: 'Search name, phone or email', rows: () => USERS, scope: userScope, text: u => `${u.name} ${u.contact} ${u.title || ''} ${u.role}`,
    filters: [{ ...tamanF(), test: (u, v) => u.tamans.includes(v) }, { k: 'role', label: 'Role', all: 'All roles', opts: ['Management staff', 'Security', 'Owner', 'Resident', 'Sub-tenant'] }, { k: 'status', label: 'Status', all: 'All statuses', opts: ['Active', 'Invited', 'Suspended'] }],
    cols: [
      { h: 'Name', v: u => t2(u.name, u.contact), s: u => u.name, t: u => u.name },
      { h: 'Role', v: u => `${chip(u.role, u.role === 'Management staff' ? 'indigo' : u.role === 'Security' ? 'sun' : u.role === 'Sub-tenant' ? 'coral' : 'mute', true)}${u.title ? `<span class="ml-2 text-[12.5px] text-muted">${esc(u.title)}</span>` : ''}`, cv: u => esc(u.title || u.role), s: u => u.role, t: u => u.title || u.role },
      { h: 'Tamans', v: u => esc(u.tamans.length === TAMANS.length && u.tamans.length > 1 ? 'All tamans' : u.tamans.map(t => T(t).short).join(', ')), s: u => u.tamans.join() },
      { h: 'Units', hide: 'hidden xl:table-cell', v: u => u.units.length ? esc(uname(u.units[0])) + (u.units.length > 1 ? muted(` +${u.units.length - 1}`) : '') : muted('—') },
      { h: 'Last active', v: u => ago(u.last), s: u => u.last },
      { h: 'Status', badge: true, v: u => stc(u.status), s: u => u.status, t: u => u.status },
    ], sort: 0, dir: 1, open: u => userDrawer(u) }),
  after: id => { const u = id && USERS.find(x => x.id === id); if (u) userDrawer(u); } };
ACT['user-new'] = () => userDrawer();
function userDrawer(u) {
  const isNew = !u;
  drawer({ title: isNew ? 'Invite user' : esc(u.name), sub: isNew ? 'They get an SMS or email link to set up their account' : `${esc(u.title || u.role)} · ${esc(u.contact)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${isNew ? sect('Person', grid(F({ k: 'name', label: 'Full name', req: true, af: true, span: true }), F({ k: 'contact', label: 'Mobile number or work email', req: true, span: true, ph: '+60 12-345 6789 or name@lestarifm.my' }))) : sect('Account', dl([['Units', esc(u.units.map(uname).join(', ')) || '—', true], ['Last active', ago(u.last)], ['Status', stc(u.status)]]))}
      ${sect('Role and tamans', grid(
        F({ k: 'role', label: 'Role', type: 'select', req: true, v: u?.title || u?.role || 'Taman manager', opts: [['Portfolio admin', 'Portfolio admin (staff)'], ['Taman manager', 'Taman manager (staff)'], ['Billing ops', 'Billing ops (staff)'], ['Security lead', 'Security lead (staff)'], ['Guard', 'Guard'], ['Owner', 'Owner'], ['Resident', 'Resident (tenant)'], ['Sub-tenant', 'Sub-tenant']], span: true, hint: 'What each role can do is set in Roles & permissions.' }),
        F({ k: 'tamans', label: 'Tamans', type: 'checks', noOpt: true, opts: myTamans().map(t => [t.id, t.short]), v: u?.tamans || myTamans().map(t => t.id), span: true, hint: `You can only grant access to tamans ${esc(ORG.short)} manages.` })))}
      ${isNew ? '' : sect('Access', `<div class="flex flex-wrap gap-2">${u.status === 'Invited' ? `<button type="button" class="btn btn-o" data-act="user-resend" data-id="${u.id}">${icon('send')}Resend invite</button>` : ''}<button type="button" class="btn btn-o" data-act="user-reset" data-id="${u.id}">${icon('lock_reset')}Send sign-in reset</button>${u.status === 'Suspended' ? `<button type="button" class="btn btn-t" data-act="user-suspend" data-id="${u.id}">${icon('lock_open')}Reactivate</button>` : `<button type="button" class="btn btn-d" data-act="user-suspend" data-id="${u.id}">${icon('block')}Suspend</button>`}</div>`)}
    </form>`,
    foot: footSave(isNew ? 'Send invite' : 'Save changes'),
    submit: (d, f) => {
      if (!d.tamans.length) return fieldErr(f, 'tamans', 'Choose at least one taman.');
      const staff = ['Portfolio admin', 'Taman manager', 'Billing ops', 'Security lead'].includes(d.role);
      const role = staff ? 'Management staff' : d.role === 'Guard' ? 'Security' : d.role;
      if (isNew) { USERS.unshift({ id: 'x' + USERS.length, name: d.name.trim(), contact: d.contact.trim(), role, title: staff || d.role === 'Guard' ? d.role : undefined, tamans: d.tamans, units: [], status: 'Invited', last: clock() }); log('Invited user', d.name, d.tamans[0]); toast(`Invite sent to ${esc(d.contact)}`); }
      else { const was = u.title || u.role; Object.assign(u, { role, title: staff || d.role === 'Guard' ? d.role : undefined, tamans: d.tamans }); if (was !== d.role) log('Changed user role', `${u.name}: ${was} → ${d.role}`, d.tamans[0]); toast('User saved'); }
      rerender();
    } });
}
ACT['user-resend'] = el => toast(`Invite resent to ${esc(USERS.find(u => u.id === el.dataset.id).contact)}`);
ACT['user-reset'] = el => { const u = USERS.find(x => x.id === el.dataset.id); log('Sent sign-in reset', u.name); toast(`Sign-in reset link sent to ${esc(u.contact)}`); };
ACT['user-suspend'] = el => { const u = USERS.find(x => x.id === el.dataset.id); if (u.status !== 'Suspended' && !armed(el, 'Suspend this account?')) return; u.status = u.status === 'Suspended' ? 'Active' : 'Suspended'; log(u.status === 'Suspended' ? 'Suspended user' : 'Reactivated user', u.name); closeDrawer(); rerender(); toast(`${esc(u.name)} is ${u.status.toLowerCase()}`); };

const PERM_DRAFT = {};
const permLevel = (sel, m, r) => {
  const k = `${sel}|${m}|${r}`; if (k in PERM_DRAFT) return PERM_DRAFT[k];
  const base = PERM_DEFAULT[r][MODULES.indexOf(m)];
  return sel === 'default' ? base : PERM_OVERRIDE[sel]?.[`${r}|${m}`] ?? base;
};
ROUTES.roles = { title: 'Roles & permissions', render() {
  let sel = tabOf('roleT', 'default'); if (sel !== 'default' && !myTamans().some(t => t.id === sel)) sel = S.tab.roleT = 'default';
  const dirty = Object.keys(PERM_DRAFT).filter(k => k.startsWith(sel + '|')).length;
  const lvIcon = ['block', 'visibility', 'edit', 'verified_user'];
  const cell = (m, r) => {
    const L = permLevel(sel, m, r), locked = r === 'Portfolio admin', k = `${sel}|${m}|${r}`;
    const ovr = sel !== 'default' && !(k in PERM_DRAFT) && PERM_OVERRIDE[sel]?.[`${r}|${m}`] != null;
    return `<td class="text-center"><button type="button" class="perm l${L} ${k in PERM_DRAFT ? 'dirty' : ovr ? 'ovr' : ''}" data-act="perm" data-m="${esc(m)}" data-r="${esc(r)}" ${locked ? 'disabled title="Portfolio admins always have full access"' : ''} aria-label="${esc(r)}, ${esc(m)}: ${LEVELS[L]}${ovr ? ' (taman override)' : ''}. Change level">${icon(locked ? 'lock' : lvIcon[L])}${LEVELS[L]}</button></td>`;
  };
  return head({ title: 'Roles & permissions', path: 'roles', sub: 'What each role can do, per taman. A taman inherits the portfolio default unless you override a cell for it.' })
    + `<div class="seg mb-5 max-w-full overflow-x-auto no-sb" role="tablist" aria-label="Permissions for">${[['default', 'Portfolio default'], ...myTamans().map(t => [t.id, t.short])].map(([v, l]) => `<button type="button" role="tab" aria-selected="${sel === v}" data-act="tab" data-k="roleT" data-v="${v}">${esc(l)}</button>`).join('')}</div>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 border-b border-line text-[12.5px] text-muted">
        <span><b class="text-ink font-semibold">Click a cell</b> to cycle its level.</span>
        ${LEVELS.map((l, i) => `<span class="inline-flex items-center gap-1.5"><span class="perm l${i} h-6 px-2">${icon(lvIcon[i])}${l}</span>${['No access', 'See only', 'Create and edit', 'Approve, delete, configure'][i]}</span>`).join('')}
        ${sel !== 'default' ? `<span class="inline-flex items-center gap-1.5"><span class="perm l1 ovr h-6 px-2">Edit</span>Override for this taman</span>` : ''}
      </div>
      <div class="overflow-x-auto"><table class="tbl min-w-[1040px]"><thead><tr><th class="sticky left-0 z-10 bg-paper">Module</th>${ROLES.map(r => `<th class="text-center">${r}</th>`).join('')}</tr></thead>
      <tbody>${MODULES.map(m => `<tr><td class="sticky left-0 z-10 bg-white font-medium whitespace-nowrap">${m}</td>${ROLES.map(r => cell(m, r)).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="sticky bottom-0 flex flex-wrap items-center gap-3 px-5 py-3 border-t border-line bg-white" ${dirty ? '' : 'hidden'}>
        <span class="text-[13.5px]"><b class="font-semibold">${dirty} unsaved change${dirty === 1 ? '' : 's'}</b> for ${sel === 'default' ? 'the portfolio default' : esc(T(sel).name)}</span>
        <span class="ml-auto flex gap-2"><button type="button" class="btn btn-o" data-act="perm-discard">Discard</button><button type="button" class="btn btn-p" data-act="perm-save">Save permissions</button></span>
      </div>
    </section>
    <p class="mt-4 text-[13px] text-muted">Owners, residents and sub-tenants use these levels in the mobile app; a sub-tenant never gets more than the access their owner or tenant grants under Occupants.</p>`;
} };
ACT.perm = el => { const sel = tabOf('roleT', 'default'), m = el.dataset.m, r = el.dataset.r, k = `${sel}|${m}|${r}`; const next = (permLevel(sel, m, r) + 1) % 4; const base = sel === 'default' ? PERM_DEFAULT[r][MODULES.indexOf(m)] : PERM_OVERRIDE[sel]?.[`${r}|${m}`] ?? PERM_DEFAULT[r][MODULES.indexOf(m)]; if (next === base) delete PERM_DRAFT[k]; else PERM_DRAFT[k] = next; rerender(); $(`[data-act="perm"][data-m="${CSS.escape(m)}"][data-r="${CSS.escape(r)}"]`)?.focus(); };
ACT['perm-discard'] = () => { const sel = tabOf('roleT', 'default'); Object.keys(PERM_DRAFT).filter(k => k.startsWith(sel + '|')).forEach(k => delete PERM_DRAFT[k]); rerender(); };
ACT['perm-save'] = () => {
  const sel = tabOf('roleT', 'default'); let n = 0;
  for (const k of Object.keys(PERM_DRAFT).filter(x => x.startsWith(sel + '|'))) { const [, m, r] = k.split('|'); if (sel === 'default') PERM_DEFAULT[r][MODULES.indexOf(m)] = PERM_DRAFT[k]; else (PERM_OVERRIDE[sel] ||= {})[`${r}|${m}`] = PERM_DRAFT[k]; delete PERM_DRAFT[k]; n++; }
  log('Changed permissions', `${n} cells · ${sel === 'default' ? 'portfolio default' : T(sel).name}`, sel === 'default' ? 'all' : sel); rerender(); toast(`${n} permission${n === 1 ? '' : 's'} saved. Changes reach the app on next sign-in.`);
};

// ================= Security =================
function visitorTrail(v) {
  const ev = [], u = U(v.unit), m = 6e4;
  if (v.via === 'Pre-registered QR') ev.push({ at: new Date(+v.in - 150 * m), text: `Pre-registered by ${v.host} (${u.name}). Pass valid ${QR_POLICY.validity} h from first scan.`, who: 'Resident app', ic: 'qr_code_2' });
  else if (v.via === 'Delivery code' || v.via === 'Ride code from resident') ev.push({ at: new Date(+v.in - 20 * m), text: `${v.via} issued by ${v.host}`, who: 'Resident app', ic: 'pin' });
  if (v.status === 'Expected') { ev.push({ at: v.in, text: 'Expected arrival. Not at the gate yet.', ic: 'schedule' }); return ev; }
  if (v.status === 'No-show') { ev.push({ at: new Date(+v.in + QR_POLICY.validity * 60 * m), text: 'Pass expired unused', ic: 'timer_off' }); return ev; }
  ev.push({ at: new Date(+v.in - m), text: `${v.via === 'Walk-in, host confirmed' ? 'Walk-in, host called and confirmed' : 'Pass scanned'} at ${v.gate}${v.plate ? ` · plate ${v.plate}` : ''}`, who: v.guard, ic: 'qr_code_scanner' });
  if (v.status === 'Denied') { ev.push({ at: v.in, text: `Denied: ${v.denyReason}`, who: v.guard, ic: 'block' }); return ev; }
  ev.push({ at: v.in, text: `Admitted · ${v.pax} ${v.pax > 1 ? 'people' : 'person'}`, who: v.guard, ic: 'login' });
  if (v.status === 'Overstayed') ev.push({ at: new Date(+v.in + QR_POLICY.validity * 60 * m), text: 'Pass expired while inside. Host notified.', who: 'System', ic: 'timer' });
  if (v.out) ev.push({ at: v.out, text: `Exited at ${v.gate}`, who: v.guard, ic: 'logout' });
  return ev;
}
ROUTES.visitors = { title: 'Visitor registry', render: () => head({ title: 'Visitor registry', path: 'visitors', sub: 'Every visitor, delivery and contractor scanned at your gates, with a full audit trail.' })
  + ixHTML({ id: 'visitors', noun: 'visitors', ph: 'Search visitor, host, unit or plate', rows: () => VISITORS, text: v => `${v.id} ${v.name} ${v.host} ${uname(v.unit)} ${v.plate}`,
    filters: [tamanF(), dateF(v => v.in), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Inside', 'Expected', 'Checked out', 'Denied', 'Overstayed', 'No-show'] }, { k: 'type', label: 'Type', all: 'All types', opts: ['Guest', 'Delivery', 'E-hailing', 'Contractor', 'Service'] }, { k: 'gate', label: 'Gate', all: 'All gates', opts: [...new Set(VISITORS.filter(inScope).map(v => v.gate))] }],
    cols: [
      { h: 'Visitor', v: v => t2(v.name, `${v.type}${v.pax > 1 ? ` · ${v.pax} people` : ''}`), s: v => v.name, t: v => v.name },
      { h: 'Host', v: v => t2(uname(v.unit), v.host), s: v => U(v.unit).ord, t: v => `${uname(v.unit)} (${v.host})` },
      { h: 'Plate', v: v => v.plate ? `<span class="num">${esc(v.plate)}</span>` : muted('—'), t: v => v.plate },
      { h: 'Gate', hide: 'hidden lg:table-cell', v: v => t2(v.gate, v.guard), t: v => v.gate },
      { h: 'In', v: v => dWhen(v.in), s: v => v.in, t: v => v.in.toISOString() },
      { h: 'Out', hide: 'hidden xl:table-cell', v: v => v.out ? dTime(v.out) : muted('—'), s: v => v.out || 0, t: v => v.out?.toISOString() || '' },
      { h: 'Status', badge: true, v: v => stc(v.status), s: v => v.status, t: v => v.status },
    ], sort: 4, dir: -1, open: v => drawer({ title: esc(v.name), sub: `${v.id} · ${v.type} · ${esc(T(v.taman).name)}`,
      body: `<div class="grid gap-5">${sect('Visit', dl([['Host', `${esc(v.host)} · ${esc(uname(v.unit))}`, true], ['Gate', esc(v.gate)], ['Plate', esc(v.plate) || '—'], ['People', v.pax], ['Entry method', esc(v.via)], ['Status', stc(v.status)]]))}${sect('Audit trail', timeline(visitorTrail(v)), { sub: 'Every scan and decision, as recorded at the guardhouse.' })}</div>` }) }) };

ROUTES.onsite = { title: 'On site now', render() {
  const on = ONSITE.filter(inScope);
  return head({ title: 'On site now', path: 'onsite', sub: `Contractors checked in at your guardhouses today, synced as guards scan passes. Saturday work ends at ${until(S.scope === 'all' ? 'dh' : S.scope)}${S.scope === 'all' ? ' in every taman' : ''}.`,
    actions: `<span class="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white text-[13px] text-muted shadow-[var(--sh)]"><span class="live"></span><span data-tick>Synced just now</span></span>` })
    + `<div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">${myTamans().map(t => { const l = on.filter(o => o.taman === t.id), f = l.filter(o => onsiteFlags(o).length).length; return `<div class="panel px-4 py-3.5"><p class="text-[13px] text-muted truncate">${esc(t.short)}</p><p class="mt-0.5 text-[15px] font-semibold"><span class="num">${l.length}</span> contractors · <span class="num">${sum(l, o => o.onSite)}</span> workers</p><p class="mt-1 text-[12.5px] ${f ? 'text-coral-ink font-semibold' : 'text-muted'}">${f ? `${f} need${f > 1 ? '' : 's'} attention` : 'All within permit'}</p></div>`; }).join('')}</div>`
    + ixHTML({ id: 'onsite', noun: 'contractors on site', one: 'contractor on site', ph: 'Search contractor, unit or permit', rows: () => ONSITE, text: o => { const p = PM(o.permit); return `${p.contractor} ${p.id} ${uname(p.unit)} ${p.plates.join(' ')}`; },
      filters: [tamanF(), { k: 'flag', label: 'Attention', all: 'All contractors', opts: [['yes', 'Needs attention'], ['no', 'Within permit']], test: (o, v) => (onsiteFlags(o).length > 0) === (v === 'yes') }],
      cols: [
        { h: 'Contractor', v: o => { const p = PM(o.permit); return t2(p.contractor, `${p.id} · ${p.category}`); }, t: o => PM(o.permit).contractor },
        { h: 'Unit', v: o => t2(uname(PM(o.permit).unit), T(o.taman).short), t: o => uname(PM(o.permit).unit) },
        { h: 'Workers', v: o => { const p = PM(o.permit), over = o.onSite > p.workers; return `<span class="num ${over ? 'text-bad-ink font-semibold' : ''}">${o.onSite} of ${p.workers}</span>`; }, s: o => o.onSite - PM(o.permit).workers, t: o => `${o.onSite}/${PM(o.permit).workers}` },
        { h: 'Checked in', v: o => t2(dTime(o.in), o.guard), s: o => o.in, t: o => dTime(o.in) },
        { h: 'Allowed until', v: o => esc(until(o.taman)), hide: 'hidden lg:table-cell' },
        { h: 'Vehicles', hide: 'hidden 2xl:table-cell', v: o => `<span class="num">${esc(PM(o.permit).plates.join(', '))}</span>` },
        { h: 'Flags', badge: true, v: o => onsiteFlags(o).map(([l, t]) => stc(l, t)).join(' ') || stc('Within permit', 'ok'), t: o => onsiteFlags(o).map(f => f[0]).join('; ') },
        { h: 'Actions', act: true, v: o => `<div class="flex gap-2"><button type="button" class="btn btn-o btn-sm" data-act="notice-new" data-id="${o.permit}" data-kind="Violation notice">Notice</button>${PM(o.permit).stopped ? '' : `<button type="button" class="btn btn-d btn-sm" data-act="notice-new" data-id="${o.permit}" data-kind="Stop-work order">Stop work</button>`}</div>` },
      ], open: o => { location.hash = '#/permit/' + o.permit; }, emptyTitle: 'No contractors on site', emptyText: 'Guards check contractors in by scanning their pass. They appear here the moment they do.' }) + (on.some(o => o.note) ? `<div class="mt-4">${note(`Guard report, ${dTime(at(0, 10, 15))}: ${esc(on.find(o => o.note).note)}.`, 'sun', 'campaign')}</div>` : '');
} };

const WEEK = Array.from({ length: 7 }, (_, i) => at(-5 + i));
const SHIFT = { D: ['Day', 'sun', '7 am–7 pm'], N: ['Night', 'indigo', '7 pm–7 am'], O: ['Off', 'mute', ''] };
function rosterGaps() {
  const gaps = [];
  for (const t of myTamans()) WEEK.forEach((d, i) => { const g = guardsOf(t.id); ['D', 'N'].forEach(s => { if (!g.some(x => x.rota[i] === s)) gaps.push(`${t.short} · ${dDay(d)} ${s === 'D' ? 'day' : 'night'}`); }); });
  return gaps;
}
ROUTES.roster = { title: 'Guard roster', render() {
  const gaps = rosterGaps(), notes = SHIFT_NOTES.filter(inScope);
  return head({ title: 'Guard roster', path: 'roster', sub: `Shifts for ${dDate(WEEK[0])} – ${dDate(WEEK[6])}. Every taman needs at least one guard on day and night shift. Click a shift to change it.` })
    + (gaps.length ? `<div class="mb-5">${note(`<b>${gaps.length} uncovered shift${gaps.length > 1 ? 's' : ''}:</b> ${esc(gaps.join(' · '))}`, 'coral', 'warning')}</div>` : `<div class="mb-5">${note('Every taman has day and night cover all week.', 'indigo', 'verified_user')}</div>`)
    + `<div class="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px] items-start">`
    + ixHTML({ id: 'roster', noun: 'guards', ph: 'Search guard or post', rows: () => GUARDS, text: g => `${g.name} ${g.post}`, csv: true, per: 30,
      filters: [tamanF(), { k: 'post', label: 'Post', all: 'All posts', opts: [...new Set(GUARDS.filter(inScope).map(g => g.post))] }],
      cols: [
        { h: 'Guard', v: g => t2(g.name, `${g.post} · ${T(g.taman).short}`), s: g => g.name, t: g => g.name },
        ...WEEK.map((d, i) => ({ h: `<span class="${i === 5 ? 'text-indigo font-semibold' : ''}">${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()}</span>`, tableOnly: true, cls: i === 5 ? 'bg-indigo-tint/40' : '', v: g => { const [l, tone] = SHIFT[g.rota[i]]; return `<button type="button" class="chip chip-${tone} plain h-8 px-3" data-act="shift" data-g="${g.id}" data-i="${i}" aria-label="${esc(g.name)}, ${dDay(d)}: ${l}. Change">${l}</button>`; }, t: g => SHIFT[g.rota[i]][0] })),
        { h: 'This week', cardOnly: true, act: true, v: g => `<div class="grid grid-cols-7 gap-1 w-full">${g.rota.map((s, i) => `<button type="button" class="chip chip-${SHIFT[s][1]} plain h-9 px-0 justify-center flex-col gap-0 leading-tight" data-act="shift" data-g="${g.id}" data-i="${i}" aria-label="${esc(g.name)}, ${dDay(WEEK[i])}: ${SHIFT[s][0]}. Change"><span class="text-[10.5px] font-medium opacity-80">${WEEK[i].toLocaleDateString('en-GB', { weekday: 'short' })}</span>${SHIFT[s][0]}</button>`).join('')}</div>` },
      ] })
    + sect('Shift notes', `<form data-form="note" novalidate class="grid gap-3">${S.scope === 'all' ? F({ k: 'taman', label: 'Taman', type: 'select', opts: tamanOpts(), req: true, v: 'dh' }) : ''}${F({ k: 'text', label: 'Handover note', type: 'textarea', rows: 3, req: true, ph: 'What the next shift needs to know', msg: 'Write the note first.' })}<button type="submit" class="btn btn-p justify-self-start">${icon('send')}Post note</button></form>
      <ul class="mt-5 divide-y divide-line">${notes.map(n => `<li class="py-3"><p class="text-[14px] leading-5">${esc(n.text)}</p><p class="mt-1 text-[12.5px] text-muted">${esc(n.guard)} · ${esc(T(n.taman).short)} · ${dWhen(n.at)}</p></li>`).join('') || `<li class="py-6 text-center text-[13.5px] text-muted">No notes yet this week.</li>`}</ul>`, { sub: 'Guards post these from the app at handover.' })
    + `</div>`;
} };
ACT.shift = el => { const g = GUARDS.find(x => x.id === el.dataset.g), i = +el.dataset.i, order = ['D', 'N', 'O']; g.rota[i] = order[(order.indexOf(g.rota[i]) + 1) % 3]; rerender(); $(`[data-act="shift"][data-g="${g.id}"][data-i="${i}"]`)?.focus(); };
FORMS.note = (d, f) => { const t = d.taman || S.scope; SHIFT_NOTES.unshift({ id: 'n' + SHIFT_NOTES.length, at: clock(), taman: t, guard: `${ME.name} (management)`, text: d.text.trim() }); log('Posted shift note', T(t).short, t); rerender(); toast('Note posted to the guardhouse app'); };

ROUTES.incidents = { title: 'Incidents', render: () => head({ title: 'Incidents', path: 'incidents', sub: 'Security and safety reports from guards and staff. Keep each one updated until it is closed.', actions: `<button type="button" class="btn btn-p" data-act="incident-new">${icon('add')}Report incident</button>` })
  + ixHTML({ id: 'incidents', noun: 'incidents', ph: 'Search incident or location', rows: () => INCIDENTS, text: i => `${i.id} ${i.title} ${i.where} ${i.cat}`,
    filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Open', 'Investigating', 'Closed'] }, { k: 'sev', label: 'Severity', all: 'All severities', opts: ['High', 'Medium', 'Low'] }, { k: 'cat', label: 'Category', all: 'All categories', opts: [...new Set(INCIDENTS.map(i => i.cat))] }, dateF(i => i.at)],
    cols: [
      { h: 'Incident', v: i => t2(i.title, `${i.id} · ${i.cat}`), s: i => i.title, t: i => i.title },
      { h: 'Where', v: i => t2(i.where, T(i.taman).short), t: i => i.where },
      { h: 'Severity', v: i => stc(i.sev), s: i => ['Low', 'Medium', 'High'].indexOf(i.sev), t: i => i.sev },
      { h: 'Reported', v: i => t2(ago(i.at), i.by), s: i => i.at, t: i => i.at.toISOString() },
      { h: 'Status', badge: true, v: i => stc(i.status), s: i => i.status, t: i => i.status },
    ], sort: 3, dir: -1, open: i => incidentDrawer(i) }) };
ACT['incident-open'] = el => incidentDrawer(INCIDENTS.find(i => i.id === el.dataset.id));
ACT['incident-new'] = () => drawer({ title: 'Report incident', sub: esc(scopeName()),
  body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('What happened', grid(
    F({ k: 'title', label: 'Short title', req: true, af: true, span: true, ph: 'e.g. Boom gate stuck open' }),
    F({ k: 'taman', label: 'Taman', type: 'select', opts: tamanOpts(), v: myTamans()[0].id, req: true }),
    F({ k: 'where', label: 'Location', req: true, ph: 'e.g. Back gate' }),
    F({ k: 'cat', label: 'Category', type: 'select', req: true, opts: [...new Set(INCIDENTS.map(i => i.cat))] }),
    F({ k: 'at', label: 'When', type: 'datetime-local', v: '2026-10-03T10:30', req: true }),
    F({ k: 'sev', label: 'Severity', type: 'radio', cols: 3, v: 'Medium', req: true, span: true, opts: [['Low', 'Low', 'Log only'], ['Medium', 'Medium', 'Needs follow-up'], ['High', 'High', 'Alerts taman manager now']] }),
    F({ k: 'desc', label: 'Details', type: 'textarea', span: true, ph: 'What happened, who was involved, what was done' }),
    F({ k: 'notify', label: 'Notify residents in this taman', type: 'switch', span: true, hint: 'Sends an in-app alert. Use for safety issues residents should know about.' })))}</form>`,
  foot: footSave('Report incident'),
  submit: d => { const i = { id: 'INC-0' + (200 + INCIDENTS.length), title: d.title.trim(), cat: d.cat, sev: d.sev, status: 'Open', taman: d.taman, at: new Date(d.at), where: d.where.trim(), by: ME.name, updates: d.desc ? [{ at: clock(), text: d.desc, who: ME.name }] : [] }; INCIDENTS.unshift(i); log('Reported incident', i.title, i.taman); rerender(); toast(`${i.id} reported${d.notify ? ' and residents notified' : ''}`); } });
function incidentDrawer(i) {
  drawer({ title: esc(i.title), sub: `${i.id} · ${esc(i.where)}, ${esc(T(i.taman).short)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Report', dl([['Category', esc(i.cat)], ['Severity', stc(i.sev)], ['Reported by', esc(i.by)], ['When', `${dDate(i.at)}, ${dTime(i.at)}`]]))}
      ${sect('Updates', (i.updates.length ? timeline(i.updates) : `<p class="text-[13.5px] text-muted">No updates yet.</p>`) + `<div class="mt-5 grid gap-4">${F({ k: 'status', label: 'Status', type: 'radio', cols: 3, v: i.status, req: true, opts: ['Open', 'Investigating', 'Closed'] })}${F({ k: 'update', label: 'Add an update', type: 'textarea', rows: 3, ph: 'e.g. Vendor replaced the barrier motor' })}</div>`)}
    </form>`,
    foot: footSave('Save update'),
    submit: (d, f) => { if (d.status === 'Closed' && !d.update.trim() && i.status !== 'Closed') return fieldErr(f, 'update', 'Say how it was resolved before closing.'); if (d.update.trim()) i.updates.push({ at: clock(), text: d.update.trim(), who: ME.name }); if (d.status !== i.status) i.updates.push({ at: clock(), text: `Status changed to ${d.status}`, who: ME.name }); i.status = d.status; log('Updated incident', i.id, i.taman); rerender(); toast(`${i.id} updated`); } });
}

ROUTES['qr-policy'] = { title: 'QR pass policy', render() {
  const q = QR_POLICY;
  return head({ title: 'QR pass policy', path: 'qr-policy', sub: 'Rules for the visitor passes residents create in the app. Guards see a pass as valid or expired based on these.' })
    + `<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <form data-form="qr" novalidate class="grid gap-6">
        ${sect('Applies to', F({ k: 'taman', label: 'Taman', type: 'select', noOpt: true, opts: S.scope === 'all' ? [['all', 'All my tamans'], ...tamanOpts()] : tamanOpts(), v: S.scope === 'all' ? 'all' : S.scope, hint: 'A taman setting overrides the portfolio setting.' }))}
        ${sect('Guest passes', `<div class="grid gap-5">${grid(
          F({ k: 'validity', label: 'Pass is valid for', type: 'select', noOpt: true, v: q.validity, opts: [['2', '2 hours'], ['4', '4 hours'], ['8', '8 hours'], ['12', '12 hours'], ['24', '24 hours']], hint: 'Counted from the first scan at the gate.' }),
          F({ k: 'maxGuests', label: 'Guests per pass', type: 'number', noOpt: true, v: q.maxGuests, min: 1, max: 20, req: true }),
          F({ k: 'perUnit', label: 'Active passes per unit per day', type: 'number', noOpt: true, v: q.perUnit, min: 1, max: 50, req: true }),
          F({ k: 'delivery', label: 'Delivery and e-hailing codes expire after', type: 'select', noOpt: true, v: q.delivery, opts: [['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 hour']] }))}
          <div class="divide-y divide-line">${F({ k: 'overnight', label: 'Allow overnight passes', type: 'switch', v: q.overnight, hint: 'For family staying over. Guards see the nights left on the pass.' })}
          ${F({ k: 'nights', label: 'Most nights per overnight pass', type: 'number', noOpt: true, v: q.nights, min: 1, max: 14, when: 'overnight=true' })}
          ${F({ k: 'plate', label: 'Ask for a plate number on car passes', type: 'switch', v: q.plate, hint: 'The guard checks the plate against the pass.' })}
          ${F({ k: 'ic', label: 'Scan IC for walk-in visitors', type: 'switch', v: q.ic, hint: 'The app stores only the last 4 digits.' })}</div></div>`)}
        <div class="flex flex-wrap gap-2"><button type="submit" class="btn btn-p">Save policy</button><button type="button" class="btn btn-o" data-act="undo">Undo changes</button></div>
      </form>
      <aside class="lg:sticky lg:top-6">
        <p class="mb-2 text-[13px] font-medium text-muted">What the resident and guard see</p>
        <div class="rounded-[24px] bg-indigo p-5" id="qr-preview">${qrPass(q)}</div>
      </aside></div>`;
} };
function qrPass(q) {
  return `<div class="ticket">
    <div class="p-5"><p class="text-[12.5px] text-muted">Visitor pass · ${esc(T('dh').name)}</p><p class="mt-1 text-[17px] font-semibold">Tan Wei Ming + ${Math.max(0, Math.min(2, q.maxGuests - 1))}</p><p class="text-[13px] text-muted">Host: No. 12, Jalan Harmoni 3</p>
      <dl class="mt-4 grid grid-cols-2 gap-3 text-[13px]"><div><dt class="text-muted">Valid for</dt><dd class="font-semibold">${q.validity} hours from scan</dd></div><div><dt class="text-muted">Guests</dt><dd class="font-semibold">Up to ${q.maxGuests}</dd></div>${q.plate ? `<div><dt class="text-muted">Plate</dt><dd class="font-semibold num">WXY 4521</dd></div>` : ''}${q.overnight ? `<div><dt class="text-muted">Overnight</dt><dd class="font-semibold">Up to ${q.nights} nights</dd></div>` : ''}</dl></div>
    <div class="tear"></div>
    <div class="p-5 grid place-items-center">${qrSVG('VIS-PREVIEW', 132)}<p class="mt-2 text-[12px] text-muted">Show this at the guardhouse</p></div></div>`;
}
LIVE.qr = f => { const d = formData(f); $('#qr-preview').innerHTML = qrPass({ ...d, maxGuests: +d.maxGuests || 1, nights: +d.nights || 1 }); };
FORMS.qr = d => { Object.assign(QR_POLICY, { validity: d.validity, maxGuests: +d.maxGuests, perUnit: +d.perUnit, delivery: d.delivery, overnight: d.overnight, nights: +d.nights || QR_POLICY.nights, plate: d.plate, ic: d.ic }); log('Updated QR pass policy', d.taman === 'all' ? 'All tamans' : T(d.taman).name, d.taman); toast(`QR policy saved for ${d.taman === 'all' ? 'all your tamans' : esc(T(d.taman).name)}. New passes use it right away.`); };
