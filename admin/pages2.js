'use strict';
// Pages, part 2: permits, billing, facilities, marketplace, communications, analytics, settings. Boots the app at the end.
BLACKLIST.forEach(b => { if (b.scope !== 'portfolio') b.taman = b.scope; });
const ym = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const blockOpts = () => myTamans().flatMap(x => x.blocks.map(b => [x.id + '|' + b, `${x.short} · ${b}`]));

// ================= Permits =================
const pchip = p => stc(p.status) + (p.stopped ? ' ' + stc('Stop-work', 'bad') : '');
const verifiedAt = p => p.verifiedAt || new Date(+p.submitted + 2.6 * DAY);
function trail(p) {
  if (p.trail) return p.trail;
  const ev = [], add = (at, text, who, ic) => ev.push({ at, text, who, ic });
  const s = PSTATUS.indexOf(p.status), mgr = T(p.taman).manager, ded = p.refund ? sum(p.refund.deductions, d => d.amount) : 0;
  add(p.submitted, `Application submitted with ${p.docs.length} documents`, p.applicant, 'upload_file');
  if (p.status === 'Docs requested') add(new Date(+p.submitted + 1.2 * DAY), `Asked to resubmit: ${p.docs.filter(d => d.state === 'Resubmit').map(d => d.name).join(', ')}`, mgr, 'sync_problem');
  if (p.status === 'Rejected') add(new Date(+p.submitted + 2 * DAY), 'Application rejected', mgr, 'block');
  if (s >= 2 && s <= 7) add(new Date(+p.submitted + 1.5 * DAY), `Conditional approval. Asked for ${RM(p.deposit)} deposit and ${RM(p.fee)} fee`, mgr, 'approval');
  if (p.depositState === 'Receipt uploaded') add(new Date(+p.submitted + 2.2 * DAY), 'Bank transfer receipt uploaded', p.applicant, 'receipt');
  if (s >= 3 && s <= 7) { add(verifiedAt(p), `Deposit verified, ${RM(p.deposit)} held in escrow`, 'Ong Boon Hock', 'verified'); add(new Date(+verifiedAt(p) + 36e5), 'Contractor pass issued and shared with the contractor', 'System', 'badge'); }
  if (s >= 4 && s <= 7) add(p.start, `First check-in at the gate, ${p.workers} workers`, 'Guardhouse', 'login');
  if (s >= 5 && s <= 7) add(p.end, 'Applicant reported the work complete and asked for inspection', p.applicant, 'task_alt');
  if (s === 5) add(new Date(+p.end + 2 * 36e5), `Inspection booked for ${dDay(p.inspection)}, ${dTime(p.inspection)}`, mgr, 'event');
  if (s >= 6 && p.refund) add(p.inspection, `Inspection: ${p.refund.decision.toLowerCase()}${ded ? `, ${RM(ded)} deducted for repairs` : ''}`, mgr, 'fact_check');
  if (p.refund?.paid) add(p.refund.paid, p.refund.decision === 'Forfeited' ? `Deposit forfeited: ${p.refund.reason}` : `Refund of ${RM(p.refund.amount)} paid to ${p.bank} (${p.refund.ref})`, 'Ong Boon Hock', 'payments');
  return (p.trail = ev.sort((a, b) => a.at - b.at));
}
function ledger() {
  const L = [], e = (p, type, amount, at, escrow = true, ref = '') => L.push({ id: `${p.id}-${L.length}`, permit: p.id, taman: p.taman, unit: p.unit, type, amount, at, escrow, ref });
  for (const p of PERMITS) {
    if (!['Held', 'Refunded', 'Forfeited'].includes(p.depositState)) continue;
    e(p, 'Deposit received', p.deposit, verifiedAt(p)); e(p, 'Processing fee', p.fee, verifiedAt(p), false);
    if (!p.refund) continue;
    const ded = sum(p.refund.deductions, d => d.amount);
    if (p.refund.decision === 'Forfeited') e(p, 'Forfeited to repair fund', -p.deposit, p.refund.decided);
    else { if (ded) e(p, 'Kept for repairs', -ded, p.refund.decided); if (p.refund.paid) e(p, 'Refund paid', -p.refund.amount, p.refund.paid, true, p.refund.ref); }
  }
  return L.sort((a, b) => b.at - a.at);
}
const escrowHeld = () => sum(ledger().filter(l => l.escrow && inScope(l)), l => l.amount);
const stage = p => p.status === 'Inspection Scheduled' ? 'Inspection due' : p.status === 'Completed' ? 'Awaiting payout' : 'Paid out';

ROUTES.permits = { title: 'Permit applications', render: () => head({ title: 'Permit applications', path: 'permits', sub: 'Every permit in your tamans, from review to deposit refund. Open one to check documents and decide.', actions: `<a class="btn btn-o" href="#/permit-types">${icon('tune')}Permit types & rules</a>` })
  + ixHTML({ id: 'permits', noun: 'permits', ph: 'Search permit, unit, applicant or contractor', rows: () => PERMITS, text: p => `${p.id} ${uname(p.unit)} ${p.applicant} ${p.contractor} ${p.category} ${p.scope}`,
    filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: PSTATUS }, { k: 'category', label: 'Category', all: 'All categories', opts: Object.keys(CAT_TYPE) }, dateF(p => p.submitted, 'Submitted')],
    views: [['table', 'Table', 'table_rows'], ['board', 'Board', 'view_kanban']],
    cols: [
      { h: 'Permit', v: p => t2(p.id, p.category), s: p => p.id, t: p => `${p.id} ${p.category}` },
      { h: 'Unit', v: p => t2(uname(p.unit), T(p.taman).short), s: p => U(p.unit)?.ord ?? 0, t: p => `${uname(p.unit)}, ${T(p.taman).short}` },
      { h: 'Applicant', v: p => esc(p.applicant), s: p => p.applicant },
      { h: 'Contractor', hide: 'hidden xl:table-cell', v: p => t2(p.contractor, `${p.workers} workers`), s: p => p.contractor, t: p => p.contractor },
      { h: 'Work dates', v: p => `${dShort(p.start)} – ${dShort(p.end)}`, s: p => p.start, t: p => `${dDate(p.start)} – ${dDate(p.end)}` },
      { h: 'Deposit', num: true, v: p => RM(p.deposit), s: p => p.deposit, t: p => p.deposit.toFixed(2) },
      { h: 'Submitted', hide: 'hidden 2xl:table-cell', v: p => ago(p.submitted), s: p => p.submitted, t: p => dDate(p.submitted) },
      { h: 'Status', badge: true, v: pchip, s: p => PSTATUS.indexOf(p.status), t: p => p.status },
    ], sort: 6, dir: -1, open: p => { location.hash = '#/permit/' + p.id; }, board: permitBoard }) };
function permitBoard(rows) {
  const cols = PSTATUS.filter(s => s !== 'Rejected');
  return `<p class="flex items-center gap-2 px-4 pt-3 text-[12.5px] text-muted">${icon('swipe_left', 'text-[18px]')}${cols.length} stages, oldest to newest. Scroll sideways to see them all.</p>
  <div class="overflow-x-auto snap-x snap-mandatory md:snap-none"><div class="flex gap-3 p-3 sm:p-4 w-max">${cols.map(s => { const list = rows.filter(p => p.status === s); return `<section class="w-[244px] shrink-0 snap-start rounded-2xl bg-paper p-2" aria-label="${s}, ${list.length}">
    <header class="flex items-center gap-2 px-2 pt-1 pb-2">${stc(s)}<span class="ml-auto text-[12.5px] font-semibold text-muted num">${list.length}</span></header>
    <ul class="grid gap-2">${list.map(p => `<li><a href="#/permit/${p.id}" class="block rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(61,43,107,.08)] hover:shadow-[0_8px_20px_rgba(61,43,107,.12)] transition-shadow">
      <div class="flex items-center justify-between gap-2 text-[12px] text-muted"><span class="num">${p.id}</span><span>${ago(p.submitted)}</span></div>
      <p class="mt-1 text-[13.5px] font-semibold leading-snug">${esc(uname(p.unit))}</p><p class="text-[12.5px] text-muted">${esc(T(p.taman).short)} · ${esc(p.category)}</p>
      <p class="mt-2 text-[12.5px] truncate">${esc(p.contractor)}</p>${p.stopped ? `<p class="mt-2">${stc('Stop-work', 'bad')}</p>` : p.depositState === 'Receipt uploaded' ? `<p class="mt-2">${stc('Receipt to verify', 'sun')}</p>` : ''}</a></li>`).join('') || `<li class="px-2 py-6 text-center text-[12.5px] text-muted">None</li>`}</ul></section>`; }).join('')}</div></div>
    <p class="px-4 pb-4 text-[12.5px] text-muted">Rejected permits are in the Table view. Open a card to move it on: each status changes on the permit's own page, where the checks happen.</p>`;
}

const depChip = p => ({ 'Not paid': stc('Not paid', 'mute'), 'Receipt uploaded': stc('Receipt to verify', 'sun'), Held: stc('Held in escrow', 'indigo'), Refunded: stc('Refunded', 'ok'), Forfeited: stc('Forfeited', 'bad') }[p.depositState]);
const refundSummary = p => { const r = p.refund; return `<dl class="grid gap-2.5 text-[14px]">
  <div class="flex justify-between gap-4"><dt class="text-muted">Deposit</dt><dd class="num">${RM(p.deposit)}</dd></div>
  ${r.decision === 'Forfeited' ? `<div class="flex justify-between gap-4"><dt class="text-muted">Forfeited</dt><dd class="num text-bad-ink">− ${RM(p.deposit)}</dd></div>` : r.deductions.map(d => `<div class="flex justify-between gap-4"><dt class="text-muted min-w-0">${esc(d.item)}</dt><dd class="num text-bad-ink shrink-0">− ${RM(d.amount)}</dd></div>`).join('')}
  <div class="flex justify-between gap-4 pt-2.5 border-t border-line font-semibold"><dt>${r.decision === 'Forfeited' ? 'Refund' : `Refund to ${esc(p.bank)}`}</dt><dd class="num">${RM(r.amount)}</dd></div></dl>
  ${r.reason ? `<p class="mt-3 text-[13px] text-muted">${esc(r.reason)}</p>` : ''}`; };
const receiptCard = pay => `<div class="rounded-2xl bg-paper p-4 text-[13.5px]">
  <div class="flex items-center gap-3"><span class="tile tile-coral">${icon('receipt')}</span><div class="min-w-0"><p class="font-semibold">${RM(pay.amount)} bank transfer</p><p class="text-[12.5px] text-muted truncate">${esc(pay.ref)} · ${dWhen(pay.at)}</p></div></div>
  <dl class="mt-3 grid grid-cols-2 gap-3"><div><dt class="text-[12.5px] text-muted">Paid by</dt><dd>${esc(pay.payer)}</dd></div><div><dt class="text-[12.5px] text-muted">Into</dt><dd>Maybank ••• 2210</dd></div></dl></div>`;
const passPanel = p => `<section class="panel p-5"><h2 class="text-[16px] font-semibold">Contractor pass</h2><p class="mt-1 text-[13px] text-muted">What the guard scans at the gate</p>
  <div class="mt-4 rounded-[22px] bg-indigo p-4"><div class="ticket">
    <div class="bg-sun px-5 py-2.5 text-[12.5px] font-semibold text-indigo-deep">Contractor pass · ${esc(p.category)}</div>
    <div class="p-5"><p class="text-[16px] font-semibold leading-snug">${esc(p.contractor)}</p><p class="text-[13px] text-muted">${esc(uname(p.unit))}, ${esc(T(p.taman).short)}</p>
      <dl class="mt-3 grid grid-cols-2 gap-2 text-[12.5px]"><div><dt class="text-muted">Valid</dt><dd class="font-semibold">${dShort(p.start)} – ${dShort(p.end)}</dd></div><div><dt class="text-muted">Workers</dt><dd class="font-semibold">Up to ${p.workers}</dd></div><div class="col-span-2"><dt class="text-muted">Vehicles</dt><dd class="font-semibold num">${esc(p.plates.join(', '))}</dd></div></dl></div>
    <div class="tear"></div>
    <div class="p-4 grid place-items-center">${qrSVG(p.id, 112)}<p class="mt-1.5 text-[12px] text-muted num">${p.id}${p.stopped ? ' · blocked by stop-work order' : ''}</p></div></div></div></section>`;
function permitDecision(p) {
  const s = p.status, todo = p.docs.filter(d => d.state !== 'Verified').length;
  if (s === 'Pending Review' || s === 'Docs requested') return sect('Decision', `<form data-form="decide" data-id="${p.id}" novalidate class="grid gap-4">
      ${todo ? note(`${todo} document${todo > 1 ? 's' : ''} still to check. Open each one in Documents before approving.`, 'sun', 'pending_actions') : ''}
      ${F({ k: 'decision', label: 'Decision', type: 'radio', req: true, noOpt: true, opts: [['conditional', 'Approve, pending deposit', `They pay ${RM(p.deposit + p.fee)}. The contractor pass activates once the deposit is verified.`], ['resubmit', 'Ask for documents again', 'The application keeps its place in the queue.'], ['reject', 'Reject', 'Closes the application. They can apply again.']] })}
      ${F({ k: 'docs', label: 'Documents to upload again', type: 'checks', noOpt: true, opts: p.docs.map(d => d.name), v: p.docs.filter(d => d.state !== 'Verified').map(d => d.name), when: 'decision=resubmit' })}
      ${F({ k: 'remarks', label: 'Remarks to the applicant', type: 'textarea', rows: 3, ph: 'Shown in the app with your decision', hint: 'Needed when you ask for documents or reject.' })}
      <button type="submit" class="btn btn-p w-full">Send decision</button></form>`, { sub: `${p.docs.length - todo} of ${p.docs.length} documents verified` });
  if (s === 'Pending Deposit') {
    const pay = PAYMENTS.find(x => x.permit === p.id && x.status === 'Receipt to verify');
    return sect('Deposit', pay ? `${receiptCard(pay)}<p class="mt-3 flex items-center gap-2 text-[13px]">${pay.amount === p.deposit + p.fee ? stc('Amount matches', 'ok') : stc(`Expected ${RM(p.deposit + p.fee)}`, 'coral')}</p>
      <div class="mt-4 grid gap-2"><button type="button" class="btn btn-p w-full" data-act="dep-verify" data-id="${p.id}">${icon('verified')}Verify deposit and approve</button><button type="button" class="btn btn-o w-full" data-act="dep-reject" data-id="${p.id}">Receipt doesn't match</button></div>`
      : `<p class="text-[14px] leading-6">Waiting for ${esc(p.applicant)} to pay ${RM(p.deposit + p.fee)} by FPX, or upload a bank transfer receipt.</p><button type="button" class="btn btn-o w-full mt-4" data-act="dep-remind" data-id="${p.id}">${icon('notifications')}Send payment reminder</button>`, { sub: 'Conditionally approved' });
  }
  if (s === 'Approved') return sect('Ready to start', `<p class="text-[14px] leading-6">The pass is active from ${dDate(p.start)}. Guards check the hours, worker count and plates against it.</p><button type="button" class="btn btn-t w-full mt-4" data-act="pass-share" data-id="${p.id}">${icon('share')}Copy pass details for the contractor</button>`, { sub: 'Approved · deposit held' });
  if (s === 'Work In Progress') {
    const o = ONSITE.find(x => x.permit === p.id);
    return sect('Work in progress', `${p.stopped ? note('Stop-work order active. Guards turn the contractor away until you lift it.', 'bad', 'pan_tool') : ''}<p class="text-[14px] leading-6 ${p.stopped ? 'mt-3' : ''}">${o ? `On site today: ${o.onSite} of ${p.workers} workers, in since ${dTime(o.in)}.` : 'Not on site today.'} Work is due to end ${dDate(p.end)}.</p>
      <div class="mt-4 grid gap-2"><button type="button" class="btn btn-p w-full" data-act="insp-schedule" data-id="${p.id}">${icon('event')}Book completion inspection</button><button type="button" class="btn btn-o w-full" data-act="notice-new" data-id="${p.id}" data-kind="Violation notice">${icon('report')}Send violation notice</button>${p.stopped ? `<button type="button" class="btn btn-t w-full" data-act="stop-lift" data-id="${p.id}">${icon('play_arrow')}Lift stop-work order</button>` : `<button type="button" class="btn btn-d w-full" data-act="notice-new" data-id="${p.id}" data-kind="Stop-work order">${icon('pan_tool')}Issue stop-work order</button>`}</div>`, { sub: `Started ${dDate(p.start)}` });
  }
  if (s === 'Inspection Scheduled') return sect('Completion inspection', `<p class="text-[14px] leading-6">${dDay(p.inspection)}, ${dTime(p.inspection)} with ${esc(T(p.taman).manager)}. Record the site condition to settle the ${RM(p.deposit)} deposit.</p><button type="button" class="btn btn-p w-full mt-4" data-act="inspect" data-id="${p.id}">${icon('fact_check')}Start inspection</button>`, { sub: 'Work reported complete' });
  if (s === 'Completed') return sect('Refund decided', refundSummary(p) + `<a class="btn btn-t w-full mt-4" href="#/escrow">${icon('account_balance')}Pay out in Deposit escrow</a>`, { sub: `Inspected ${dDate(p.inspection)}` });
  if (s === 'Deposit Refunded') return sect(p.refund?.decision === 'Forfeited' ? 'Deposit forfeited' : 'Deposit refunded', p.refund ? refundSummary(p) : '', { sub: p.refund?.paid ? `Closed ${dDate(p.refund.paid)}` : '' });
  return sect('Rejected', `<p class="text-[14px] leading-6">${esc(p.remarks || 'Rejected.')}</p>`);
}
ROUTES.permit = { title: id => PM(id) ? `${PM(id).id} · ${PM(id).category}` : 'Permit', render(id) {
  const p = PM(id);
  if (!p) return head({ title: 'Permit not found', path: 'permits' }) + `<p class="text-muted">There is no permit ${esc(id)} in your tamans. <a class="font-semibold text-indigo underline" href="#/permits">Back to applications</a></p>`;
  if (!inScope(p)) return outOfScope('permit', p.taman);
  const u = U(p.unit), t = T(p.taman), w = WORK_HOURS[p.taman], ty = PERMIT_TYPES.find(x => x.id === p.type), bl = BLACKLIST.find(b => b.name === p.contractor);
  const docIc = n => /plan|drawing/i.test(n) ? 'architecture' : /IC|passport|licence/i.test(n) ? 'badge' : /insurance/i.test(n) ? 'shield' : /SSM|company/i.test(n) ? 'apartment' : 'description';
  return `<a href="#/permits" class="inline-flex items-center gap-1 mb-3 text-[13px] font-semibold text-indigo hover:underline">${icon('arrow_back', 'text-[18px]')}Applications</a>`
  + head({ title: `${esc(p.category)} · ${esc(u.name)}`, sub: `${p.id} · ${esc(t.name)} · submitted ${dDate(p.submitted)} by ${esc(p.applicant)}`, actions: pchip(p) })
  + `<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] items-start">
    <div class="grid gap-6 min-w-0">
      ${sect('Scope of work', dl([['Work', esc(p.scope), true], ['Dates', `${dDate(p.start)} – ${dDate(p.end)}`], ['Workers', `${p.workers} (limit ${ty.maxWorkers})`],
        ['Permitted hours', `Mon–Fri ${fmtHM(w.wkFrom)}–${fmtHM(w.wkTo)} · Sat ${fmtHM(w.satFrom)}–${fmtHM(w.satTo)}${w.sunOff ? ' · no work on Sundays and public holidays' : ''}${w.quiet ? ' · no hacking or drilling on weekends' : ''}`, true],
        ['Vehicles', `<span class="flex flex-wrap gap-1">${p.plates.map(x => chip(x, 'mute', true)).join('')}</span>`]]))}
      ${sect('Contractor', dl([['Company', esc(p.contractor)], ['SSM registration', `<span class="num">${esc(p.ssm)}</span>`], ['Site contact', esc(p.contact).replace(/ · (.+)$/, ' · <span class="whitespace-nowrap">$1</span>')], ['Public liability insurance', `${esc(p.insurer)} · ${p.policyNo} · ${RM0(p.cover)} cover`], ['Blacklist check', bl ? stc(`Blacklisted: ${bl.reason}`, 'bad') : stc('Not on your blacklist', 'ok'), true]]))}
      ${sect('Documents', `<ul class="divide-y divide-line -my-2">${p.docs.map((d, i) => `<li class="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span class="tile tile-indigo">${icon(docIc(d.name))}</span>
          <div class="min-w-[55%] flex-1"><p class="text-[14px] font-medium leading-5">${esc(d.name)}</p><p class="text-[12.5px] text-muted">${esc(d.file)} · ${d.size}</p></div>
          ${stc(d.state === 'Needs review' ? 'To check' : d.state === 'Resubmit' ? 'Asked again' : 'Verified', d.state === 'Verified' ? 'ok' : d.state === 'Resubmit' ? 'coral' : 'sun')}
          <button type="button" class="btn btn-o btn-sm" data-act="doc-open" data-id="${p.id}" data-i="${i}">Open</button></li>`).join('')}</ul>`, { sub: 'Open each document to check it against the scope of work.' })}
      ${sect('Activity', timeline(trail(p)))}
    </div>
    <aside class="grid gap-6 xl:sticky xl:top-6">${permitDecision(p)}
      ${sect('Deposit and fee', `<dl class="grid gap-2.5 text-[14px]">
        <div class="flex justify-between gap-4"><dt class="text-muted">Refundable deposit</dt><dd class="num">${RM(p.deposit)}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Processing fee, not refundable</dt><dd class="num">${RM(p.fee)}</dd></div>
        <div class="flex justify-between gap-4 pt-2.5 border-t border-line font-semibold"><dt>Total</dt><dd class="num">${RM(p.deposit + p.fee)}</dd></div></dl>
        <p class="mt-4 flex flex-wrap items-center gap-2 text-[13px]">${depChip(p)}<span class="text-muted">Refunds go to ${esc(p.bank)}</span></p>`)}
      ${['Approved', 'Work In Progress'].includes(p.status) ? passPanel(p) : ''}
    </aside></div>`;
} };
FORMS.decide = (d, f) => {
  const p = PM(f.dataset.id), mgr = ME.name;
  if (d.decision === 'conditional' && p.docs.some(x => x.state !== 'Verified')) return fieldErr(f, 'decision', 'Check and verify every document before approving.');
  if (d.decision !== 'conditional' && !d.remarks.trim()) return fieldErr(f, 'remarks', d.decision === 'reject' ? 'Say why, so the applicant knows what to fix.' : 'Say what needs to change in the documents.');
  if (d.decision === 'resubmit' && !d.docs.length) return fieldErr(f, 'docs', 'Choose at least one document.');
  if (d.decision === 'conditional') { p.status = 'Pending Deposit'; trail(p).push({ at: clock(), text: `Conditional approval. Asked for ${RM(p.deposit)} deposit and ${RM(p.fee)} fee`, who: mgr, ic: 'approval' }); toast(`Approved pending deposit. ${esc(p.applicant)} is asked to pay ${RM(p.deposit + p.fee)}.`); }
  if (d.decision === 'resubmit') { p.status = 'Docs requested'; p.docs.forEach(x => { if (d.docs.includes(x.name)) x.state = 'Resubmit'; }); trail(p).push({ at: clock(), text: `Asked to resubmit: ${d.docs.join(', ')}. ${d.remarks.trim()}`, who: mgr, ic: 'sync_problem' }); toast(`${esc(p.applicant)} has been asked for ${d.docs.length} document${d.docs.length > 1 ? 's' : ''}`); }
  if (d.decision === 'reject') { p.status = 'Rejected'; p.remarks = d.remarks.trim(); trail(p).push({ at: clock(), text: `Rejected: ${p.remarks}`, who: mgr, ic: 'block' }); toast('Application rejected. The applicant sees your remarks in the app.'); }
  log(`Permit decision: ${d.decision}`, p.id, p.taman); buildNotifs(); rerender();
};
const docPreview = (p, d) => {
  if (/plan|drawing/i.test(d.name)) return `<svg viewBox="0 0 520 320" class="w-full h-auto" role="img" aria-label="Floor plan with the rear extension marked">
    <rect x="20" y="20" width="360" height="280" fill="#FCFAF6" stroke="#1F1A2E" stroke-width="4"/>
    <rect x="380" y="140" width="120" height="160" fill="#FBE6E2" stroke="#A23F31" stroke-width="3" stroke-dasharray="8 6"/>
    <path d="M200 20v160M20 180h360M280 180v120M120 180v120" stroke="#1F1A2E" stroke-width="2.5" fill="none"/>
    <g font-family="Inter, sans-serif" font-size="13" fill="#1F1A2E"><text x="70" y="105">Living and dining</text><text x="250" y="105">Kitchen (existing)</text><text x="40" y="245">Bedroom 2</text><text x="150" y="245">Bath</text><text x="300" y="245">Store</text>
    <text x="392" y="205" fill="#A23F31" font-weight="600">New wet kitchen</text><text x="392" y="225" fill="#A23F31">3.2 m × 2.4 m</text></g>
    <path d="M380 312h120M380 306v12M500 306v12" stroke="#6E6880" stroke-width="1.5"/><text x="420" y="316" font-family="Inter, sans-serif" font-size="11" fill="#6E6880" dy="-8">3.2 m</text></svg>
    <p class="mt-3 text-[12.5px] text-muted">Sample drawing (synthetic). Dashed area is the proposed work.</p>`;
  if (/IC|passport/i.test(d.name)) { p.crew ||= Array.from({ length: p.workers }, (_, i) => [person(), i % 3 ? `Passport ••• ${int(1000, 9999)}` : `IC ••••••-••-${int(1000, 9999)}`, i % 3 ? pick(['Indonesia', 'Bangladesh', 'Nepal', 'Myanmar']) : 'Malaysia']);
    return `<table class="tbl"><thead><tr><th>Worker</th><th>ID</th><th>Nationality</th></tr></thead><tbody>${p.crew.map(c => `<tr><td>${esc(c[0])}</td><td class="num">${c[1]}</td><td>${c[2]}</td></tr>`).join('')}</tbody></table><p class="mt-3 text-[12.5px] text-muted">ID numbers are masked. Guards check them against the worker's card at the gate.</p>`; }
  if (/insurance/i.test(d.name)) return dl([['Insurer', esc(p.insurer)], ['Policy number', p.policyNo], ['Cover', RM0(p.cover)], ['Valid until', dDate(new Date(+p.end + 180 * DAY))], ['Insured', esc(p.contractor), true]]);
  if (/SSM/i.test(d.name)) return dl([['Company', esc(p.contractor), true], ['Registration', esc(p.ssm)], ['Status', stc('Active', 'ok')], ['Business', 'Renovation and building works']]);
  return `<div class="grid place-items-center py-10 text-center"><span class="tile tile-indigo">${icon('picture_as_pdf')}</span><p class="mt-3 font-semibold">${esc(d.file)}</p><p class="text-[13px] text-muted">${d.size} · ${int(1, 4)} pages</p></div>`;
};
ACT['doc-open'] = el => { const p = PM(el.dataset.id), i = +el.dataset.i, d = p.docs[i];
  drawer({ wide: true, title: esc(d.name), sub: `${esc(d.file)} · ${d.size} · ${p.id}`, body: `<div class="grid gap-5"><div class="panel p-4 sm:p-6">${docPreview(p, d)}</div>${d.state === 'Resubmit' ? note('The applicant has been asked to upload this again.', 'coral', 'sync_problem') : ''}</div>`,
    foot: `<button type="button" class="btn btn-o sm:mr-auto" data-act="drawer-close">Close</button>${d.state === 'Verified' ? '' : `<button type="button" class="btn btn-d" data-act="doc-state" data-id="${p.id}" data-i="${i}" data-v="Resubmit">${icon('sync_problem')}Ask again</button><button type="button" class="btn btn-p" data-act="doc-state" data-id="${p.id}" data-i="${i}" data-v="Verified">${icon('verified')}Mark verified</button>`}` }); };
ACT['doc-state'] = el => { const p = PM(el.dataset.id), d = p.docs[+el.dataset.i]; d.state = el.dataset.v; trail(p).push({ at: clock(), text: `${d.name} ${d.state === 'Verified' ? 'verified' : 'sent back to the applicant'}`, who: ME.name, ic: d.state === 'Verified' ? 'verified' : 'sync_problem' }); log(d.state === 'Verified' ? 'Verified permit document' : 'Asked for document again', `${p.id} · ${d.name}`, p.taman); closeDrawer(); rerender(); toast(`${esc(d.name)} ${d.state === 'Verified' ? 'verified' : 'sent back to the applicant'}`); };
function verifyDeposit(p) { const pay = PAYMENTS.find(x => x.permit === p.id && x.status === 'Receipt to verify'); if (pay) pay.status = 'Matched'; p.depositState = 'Held'; p.status = 'Approved'; p.verifiedAt = clock(); trail(p).push({ at: clock(), text: `Deposit verified, ${RM(p.deposit)} held in escrow. Contractor pass issued.`, who: ME.name, ic: 'verified' }); log('Verified deposit receipt', p.id, p.taman); buildNotifs(); }
ACT['dep-verify'] = el => { verifyDeposit(PM(el.dataset.id)); rerender(); toast('Deposit verified. The contractor pass is active and shared with the applicant.'); };
ACT['dep-reject'] = el => { const p = PM(el.dataset.id); drawer({ title: "Receipt doesn't match", sub: `${p.id} · ${esc(p.applicant)}`,
  body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Tell the applicant', grid(F({ k: 'why', label: 'Problem', type: 'select', noOpt: true, span: true, opts: ['Amount not received in our account', 'Amount is different', 'Receipt unreadable', 'Paid to the wrong account'] }), F({ k: 'msg', label: 'Message', type: 'textarea', span: true, rows: 3, v: `Please pay ${RM(p.deposit + p.fee)} to Maybank 5142 8833 2210 and upload the new receipt.` })))}</form>`,
  foot: footSave('Send to applicant'), submit: d => { const pay = PAYMENTS.find(x => x.permit === p.id && x.status === 'Receipt to verify'); if (pay) { pay.status = 'Failed'; pay.failReason = d.why; } p.depositState = 'Not paid'; trail(p).push({ at: clock(), text: `Receipt rejected: ${d.why}`, who: ME.name, ic: 'block' }); log('Rejected deposit receipt', p.id, p.taman); rerender(); toast('The applicant has been asked to pay again'); } }); };
ACT['dep-remind'] = el => toast(`Payment reminder sent to ${esc(PM(el.dataset.id).applicant)}`);
ACT['pass-share'] = el => { const p = PM(el.dataset.id); const text = `Tamanly contractor pass ${p.id}: ${p.contractor} at ${uname(p.unit)}, ${T(p.taman).name}. Valid ${dDate(p.start)} to ${dDate(p.end)}, up to ${p.workers} workers, vehicles ${p.plates.join(', ')}.`; navigator.clipboard?.writeText(text).then(() => toast('Pass details copied. Paste them to the contractor.'), () => toast('Copy failed. Select the pass details on the page instead.')); };
ACT['insp-schedule'] = el => { const p = PM(el.dataset.id); drawer({ title: 'Book completion inspection', sub: `${p.id} · ${esc(uname(p.unit))}`,
  body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('When and who', grid(F({ k: 'date', label: 'Date', type: 'date', v: '2026-10-05', min: '2026-10-03', req: true }), F({ k: 'time', label: 'Time', type: 'time', v: '10:00', req: true }), F({ k: 'by', label: 'Inspector', type: 'select', noOpt: true, span: true, v: T(p.taman).manager, opts: staffNames() })), { sub: 'The applicant and contractor are told in the app.' })}</form>`,
  foot: footSave('Book inspection'), submit: d => { p.inspection = new Date(`${d.date}T${d.time}`); p.status = 'Inspection Scheduled'; trail(p).push({ at: clock(), text: `Inspection booked for ${dDay(p.inspection)}, ${dTime(p.inspection)} with ${d.by}`, who: ME.name, ic: 'event' }); const i = ONSITE.findIndex(o => o.permit === p.id); if (i > -1) ONSITE.splice(i, 1); log('Booked inspection', p.id, p.taman); rerender(); toast(`Inspection booked for ${dDay(p.inspection)}`); } }); };
ACT['stop-lift'] = el => { const p = PM(el.dataset.id); p.stopped = false; NOTICES.filter(n => n.permit === p.id && n.kind === 'Stop-work order' && n.status === 'Active').forEach(n => { n.status = 'Lifted'; }); trail(p).push({ at: clock(), text: 'Stop-work order lifted', who: ME.name, ic: 'play_arrow' }); log('Lifted stop-work order', p.id, p.taman); rerender(); toast('Stop-work order lifted. Guards will admit the contractor again.'); };
ACT.inspect = el => inspectDrawer(PM(el.dataset.id));
function inspectDrawer(p) {
  const items = CHECKLIST[T(p.taman).kind], pre = p.id.charCodeAt(p.id.length - 1) % 2;
  drawer({ wide: true, title: 'Completion inspection', sub: `${p.id} · ${esc(uname(p.unit))}, ${esc(T(p.taman).short)} · ${RM(p.deposit)} deposit`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Site checklist', `<ul class="divide-y divide-line -my-3">${items.map((it, i) => `<li class="py-4 grid gap-3">
        <div class="flex flex-wrap items-start gap-3"><div class="min-w-0 flex-1"><p class="text-[14px] font-semibold">${it}</p><p class="text-[12.5px] text-muted">Before work: ${i === 1 && pre ? PRE_NOTES[0] : 'no issues recorded'}</p></div>
        <div class="flex gap-2" role="radiogroup" aria-label="${it}"><label class="pickc"><input type="radio" name="c${i}" value="ok" checked>OK</label><label class="pickc"><input type="radio" name="c${i}" value="damage">Damaged</label></div></div>
        <div class="grid sm:grid-cols-[1fr_170px] gap-3" data-when="c${i}=damage" hidden>${F({ k: 'n' + i, label: 'What is damaged', req: true, noOpt: true, ph: 'e.g. Two corridor tiles chipped' })}${F({ k: 'a' + i, label: 'Repair cost', type: 'money', req: true, noOpt: true, min: 1 })}</div></li>`).join('')}</ul>`, { sub: `Compare with the condition recorded before work started on ${dDate(p.start)}.` })}
      ${sect('Deposit', F({ k: 'outcome', label: 'Decision', type: 'radio', noOpt: true, v: 'refund', req: true, opts: [['refund', 'Refund, minus any repair costs', 'A full refund when nothing is damaged.'], ['forfeit', 'Forfeit the whole deposit', 'For abandoned work or serious damage. The applicant can appeal.']] })
        + `<div class="mt-4">${F({ k: 'reason', label: 'Reason for forfeiting', type: 'textarea', rows: 3, req: true, noOpt: true, when: 'outcome=forfeit', msg: 'Say why the deposit is forfeited.' })}</div><output id="insp-sum" class="mt-4 block rounded-2xl bg-indigo-tint p-4 text-[14px] leading-6 text-indigo" aria-live="polite"></output>`)}
    </form>`,
    foot: footSave('Record inspection'),
    input: f => { const d = formData(f), ded = items.reduce((s, _, i) => s + (d['c' + i] === 'damage' ? +d['a' + i] || 0 : 0), 0);
      $('#insp-sum').innerHTML = d.outcome === 'forfeit' ? `<b>${RM(p.deposit)}</b> goes to the repair fund. Nothing is refunded.` : ded ? `Refund <b class="num">${RM(Math.max(0, p.deposit - ded))}</b> to ${esc(p.bank)}: the ${RM(p.deposit)} deposit minus ${RM(ded)} in repairs. The applicant sees each deduction in the app.` : `Full refund of <b class="num">${RM(p.deposit)}</b> to ${esc(p.bank)}.`; },
    submit: (d, f) => {
      const deductions = items.map((it, i) => d['c' + i] === 'damage' ? { item: `${it}: ${d['n' + i].trim()}`, amount: +d['a' + i] } : null).filter(Boolean), ded = sum(deductions, x => x.amount);
      if (d.outcome === 'refund' && ded > p.deposit) return fieldErr(f, 'outcome', `Repairs (${RM(ded)}) cost more than the deposit. Forfeit it and bill the difference as an extra charge.`);
      p.refund = d.outcome === 'forfeit' ? { decision: 'Forfeited', deductions: [], amount: 0, reason: d.reason.trim(), decided: clock() } : { decision: ded ? 'Partial refund' : 'Full refund', deductions, amount: p.deposit - ded, decided: clock() };
      p.inspection = clock(); p.status = 'Completed';
      trail(p).push({ at: clock(), text: `Inspection: ${p.refund.decision.toLowerCase()}${ded ? `, ${RM(ded)} kept for repairs` : ''}`, who: ME.name, ic: 'fact_check' });
      log('Recorded inspection', `${p.id} · ${p.refund.decision}`, p.taman); rerender();
      toast(p.refund.decision === 'Forfeited' ? 'Deposit forfeited. The applicant has been told why.' : `${RM(p.refund.amount)} refund is ready to pay out`, { href: '#/escrow', label: 'Deposit escrow' });
    } });
}

ROUTES.refunds = { title: 'Inspections & refunds', render() {
  const P_ = PERMITS.filter(p => inScope(p) && ['Inspection Scheduled', 'Completed', 'Deposit Refunded'].includes(p.status));
  const due = P_.filter(p => p.status === 'Inspection Scheduled'), wait = P_.filter(p => p.status === 'Completed');
  return head({ title: 'Inspections & refunds', path: 'refunds', sub: 'When work ends, inspect the site against its pre-work condition, then refund the deposit in full, in part, or forfeit it.' })
    + `<div class="grid gap-3 sm:grid-cols-3 mb-6">${[['Inspections due', due.length, `${due.filter(p => p.inspection < at(1, 0, 0)).length} today`], ['Refunds awaiting payout', RM(sum(wait, p => p.refund.amount)), `${wait.length} permits · paid from Deposit escrow`], ['Held in escrow', RM(escrowHeld()), `${PERMITS.filter(p => inScope(p) && p.depositState === 'Held').length} permits`]].map(([k, v, s]) => `<div class="panel px-5 py-4"><p class="text-[13px] text-muted">${k}</p><p class="mt-1 text-[20px] font-semibold num">${v}</p><p class="mt-0.5 text-[12.5px] text-muted">${s}</p></div>`).join('')}</div>`
    + ixHTML({ id: 'refunds', noun: 'permits', one: 'permit', ph: 'Search permit, unit or contractor', rows: () => PERMITS.filter(p => ['Inspection Scheduled', 'Completed', 'Deposit Refunded'].includes(p.status)), text: p => `${p.id} ${uname(p.unit)} ${p.contractor} ${p.applicant}`,
      filters: [tamanF(), { k: 'stage', label: 'Stage', all: 'All stages', opts: ['Inspection due', 'Awaiting payout', 'Paid out'], get: stage }, { k: 'dec', label: 'Outcome', all: 'All outcomes', opts: ['Full refund', 'Partial refund', 'Forfeited'], get: p => p.refund?.decision || '' }],
      cols: [
        { h: 'Permit', v: p => t2(uname(p.unit), `${p.id} · ${p.category}`), s: p => p.id, t: p => p.id },
        { h: 'Contractor', hide: 'hidden lg:table-cell', v: p => esc(p.contractor), s: p => p.contractor },
        { h: 'Deposit', num: true, v: p => RM(p.deposit), s: p => p.deposit, t: p => p.deposit.toFixed(2) },
        { h: 'Inspection', v: p => p.inspection ? `${dShort(p.inspection)}, ${dTime(p.inspection)}` : muted('—'), s: p => p.inspection || 0, t: p => p.inspection ? dDate(p.inspection) : '' },
        { h: 'Outcome', v: p => p.refund ? stc(p.refund.decision, p.refund.decision === 'Full refund' ? 'ok' : p.refund.decision === 'Forfeited' ? 'bad' : 'sun') : muted('—'), t: p => p.refund?.decision || '' },
        { h: 'Refund', num: true, v: p => p.refund ? RM(p.refund.amount) : muted('—'), s: p => p.refund?.amount ?? -1, t: p => p.refund ? p.refund.amount.toFixed(2) : '' },
        { h: 'Stage', badge: true, v: p => stc(stage(p)), s: p => stage(p), t: stage },
        { h: '', act: true, v: p => p.status === 'Inspection Scheduled' ? `<button type="button" class="btn btn-t btn-sm" data-act="inspect" data-id="${p.id}">Inspect</button>` : p.status === 'Completed' ? `<a class="btn btn-o btn-sm" href="#/escrow">Pay out</a>` : '' },
      ], sort: 3, dir: 1, open: p => { if (p.status === 'Inspection Scheduled') inspectDrawer(p); else location.hash = '#/permit/' + p.id; } });
} };

ROUTES.enforcement = { title: 'Enforcement', render() {
  const tab = tabOf('enf', 'notices');
  return head({ title: 'Contractor enforcement', path: 'enforcement', sub: 'Stop-work orders, violation notices and blacklisted contractors. Guards see all three when they scan a pass.', actions: `<button type="button" class="btn btn-o" data-act="bl-new">${icon('block')}Blacklist contractor</button><button type="button" class="btn btn-p" data-act="notice-new">${icon('report')}Issue notice</button>` })
    + tabs('enf', [['notices', 'Notices', NOTICES.filter(inScope).length], ['blacklist', 'Blacklist', BLACKLIST.filter(inScope).length]], 'notices')
    + (tab === 'notices' ? ixHTML({ id: 'notices', noun: 'notices', ph: 'Search notice, permit, contractor or reason', rows: () => NOTICES, text: n => `${n.id} ${n.permit} ${n.reason} ${PM(n.permit).contractor} ${uname(PM(n.permit).unit)}`,
        filters: [tamanF(), { k: 'kind', label: 'Type', all: 'All types', opts: ['Stop-work order', 'Violation notice'] }, { k: 'status', label: 'Status', all: 'All statuses', opts: ['Active', 'Acknowledged', 'Lifted'] }, dateF(n => n.at, 'Issued')],
        cols: [
          { h: 'Notice', v: n => t2(n.kind, n.id), s: n => n.kind, t: n => `${n.kind} ${n.id}` },
          { h: 'Contractor', v: n => t2(PM(n.permit).contractor, `${n.permit} · ${uname(PM(n.permit).unit)}`), t: n => PM(n.permit).contractor },
          { h: 'Reason', cls: 'min-w-[220px]', v: n => esc(n.reason) },
          { h: 'Issued', v: n => dWhen(n.at), s: n => n.at, t: n => dDate(n.at) },
          { h: 'Status', badge: true, v: n => stc(n.status, n.status === 'Active' ? (n.kind === 'Stop-work order' ? 'bad' : 'coral') : undefined), s: n => n.status, t: n => n.status },
        ], sort: 3, dir: -1, open: n => { location.hash = '#/permit/' + n.permit; } })
      : ixHTML({ id: 'blacklist', noun: 'blacklisted contractors', one: 'blacklisted contractor', ph: 'Search company, worker or plate', rows: () => BLACKLIST, text: b => `${b.name} ${b.ref} ${b.reason}`,
        filters: [{ k: 'scope', label: 'Applies to', all: 'Any scope', opts: [['portfolio', 'Whole portfolio'], ...myTamans().map(t => [t.id, t.short])] }],
        cols: [
          { h: 'Contractor', v: b => t2(b.name, b.ref), s: b => b.name, t: b => b.name },
          { h: 'Reason', cls: 'min-w-[240px]', v: b => esc(b.reason) },
          { h: 'Applies to', v: b => b.scope === 'portfolio' ? chip(`All ${ORG.short} tamans`, 'indigo', true) : chip(T(b.scope).short, 'mute', true), t: b => b.scope === 'portfolio' ? 'Whole portfolio' : T(b.scope).name },
          { h: 'Added', v: b => t2(dDate(b.at), b.by), s: b => b.at, t: b => dDate(b.at) },
          { h: '', act: true, v: b => `<button type="button" class="btn btn-o btn-sm" data-act="bl-remove" data-id="${b.id}">Remove</button>` },
        ], sort: 3, dir: -1 }));
} };
ACT['notice-new'] = el => {
  const live = PERMITS.filter(p => inScope(p) && ['Approved', 'Work In Progress'].includes(p.status));
  drawer({ title: 'Issue notice', sub: 'Sent to the applicant, the contractor and the guardhouse',
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Notice', grid(
      F({ k: 'kind', label: 'Type', type: 'radio', cols: 2, req: true, noOpt: true, span: true, v: el.dataset.kind || 'Violation notice', opts: [['Violation notice', 'Violation notice', 'A warning on record. Work continues.'], ['Stop-work order', 'Stop-work order', 'Guards refuse entry until you lift it.']] }),
      F({ k: 'permit', label: 'Permit', type: 'select', req: true, noOpt: true, span: true, v: el.dataset.id, ph: 'Choose an active permit', opts: live.map(p => [p.id, `${p.id} · ${p.contractor} · ${uname(p.unit)}`]) }),
      F({ k: 'reason', label: 'Reason', type: 'textarea', rows: 3, req: true, span: true, ph: 'e.g. Hacking during weekend quiet hours', msg: 'Say what rule was broken.' })))}</form>`,
    foot: footSave('Issue notice'),
    submit: d => { const p = PM(d.permit); NOTICES.unshift({ id: 'NTC-0' + (32 + NOTICES.length), kind: d.kind, permit: p.id, reason: d.reason.trim(), at: clock(), status: 'Active', taman: p.taman }); if (d.kind === 'Stop-work order') p.stopped = true; trail(p).push({ at: clock(), text: `${d.kind}: ${d.reason.trim()}`, who: ME.name, ic: d.kind === 'Stop-work order' ? 'pan_tool' : 'report' }); log(`Issued ${d.kind.toLowerCase()}`, p.id, p.taman); rerender(); toast(`${d.kind} sent to ${esc(p.contractor)}${d.kind === 'Stop-work order' ? '. Guards will refuse entry.' : ''}`); } });
};
ACT['bl-new'] = () => drawer({ title: 'Blacklist contractor', sub: 'Guards refuse blacklisted companies, workers and vehicles at the gate',
  body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Who', grid(
    F({ k: 'name', label: 'Company, worker or vehicle', req: true, af: true, span: true, ph: 'e.g. Kilat Renovation Works' }),
    F({ k: 'ref', label: 'SSM number, ID or plate', req: true, span: true }),
    F({ k: 'reason', label: 'Reason', type: 'textarea', rows: 3, req: true, span: true }),
    F({ k: 'scope', label: 'Applies to', type: 'radio', req: true, noOpt: true, span: true, v: S.scope === 'all' ? 'portfolio' : S.scope, opts: [['portfolio', `All tamans ${esc(ORG.short)} manages`, 'Other management companies are not affected.'], ...myTamans().map(t => [t.id, `${t.name} only`])] })))}</form>`,
  foot: footSave('Add to blacklist'),
  submit: d => { BLACKLIST.unshift({ id: 'BL-' + pad(8 + BLACKLIST.length), name: d.name.trim(), ref: d.ref.trim(), reason: d.reason.trim(), scope: d.scope, taman: d.scope === 'portfolio' ? undefined : d.scope, by: ME.name, at: clock() }); log('Blacklisted contractor', d.name, d.scope === 'portfolio' ? 'all' : d.scope); S.tab.enf = 'blacklist'; rerender(); toast(`${esc(d.name)} is blocked at ${d.scope === 'portfolio' ? 'every gate you manage' : `${esc(T(d.scope).short)}'s gates`}`); } });
ACT['bl-remove'] = el => { if (!armed(el, 'Remove?')) return; const b = BLACKLIST.find(x => x.id === el.dataset.id); BLACKLIST.splice(BLACKLIST.indexOf(b), 1); log('Removed from blacklist', b.name); rerender(); toast(`${esc(b.name)} removed from the blacklist`); };

ROUTES['permit-types'] = { title: 'Permit types & rules', render() {
  const tab = tabOf('ptab', 'types');
  return head({ title: 'Permit types & rules', path: 'permit-types', sub: 'What residents can apply for, what each permit costs, which documents it needs, and when contractors may work.' })
    + tabs('ptab', [['types', 'Permit types'], ['hours', 'Work hours by taman']], 'types') + (tab === 'types' ? typesView() : hoursView());
} };
function typesView() {
  const sel = PERMIT_TYPES.find(x => x.id === tabOf('ptype', 'reno'));
  return `<div class="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
    <nav class="panel p-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1" aria-label="Permit types">${PERMIT_TYPES.map(x => `<button type="button" class="pop-item" aria-current="${x === sel}" data-act="tab" data-k="ptype" data-v="${x.id}"><span class="tile tile-sun w-9 h-9">${icon(x.icon)}</span><span class="min-w-0"><span class="block text-[14px] font-semibold">${x.name}</span><span class="block text-[12.5px] text-muted">From ${RM0(x.deposit.Landed)} deposit</span></span></button>`).join('')}</nav>
    <form data-form="ptype" data-id="${sel.id}" novalidate class="grid gap-6 min-w-0">
      ${sect(`${sel.name}: deposit and fee`, grid(
        F({ k: 'depL', label: 'Refundable deposit, landed', type: 'money', v: sel.deposit.Landed, req: true, noOpt: true }),
        F({ k: 'depS', label: 'Refundable deposit, strata', type: 'money', v: sel.deposit.Strata, req: true, noOpt: true }),
        F({ k: 'fee', label: 'Processing fee, not refundable', type: 'money', v: sel.fee, req: true, noOpt: true }),
        F({ k: 'account', label: 'Refunds paid from', type: 'select', noOpt: true, v: sel.account, opts: REFUND_ACCOUNTS.map((a, i) => [i, a]) })), { sub: 'Residents pay by FPX, card, or upload a bank transfer receipt.' })}
      ${sect('Required documents', `<div class="divide-y divide-line">${sel.docs.map(([n, on], i) => F({ k: 'doc' + i, label: n, type: 'switch', v: on })).join('')}</div>
        <div class="mt-4 flex gap-2"><input class="input" id="newdoc" placeholder="Add a document, e.g. Neighbour consent letter" aria-label="New document type"><button type="button" class="btn btn-t" data-act="doc-add" data-id="${sel.id}">${icon('add')}Add</button></div>`, { sub: 'Switched-off documents are not asked for.' })}
      ${sect('Limits', grid(
        F({ k: 'maxWorkers', label: 'Most workers on site', type: 'number', noOpt: true, v: sel.maxWorkers, min: 1, max: 50, req: true }),
        F({ k: 'maxDays', label: 'Longest permit (days)', type: 'number', noOpt: true, v: sel.maxDays, min: 1, max: 365, req: true }),
        sel.maxTonnes ? F({ k: 'maxTonnes', label: 'Heaviest vehicle (tonnes)', type: 'number', noOpt: true, v: sel.maxTonnes, min: 1, req: true }) : '',
        F({ k: 'inspection', label: 'Inspect the site before refunding the deposit', type: 'switch', v: sel.inspection, span: true })))}
      <div><button type="submit" class="btn btn-p">Save ${esc(sel.name.toLowerCase())} rules</button></div>
    </form></div>`;
}
ACT['doc-add'] = el => { const i = $('#newdoc'), n = i.value.trim(); if (!n) { i.focus(); toast('Type the document name first'); return; } PERMIT_TYPES.find(x => x.id === el.dataset.id).docs.push([n, true]); rerender(); toast(`${esc(n)} added as a required document`); };
FORMS.ptype = (d, f) => { const t = PERMIT_TYPES.find(x => x.id === f.dataset.id); Object.assign(t, { deposit: { Landed: +d.depL, Strata: +d.depS }, fee: +d.fee, account: +d.account, maxWorkers: +d.maxWorkers, maxDays: +d.maxDays, inspection: d.inspection }); if (d.maxTonnes) t.maxTonnes = +d.maxTonnes; t.docs.forEach((x, i) => { x[1] = d['doc' + i]; }); log('Updated permit type', t.name, 'all'); rerender(); toast(`${esc(t.name)} rules saved. New applications use them.`); };
function hoursView() {
  const tid = myTamans().some(t => t.id === S.tab.htaman) ? S.tab.htaman : myTamans()[0].id, w = WORK_HOURS[tid];
  return `<div class="max-w-3xl">${S.scope === 'all' ? `<div class="seg mb-5 max-w-full overflow-x-auto no-sb" role="tablist" aria-label="Taman">${TAMANS.map(t => `<button type="button" role="tab" aria-selected="${t.id === tid}" data-act="tab" data-k="htaman" data-v="${t.id}">${esc(t.short)}</button>`).join('')}</div>` : ''}
    <form data-form="hours" data-id="${tid}" novalidate class="grid gap-6">
      ${sect(`Work hours in ${esc(T(tid).name)}`, grid(
        F({ k: 'wkFrom', label: 'Weekdays from', type: 'time', v: w.wkFrom, req: true, noOpt: true }), F({ k: 'wkTo', label: 'Weekdays until', type: 'time', v: w.wkTo, req: true, noOpt: true }),
        F({ k: 'satFrom', label: 'Saturday from', type: 'time', v: w.satFrom, req: true, noOpt: true }), F({ k: 'satTo', label: 'Saturday until', type: 'time', v: w.satTo, req: true, noOpt: true }))
        + `<div class="mt-4 divide-y divide-line">${F({ k: 'sunOff', label: 'No work on Sundays and public holidays', type: 'switch', v: w.sunOff })}${F({ k: 'quiet', label: 'No hacking or drilling on weekends', type: 'switch', v: w.quiet, hint: 'Quiet work such as painting is still allowed on Saturday.' })}</div>`, { sub: 'Guards turn contractors away outside these hours. They apply to every permit type.' })}
      <div><button type="submit" class="btn btn-p">Save work hours</button></div></form></div>`;
}
FORMS.hours = (d, f) => { if (d.wkTo <= d.wkFrom) return fieldErr(f, 'wkTo', 'Finish after the start time.'); if (d.satTo <= d.satFrom) return fieldErr(f, 'satTo', 'Finish after the start time.'); Object.assign(WORK_HOURS[f.dataset.id], d); log('Updated work hours', T(f.dataset.id).name, f.dataset.id); toast(`Work hours saved for ${esc(T(f.dataset.id).name)}. Guards get them at the next sync.`); };

// ================= Billing =================
const metric = (k, v, s, tone = '') => `<div class="panel px-5 py-4 min-w-0"><p class="text-[13px] text-muted">${k}</p><p class="mt-1 text-[20px] font-semibold num truncate ${tone}">${v}</p><p class="mt-0.5 text-[12.5px] text-muted">${s}</p></div>`;
ROUTES.invoices = { title: 'Invoices', render() {
  const tab = tabOf('inv', 'list'), inv = INVOICES.filter(inScope), oct = inv.filter(i => i.period === 'Oct 2026'), sep = inv.filter(i => i.period === 'Sep 2026' && ['Overdue', 'Partially paid'].includes(i.status));
  const billed = sum(oct, i => i.amount), paid = sum(oct, i => i.paid);
  return head({ title: 'Invoices', path: 'invoices', sub: 'Maintenance, sinking fund and extra charges for every unit. Owners pay in the app; payments arrive in Reconciliation.', actions: `<button type="button" class="btn btn-t" data-act="bulk-invoice">${icon('library_add')}Bulk create</button><button type="button" class="btn btn-p" data-act="new-invoice">${icon('add')}Create invoice</button>` })
    + `<div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">${metric('Billed for October', RM0(billed), `${N(oct.length)} invoices`)}${metric('Collected', RM0(paid), `${pct(paid, billed)}% · due 15 Oct`)}${metric('Still due for October', RM0(billed - paid), `${N(oct.filter(i => i.status !== 'Paid').length)} units`)}${metric('Overdue from September', RM0(sum(sep, i => i.amount - i.paid)), `${sep.length} units · late charges apply`, 'text-bad-ink')}</div>`
    + tabs('inv', [['list', 'Invoices', N(inv.length)], ['sched', 'Schedules', SCHEDULES.filter(inScope).length]], 'list')
    + (tab === 'list' ? ixHTML({ id: 'invoices', noun: 'invoices', ph: 'Search invoice, unit or owner', rows: () => INVOICES, text: i => `${i.id} ${uname(i.unit)} ${pn(i.owner)} ${i.desc}`,
        filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Due', 'Overdue', 'Partially paid', 'Paid', 'Void'] }, { k: 'type', label: 'Type', all: 'All types', opts: ['Maintenance & sinking fund', 'Sinking fund only', 'Extra charge'] }, { k: 'period', label: 'Period', all: 'All periods', opts: ['Oct 2026', 'Sep 2026'] }],
        cols: [
          { h: 'Invoice', v: i => t2(i.id, i.desc), s: i => i.id, t: i => i.id },
          { h: 'Unit', v: i => t2(uname(i.unit), T(i.taman).short), s: i => U(i.unit)?.ord ?? 0, t: i => uname(i.unit) },
          { h: 'Owner', hide: 'hidden lg:table-cell', v: i => esc(pn(i.owner)), s: i => pn(i.owner) },
          { h: 'Due', v: i => dDate(i.due), s: i => i.due, t: i => dDate(i.due) },
          { h: 'Amount', num: true, v: i => RM(i.amount), s: i => i.amount, t: i => i.amount.toFixed(2) },
          { h: 'Balance', num: true, hide: 'hidden xl:table-cell', v: i => i.amount - i.paid ? RM(i.amount - i.paid) : muted('—'), s: i => i.amount - i.paid, t: i => (i.amount - i.paid).toFixed(2) },
          { h: 'Status', badge: true, v: i => stc(i.status), s: i => i.status, t: i => i.status },
        ], sort: 3, dir: -1, open: invoiceDrawer, sum: rows => `${RM(sum(rows.filter(i => i.status !== 'Void'), i => i.amount - i.paid))} outstanding` })
      : ixHTML({ id: 'schedules', noun: 'schedules', ph: 'Search schedule', rows: () => SCHEDULES, text: s => `${s.name} ${s.target}`, csv: false,
        filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Active', 'Paused'] }],
        cols: [
          { h: 'Schedule', v: s => t2(s.name, s.target), s: s => s.name },
          { h: 'Taman', taman: true, v: s => esc(T(s.taman).short) },
          { h: 'Amount', v: s => esc(s.amount) },
          { h: 'Repeats', v: s => esc(s.freq) },
          { h: 'Next invoices', v: s => dDate(s.next), s: s => s.next },
          { h: 'Status', badge: true, v: s => stc(s.status) },
          { h: '', act: true, v: s => `<button type="button" class="btn btn-o btn-sm" data-act="sched-toggle" data-id="${s.id}">${icon(s.status === 'Active' ? 'pause' : 'play_arrow')}${s.status === 'Active' ? 'Pause' : 'Resume'}</button>` },
        ] }));
}, after: id => { const i = id && INVOICES.find(x => x.id === id); if (i) inScope(i) ? invoiceDrawer(i) : toast('That invoice is outside the current taman scope.'); } };
ACT['sched-toggle'] = el => { const s = SCHEDULES.find(x => x.id === el.dataset.id); s.status = s.status === 'Active' ? 'Paused' : 'Active'; log(`${s.status === 'Paused' ? 'Paused' : 'Resumed'} invoice schedule`, s.name, s.taman); rerender(); toast(`${esc(s.name)} ${s.status === 'Paused' ? 'paused. No invoices go out until you resume it.' : 'resumed'}`); };
function invoiceDrawer(i) {
  const bal = i.amount - i.paid, open = bal > 0 && i.status !== 'Void';
  drawer({ title: i.id, sub: `${esc(i.desc)} · ${esc(uname(i.unit))}, ${esc(T(i.taman).short)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Invoice', dl([['Owner', esc(pn(i.owner))], ['Status', stc(i.status)], ['Issued', dDate(i.issued)], ['Due', dDate(i.due)], ['Amount', RM(i.amount)], ['Balance', `<b class="num ${bal > 0 ? 'text-bad-ink' : ''}">${RM(bal)}</b>`]]))}
      ${open ? sect('Record a payment', grid(F({ k: 'amount', label: 'Amount received', type: 'money', v: bal.toFixed(2), req: true, noOpt: true, min: 0.01, max: bal }), F({ k: 'method', label: 'Paid by', type: 'select', noOpt: true, v: 'Bank transfer', opts: ['Bank transfer', 'Cash at office', 'Cheque'] }), F({ k: 'ref', label: 'Reference', span: true, ph: 'Cheque or transfer number' })), { sub: 'For payments made outside the app. App payments record themselves.' }) : ''}
    </form>`,
    foot: open ? `<button type="button" class="btn btn-d sm:mr-auto" data-act="inv-void" data-id="${i.id}">Void</button><button type="button" class="btn btn-o" data-act="inv-remind" data-id="${i.id}">${icon('notifications')}Send reminder</button><button type="submit" form="dr-form" class="btn btn-p">Record payment</button>` : `<button type="button" class="btn btn-o" data-act="drawer-close">Close</button>`,
    submit: d => { const a = Math.min(+d.amount, bal); i.paid += a; i.status = i.paid >= i.amount ? 'Paid' : 'Partially paid'; PAYMENTS.unshift({ id: 'PAY-' + (89000 + PAYMENTS.length), at: clock(), payer: pn(i.owner), unit: i.unit, taman: i.taman, channel: d.method, ref: d.ref.trim() || 'Recorded at office', amount: a, status: 'Matched', invoice: i.id, kind: 'Invoice' }); log('Recorded payment', `${i.id} · ${RM(a)}`, i.taman); rerender(); toast(`${RM(a)} recorded against ${i.id}`); } });
}
ACT['inv-void'] = el => { if (!armed(el, 'Void it?')) return; const i = INVOICES.find(x => x.id === el.dataset.id); i.status = 'Void'; log('Voided invoice', i.id, i.taman); closeDrawer(); rerender(); toast(`${i.id} voided. The owner no longer sees it as due.`); };
ACT['inv-remind'] = el => { const i = INVOICES.find(x => x.id === el.dataset.id); log('Sent payment reminder', i.id, i.taman); toast(`Reminder sent to ${esc(pn(i.owner))} by push and SMS`); };
const invTargets = d => d.target === 'taman' ? UNITS.filter(u => u.taman === d.taman) : d.target === 'block' ? (([t, b]) => UNITS.filter(u => u.taman === t && u.block === b))((d.block || '|').split('|')) : UNITS.filter(u => inScope(u) && u.name.toLowerCase() === (d.unit || '').trim().toLowerCase());
ACT['new-invoice'] = () => drawer({ title: 'Create invoice', sub: esc(scopeName()),
  body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
    ${sect('Charge', grid(
      F({ k: 'type', label: 'Type', type: 'select', noOpt: true, opts: ['Extra charge', 'Maintenance & sinking fund', 'Sinking fund only'], v: 'Extra charge' }),
      F({ k: 'desc', label: 'Description on the invoice', req: true, af: true, ph: 'e.g. Remote gate fob' }),
      F({ k: 'amount', label: 'Amount per unit', type: 'money', req: true, min: 0.01 }),
      F({ k: 'due', label: 'Due date', type: 'date', v: '2026-10-17', min: '2026-10-03', req: true })))}
    ${sect('Bill to', grid(
      F({ k: 'target', label: 'Who gets it', type: 'radio', cols: 3, noOpt: true, v: 'unit', span: true, opts: [['taman', 'Whole taman'], ['block', 'A street or block'], ['unit', 'One unit']] }),
      F({ k: 'taman', label: 'Taman', type: 'select', opts: tamanOpts(), v: myTamans()[0].id, req: true, when: 'target=taman', span: true }),
      F({ k: 'block', label: 'Street or block', type: 'select', opts: blockOpts(), req: true, when: 'target=block', ph: 'Choose', span: true }),
      F({ k: 'unit', label: 'Unit', list: 'inv-units', req: true, when: 'target=unit', ph: 'Start typing, e.g. No. 12, Jalan Harmoni 3', span: true }))
      + `<datalist id="inv-units">${UNITS.filter(inScope).map(u => `<option value="${esc(u.name)}">`).join('')}</datalist>`)}
    ${sect('Repeat', F({ k: 'repeat', label: 'How often', type: 'radio', cols: 2, noOpt: true, v: 'once', opts: [['once', 'One-off'], ['monthly', 'Every month'], ['quarterly', 'Every quarter'], ['yearly', 'Every year']] }), { sub: 'Repeating invoices are kept in Schedules.' })}
    <output id="inv-sum" class="block rounded-2xl bg-indigo-tint p-4 text-[14px] leading-6 text-indigo" aria-live="polite"></output>
  </form>`,
  foot: footSave('Create invoices'),
  input: f => { const d = formData(f), n = invTargets(d).length; $('#inv-sum').innerHTML = `Creates <b class="num">${N(n)}</b> invoice${n === 1 ? '' : 's'}${+d.amount ? `, <b class="num">${RM(n * +d.amount)}</b> in total` : ''}${d.repeat !== 'once' ? `, then again ${d.repeat === 'monthly' ? 'every month' : d.repeat === 'quarterly' ? 'every quarter' : 'every year'}` : ''}. Owners get a push notification.`; },
  submit: (d, f) => {
    const units = invTargets(d);
    if (!units.length) return fieldErr(f, d.target === 'unit' ? 'unit' : 'block', 'No unit in your tamans matches. Pick one from the suggestions.');
    for (const u of units) INVOICES.unshift({ id: `INV-2610-${String(invN++).padStart(5, '0')}`, taman: u.taman, unit: u.id, owner: u.owner, type: d.type, desc: d.desc.trim(), amount: +d.amount, issued: clock(), due: new Date(d.due), status: 'Due', paid: 0, period: 'Oct 2026' });
    const label = d.target === 'unit' ? units[0].name : d.target === 'block' ? d.block.split('|')[1] : 'All units';
    if (d.repeat !== 'once') SCHEDULES.unshift({ id: 'SCH-' + pad(SCHEDULES.length + 1), name: d.desc.trim(), taman: units[0].taman, target: label, amount: `${RM(+d.amount)} / unit`, freq: { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }[d.repeat], next: at(29), status: 'Active' });
    log('Created invoices', `${units.length} × ${d.desc.trim()}`, units[0].taman); rerender(); toast(`${N(units.length)} invoice${units.length > 1 ? 's' : ''} created for ${RM(units.length * +d.amount)}`, { href: '#/invoices', label: 'View' });
  } });

// Bulk invoices: one line per invoice (unit, description, amount), pasted from a spreadsheet or uploaded as CSV
const normUnit = s => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const csvFields = line => {
  if (line.includes('\t')) return line.split('\t').map(s => s.trim());
  const out = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  return [...out, cur.trim()];
};
const toAmount = s => { const v = Number(String(s || '').replace(/rm|,|\s/gi, '')); return v > 0 ? Math.round(v * 100) / 100 : NaN; };
function bulkParse(text, defDesc) {
  const all = new Map(UNITS.map(u => [normUnit(u.name), u])), seen = new Map(), lines = []; let blank = 0;
  String(text || '').split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const f = csvFields(raw);
    if (lines.length === 0 && /^unit$/i.test(f[0])) return; // template header row
    if (f.length >= 3 && !f.at(-1) && !f.at(-2)) { blank++; return; } // template row left empty
    const rest = f.length > 1 ? f.slice(0, -1) : f, amount = toAmount(f.length > 1 ? f.at(-1) : '');
    // Unit numbers contain commas ("No. 12, Jalan Harmoni 3"), so take the longest leading run of fields that names a unit
    let u = null, desc = '';
    for (let k = rest.length; k >= 1 && !u; k--) { const hit = all.get(normUnit(rest.slice(0, k).join(', '))); if (hit) { u = hit; desc = rest.slice(k).join(', ').trim(); } }
    desc ||= defDesc;
    const key = u ? `${u.id}|${desc.toLowerCase()}` : '';
    const err = !u ? 'Unit not found in your tamans. Check it matches Blocks & units.' : !inScope(u) ? `${u.name} is in ${T(u.taman).short}, outside the current scope` : isNaN(amount) ? 'Amount is missing or not a number' : !desc ? 'Needs a description, or fill in the default above' : seen.has(key) ? `Same unit and description as line ${seen.get(key)}` : '';
    if (!err) seen.set(key, i + 1);
    lines.push({ n: i + 1, raw, u, desc, amount, err });
  });
  return { lines, blank };
}
function bulkRefresh(f) {
  const d = formData(f), { lines, blank } = bulkParse(d.lines, d.desc.trim()), ok = lines.filter(l => !l.err), bad = lines.filter(l => l.err), total = sum(ok, l => l.amount);
  const row = l => `<li class="py-3 flex items-start gap-3">
    <span class="w-6 shrink-0 pt-0.5 text-[12.5px] text-muted num" aria-label="Line ${l.n}">${l.n}</span>
    <div class="min-w-0 flex-1">${l.u ? `<p class="text-[14px] font-semibold">${esc(l.u.name)}</p><p class="text-[12.5px] text-muted">${l.desc ? `${esc(l.desc)} · ` : ''}${esc(T(l.u.taman).short)} · ${esc(pn(l.u.owner))}</p>` : `<p class="text-[14px] break-words">${esc(l.raw)}</p>`}${l.err ? `<p class="mt-1 flex gap-1.5 text-[12.5px] font-semibold text-bad-ink">${icon('error', 'text-[16px]')}${esc(l.err)}</p>` : ''}</div>
    <span class="shrink-0 flex items-center gap-1.5 text-[14px] font-semibold num">${isNaN(l.amount) ? '' : RM(l.amount)}${l.err ? '' : icon('check_circle', 'text-[18px] text-ok')}</span></li>`;
  $('#bulk-prev').innerHTML = !lines.length ? `<p class="text-[13.5px] text-muted">Paste lines or upload a CSV. Each line is checked here before anything is created.${blank ? ` ${N(blank)} empty template rows are ignored.` : ''}</p>`
    : `<div class="flex flex-wrap items-center gap-2 mb-3">${stc(`${N(ok.length)} ready`, 'ok')}${bad.length ? stc(`${N(bad.length)} to fix`, 'bad') : ''}${blank ? `<span class="text-[12.5px] text-muted">${N(blank)} empty template rows ignored</span>` : ''}<span class="ml-auto text-[15px] font-semibold num">${RM(total)}</span></div>
      <ul class="divide-y divide-line border-t border-line">${[...bad.slice(0, 50), ...ok.slice(0, 30)].map(row).join('')}</ul>
      ${ok.length > 30 ? `<p class="mt-3 text-[12.5px] text-muted">Showing 30 of ${N(ok.length)} ready lines.</p>` : ''}${bad.length ? `<p class="mt-3 text-[12.5px] text-muted">Lines to fix are skipped and stay in the box after you create the rest.</p>` : ''}`;
  const b = $('#bulk-go'); b.textContent = ok.length ? `Create ${N(ok.length)} invoice${ok.length > 1 ? 's' : ''} · ${RM(total)}` : 'Create invoices'; b.disabled = !ok.length && !!d.lines.trim();
}
ACT['bulk-invoice'] = () => {
  drawer({ wide: true, title: 'Bulk create invoices', sub: `${esc(scopeName())} · one invoice per line`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('For every line', grid(
        F({ k: 'type', label: 'Type', type: 'select', noOpt: true, opts: ['Extra charge', 'Maintenance & sinking fund', 'Sinking fund only'], v: 'Extra charge' }),
        F({ k: 'due', label: 'Due date', type: 'date', v: '2026-10-17', min: '2026-10-03', req: true }),
        F({ k: 'desc', label: 'Default description', span: true, ph: 'e.g. Water usage, September', hint: 'Used for any line that leaves its description out.' })))}
      ${sect('Invoices', `<div class="flex flex-wrap gap-2 mb-4"><label class="btn btn-o btn-sm cursor-pointer">${icon('upload_file')}Upload CSV<input type="file" name="file" accept=".csv,.txt,text/csv" class="sr-only"></label><button type="button" class="btn btn-g btn-sm" data-act="bulk-template">${icon('download')}Template with your units</button></div>`
        + F({ k: 'lines', label: 'One invoice per line: unit, description, amount', type: 'textarea', rows: 7, req: true, noOpt: true, af: true, msg: 'Paste or type at least one line.', ph: 'No. 12, Jalan Harmoni 3, Water leak repair, 150\nNo. 7, Jalan BI 2, Remote gate fob, 80\nB-07-04, Car sticker, 30', hint: 'Paste straight from Excel or Google Sheets, or type with commas. Unit numbers must match Blocks & units.' }), { sub: 'Different units, descriptions and amounts in one go.' })}
      ${sect('Check before creating', `<div id="bulk-prev" aria-live="polite"></div>`)}
    </form>`,
    foot: `<button type="button" class="btn btn-o" data-act="drawer-close">Cancel</button><button type="submit" form="dr-form" class="btn btn-p" id="bulk-go">Create invoices</button>`,
    input: (f, e) => {
      const file = e?.target?.type === 'file' && e.target.files[0];
      if (!file) return bulkRefresh(f);
      const r = new FileReader();
      r.onload = () => { f.elements.lines.value = String(r.result).trim(); e.target.value = ''; bulkRefresh(f); toast(`${esc(file.name)} loaded. Check the lines below.`); };
      r.onerror = () => toast(`Couldn't read ${esc(file.name)}. Save it as CSV and try again.`);
      r.readAsText(file);
    },
    submit: (d, f) => {
      const { lines } = bulkParse(d.lines, d.desc.trim()), ok = lines.filter(l => !l.err), bad = lines.filter(l => l.err);
      if (!ok.length) return fieldErr(f, 'lines', bad.length ? 'None of these lines can be created yet. Fix the problems listed below.' : 'Paste or type at least one line.');
      for (const l of ok) INVOICES.unshift({ id: `INV-2610-${String(invN++).padStart(5, '0')}`, taman: l.u.taman, unit: l.u.id, owner: l.u.owner, type: d.type, desc: l.desc, amount: l.amount, issued: clock(), due: new Date(d.due), status: 'Due', paid: 0, period: 'Oct 2026' });
      const total = sum(ok, l => l.amount);
      log('Bulk-created invoices', `${ok.length} invoices · ${RM(total)}`, ok[0].u.taman); rerender();
      if (!bad.length) { toast(`${N(ok.length)} invoice${ok.length > 1 ? 's' : ''} created for ${RM(total)}. Owners get a push notification.`, { href: '#/invoices', label: 'View' }); return; }
      f.elements.lines.value = bad.map(l => l.raw).join('\n'); bulkRefresh(f);
      toast(`${N(ok.length)} invoices created for ${RM(total)}. ${N(bad.length)} line${bad.length > 1 ? 's' : ''} left in the box to fix.`);
      return false; // keep the drawer open on the lines that still need fixing
    } });
  if (QS.has('sample')) { const f = $('#dr-form'); f.elements.lines.value = 'No. 12, Jalan Harmoni 3, Water leak repair, 150\nNo. 7, Jalan BI 2, Remote gate fob, 80\nB-07-04, Car sticker, 30\nNo. 99, Jalan Harmoni 9, Car sticker, 30'; bulkRefresh(f); }
};
// Self-check for the bulk parser: open index.html?demo=1&check and read the console
function checkBulkParse() {
  const one = (t, d = '') => bulkParse(t, d).lines[0], was = S.scope, cases = [];
  const ok = (name, cond) => cases.push([name, !!cond]);
  let l = one('No. 12, Jalan Harmoni 3, Water leak repair, 150'); ok('comma inside unit number', l.u?.name === 'No. 12, Jalan Harmoni 3' && l.desc === 'Water leak repair' && l.amount === 150 && !l.err);
  l = one('No. 7, Jalan BI 2\tRemote gate fob\tRM 1,080.50'); ok('tab-separated with RM amount', l.u?.name === 'No. 7, Jalan BI 2' && l.amount === 1080.5 && !l.err);
  ok('missing description is an error', /description/.test(one('B-07-04, 30').err));
  ok('default description fills in', one('B-07-04, 30', 'Car sticker').desc === 'Car sticker');
  l = one('"No. 12, Jalan Harmoni 3","Water, Sept",42'); ok('quoted CSV fields', l.desc === 'Water, Sept' && l.amount === 42);
  const t = bulkParse('"Unit","Description","Amount"\n"No. 1, Jalan Harmoni 1","",""\n"No. 2, Jalan Harmoni 1","Fob","80"', ''); ok('template header and blank rows skipped', t.lines.length === 1 && t.blank === 1);
  ok('duplicate line flagged', /line 1/.test(bulkParse('B-07-04, Sticker, 30\nB-07-04, Sticker, 30', '').lines[1].err));
  ok('unknown unit flagged', /not found/.test(one('No. 99, Jalan Harmoni 9, Sticker, 30').err));
  ok('bad amount flagged', /Amount/.test(one('No. 12, Jalan Harmoni 3, Sticker, abc').err));
  S.scope = 'bi'; ok('unit outside the current scope flagged', /outside the current scope/.test(one('No. 12, Jalan Harmoni 3, Sticker, 30').err)); S.scope = was;
  cases.forEach(([n, pass]) => console.assert(pass, `bulkParse: ${n}`));
  console.log(`bulkParse: ${cases.filter(c => c[1]).length}/${cases.length} checks pass`);
}
ACT['bulk-template'] = () => { const units = UNITS.filter(inScope); download(`tamanly-bulk-invoices-${S.scope}.csv`, toCSV([['Unit', u => u.name], ['Description', () => ''], ['Amount', () => '']], units)); toast(`Template with ${N(units.length)} units downloaded. Fill in description and amount for the units to bill, then upload it.`); };

ROUTES.reconciliation = { title: 'Reconciliation', render() {
  const all = PAYMENTS.filter(inScope), tab = tabOf('rec', 'Unmatched'), n = s => all.filter(p => p.status === s).length;
  return head({ title: 'Payment reconciliation', path: 'reconciliation', sub: 'Every payment that reached your accounts. Match each one to an invoice or permit deposit so balances stay right.', actions: `<button type="button" class="btn btn-t" data-act="auto-match">${icon('auto_awesome')}Auto-match by reference</button>` })
    + `<div class="seg mb-5 max-w-full overflow-x-auto no-sb" role="tablist" aria-label="Payment status">${[['Unmatched', 'To match'], ['Receipt to verify', 'Receipts to verify'], ['Matched', 'Matched'], ['Failed', 'Failed'], ['all', 'All']].map(([v, l]) => `<button type="button" role="tab" aria-selected="${tab === v}" data-act="tab" data-k="rec" data-v="${v}">${l} <span class="n">${v === 'all' ? all.length : n(v)}</span></button>`).join('')}</div>`
    + ixHTML({ id: 'recon', noun: 'payments', ph: 'Search payer, reference or unit', rows: () => PAYMENTS.filter(p => tabOf('rec', 'Unmatched') === 'all' || p.status === tabOf('rec', 'Unmatched')), text: p => `${p.id} ${p.payer} ${p.ref} ${uname(p.unit)} ${p.invoice || ''} ${p.permit || ''}`,
      filters: [tamanF(), { k: 'channel', label: 'Channel', all: 'All channels', opts: ['FPX', 'Card', 'DuitNow QR', 'Bank transfer', 'Cash at office', 'Cheque'] }, { k: 'kind', label: 'For', all: 'Invoices and deposits', opts: ['Invoice', 'Permit deposit'] }, dateF(p => p.at, 'Received')],
      cols: [
        { h: 'Received', v: p => dWhen(p.at), s: p => p.at, t: p => p.at.toISOString() },
        { h: 'Payer', v: p => t2(p.payer, `${uname(p.unit)} · ${T(p.taman).short}`), s: p => p.payer, t: p => p.payer },
        { h: 'Channel', v: p => t2(p.channel, p.failReason || p.ref), t: p => `${p.channel} ${p.ref}` },
        { h: 'Amount', num: true, v: p => RM(p.amount), s: p => p.amount, t: p => p.amount.toFixed(2) },
        { h: 'For', hide: 'hidden xl:table-cell', v: p => p.invoice ? `<a class="font-semibold text-indigo hover:underline" href="#/invoices/${p.invoice}">${p.invoice}</a>` : p.permit ? `<a class="font-semibold text-indigo hover:underline" href="#/permit/${p.permit}">${p.permit} deposit</a>` : muted('Not matched'), t: p => p.invoice || p.permit || '' },
        { h: 'Status', badge: true, v: p => stc(p.status), s: p => p.status, t: p => p.status },
        { h: '', act: true, v: p => p.status === 'Unmatched' ? `<button type="button" class="btn btn-t btn-sm" data-act="match" data-id="${p.id}">Match</button>` : p.status === 'Receipt to verify' ? `<button type="button" class="btn btn-t btn-sm" data-act="match" data-id="${p.id}">Verify</button>` : p.status === 'Failed' ? `<button type="button" class="btn btn-o btn-sm" data-act="pay-notify" data-id="${p.id}">Tell payer</button>` : '' },
      ], sort: 0, dir: -1, open: matchDrawer, sum: rows => RM(sum(rows, p => p.amount)), emptyTitle: 'All caught up', emptyText: 'Nothing in this list. New payments arrive here within minutes of being made.' });
} };
ACT.match = el => matchDrawer(PAYMENTS.find(p => p.id === el.dataset.id));
ACT['pay-notify'] = el => { const p = PAYMENTS.find(x => x.id === el.dataset.id); toast(`${esc(p.payer)} told the payment failed (${esc(p.failReason || 'declined')}) and asked to try again`); };
ACT['auto-match'] = () => {
  let n = 0;
  for (const p of PAYMENTS.filter(x => inScope(x) && x.status === 'Unmatched')) { const id = (p.ref.match(/INV-\d{4}-\d{5}/) || [])[0]; const i = id && INVOICES.find(x => x.id === id); if (!i) continue; i.paid = Math.min(i.amount, i.paid + p.amount); i.status = i.paid >= i.amount ? 'Paid' : 'Partially paid'; p.status = 'Matched'; p.invoice = i.id; n++; }
  const left = PAYMENTS.filter(x => inScope(x) && x.status === 'Unmatched').length;
  if (n) log('Auto-matched payments', `${n} by reference`); rerender(); toast(n ? `Matched ${n} payment${n > 1 ? 's' : ''} by invoice number in the reference. ${left} still need you.` : `No references contain an invoice number. ${left} payments need matching by hand.`);
};
function matchDrawer(p) {
  if (p.kind === 'Permit deposit') { location.hash = '#/permit/' + p.permit; return; }
  const cands = INVOICES.filter(i => i.unit === p.unit && ['Due', 'Overdue', 'Partially paid'].includes(i.status)), hint = cands.find(i => i.id === p.hint), done = p.status === 'Matched' || p.status === 'Failed';
  drawer({ title: p.receipt ? 'Verify receipt' : done ? 'Payment' : 'Match payment', sub: `${RM(p.amount)} from ${esc(p.payer)} · ${p.channel}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${p.receipt ? sect('Receipt', receiptCard(p)) : sect('Payment', dl([['Reference', esc(p.ref)], ['Received', dWhen(p.at)], ['Unit', esc(uname(p.unit))], ['Status', stc(p.status)]]))}
      ${done ? (p.invoice ? sect('Matched', `<p class="text-[14px]">Paid against <a class="font-semibold text-indigo underline" href="#/invoices/${p.invoice}">${p.invoice}</a>.</p>`) : '')
        : sect('Match to invoice', cands.length ? F({ k: 'inv', label: `Open invoices for ${esc(uname(p.unit))}`, type: 'radio', noOpt: true, req: true, v: hint?.id || (cands.length === 1 ? cands[0].id : ''), msg: 'Choose the invoice this payment is for.', opts: cands.map(i => [i.id, `${i.id} · ${RM(i.amount - i.paid)}`, `${i.desc} · due ${dDate(i.due)}${i.amount - i.paid === p.amount ? ' · amount matches' : ''}`]) }) : `<p class="text-[13.5px] text-muted">No open invoices for this unit. Keep it as credit, or refund the payer.</p>`)
        + (p.receipt ? sect('Receipt check', F({ k: 'decision', label: 'Is the money in our account?', type: 'radio', noOpt: true, v: 'ok', opts: [['ok', 'Yes, verify and match'], ['bad', 'No, reject the receipt', 'The payer is asked to upload it again']] }) + `<div class="mt-4">${F({ k: 'why', label: 'Why', type: 'select', noOpt: true, when: 'decision=bad', opts: ['Amount not received in our account', 'Receipt unreadable', 'Paid to the wrong account', 'Duplicate receipt'] })}</div>`) : '')}
    </form>`,
    foot: done ? `<button type="button" class="btn btn-o" data-act="drawer-close">Close</button>` : footSave(p.receipt ? 'Confirm' : 'Match payment'),
    submit: (d, f) => {
      if (d.decision === 'bad') { p.status = 'Failed'; p.failReason = d.why; log('Rejected payment receipt', p.id, p.taman); rerender(); toast(`Receipt rejected. ${esc(p.payer)} is asked to upload it again.`); return; }
      if (!cands.length) { toast('Kept as credit on the unit'); return; }
      const i = INVOICES.find(x => x.id === d.inv); i.paid = Math.min(i.amount, i.paid + p.amount); i.status = i.paid >= i.amount ? 'Paid' : 'Partially paid'; p.status = 'Matched'; p.invoice = i.id;
      log('Matched payment', `${p.id} → ${i.id}`, p.taman); buildNotifs(); rerender(); toast(`${RM(p.amount)} matched to ${i.id}. ${i.status === 'Paid' ? 'Invoice paid.' : 'A balance remains.'}`);
    } });
}

ROUTES.escrow = { title: 'Deposit escrow', render() {
  const L = ledger().filter(inScope), tab = tabOf('esc', 'payouts'), waiting = PERMITS.filter(p => inScope(p) && p.status === 'Completed');
  const row = (name, l, ps) => `<tr><td class="font-medium">${name}</td><td class="num font-semibold">${RM(sum(l.filter(x => x.escrow), x => x.amount))}</td><td class="num">${ps.filter(p => p.depositState === 'Held').length}</td><td class="num">${RM(sum(ps.filter(p => p.status === 'Completed'), p => p.refund.amount))}</td><td class="num">${RM(-sum(l.filter(x => x.type === 'Refund paid'), x => x.amount))}</td><td class="num">${RM(-sum(l.filter(x => x.type === 'Kept for repairs' || x.type === 'Forfeited to repair fund'), x => x.amount))}</td></tr>`;
  return head({ title: 'Deposit escrow', path: 'escrow', sub: 'Permit deposits held for residents, what was kept for repairs, and refunds paid out. Processing fees go to the operating account, not escrow.' })
    + `<section class="panel overflow-hidden mb-6"><div class="overflow-x-auto"><table class="tbl min-w-[720px]"><thead><tr><th>Taman</th><th class="num">Held now</th><th class="num">Active deposits</th><th class="num">Awaiting payout</th><th class="num">Refunded</th><th class="num">Kept for repairs</th></tr></thead><tbody>
      ${myTamans().map(t => row(esc(t.name), L.filter(x => x.taman === t.id), PERMITS.filter(p => p.taman === t.id))).join('')}
      ${S.scope === 'all' ? row('All tamans', L, PERMITS).replace('<tr>', '<tr class="bg-paper font-semibold">') : ''}</tbody></table></div></section>`
    + tabs('esc', [['payouts', 'Refund payouts', waiting.length], ['ledger', 'Escrow ledger', L.length]], 'payouts')
    + (tab === 'payouts' ? ixHTML({ id: 'payouts', noun: 'refunds', one: 'refund', ph: 'Search permit, unit or payee', rows: () => PERMITS.filter(p => p.refund && ['Completed', 'Deposit Refunded'].includes(p.status)), text: p => `${p.id} ${uname(p.unit)} ${p.applicant} ${p.bank}`,
        filters: [tamanF(), { k: 'st', label: 'Status', all: 'All statuses', opts: ['Awaiting payout', 'Paid out'], get: stage }, { k: 'dec', label: 'Outcome', all: 'All outcomes', opts: ['Full refund', 'Partial refund', 'Forfeited'], get: p => p.refund.decision }],
        cols: [
          { h: 'Permit', v: p => t2(uname(p.unit), `${p.id} · ${T(p.taman).short}`), s: p => p.id, t: p => p.id },
          { h: 'Payee', v: p => t2(p.applicant, p.bank), s: p => p.applicant, t: p => `${p.applicant} ${p.bank}` },
          { h: 'Outcome', v: p => stc(p.refund.decision, p.refund.decision === 'Full refund' ? 'ok' : p.refund.decision === 'Forfeited' ? 'bad' : 'sun'), t: p => p.refund.decision },
          { h: 'Kept', num: true, hide: 'hidden lg:table-cell', v: p => RM(p.deposit - p.refund.amount), t: p => (p.deposit - p.refund.amount).toFixed(2) },
          { h: 'Refund', num: true, v: p => `<b>${RM(p.refund.amount)}</b>`, s: p => p.refund.amount, t: p => p.refund.amount.toFixed(2) },
          { h: 'Decided', hide: 'hidden 2xl:table-cell', v: p => dDate(p.refund.decided), s: p => p.refund.decided, t: p => dDate(p.refund.decided) },
          { h: 'Status', badge: true, v: p => stc(stage(p)), s: stage, t: stage },
          { h: '', act: true, v: p => p.status === 'Completed' ? `<button type="button" class="btn btn-p btn-sm" data-act="payout" data-id="${p.id}">${p.refund.decision === 'Forfeited' ? 'Close' : 'Mark paid'}</button>` : '' },
        ], sort: 6, dir: 1, open: p => { location.hash = '#/permit/' + p.id; } })
      : ixHTML({ id: 'ledger', noun: 'ledger entries', one: 'ledger entry', ph: 'Search permit, unit or reference', rows: ledger, text: l => `${l.permit} ${uname(l.unit)} ${l.type} ${l.ref}`,
        filters: [tamanF(), { k: 'type', label: 'Entry', all: 'All entries', opts: ['Deposit received', 'Refund paid', 'Kept for repairs', 'Forfeited to repair fund', 'Processing fee'] }, dateF(l => l.at)],
        cols: [
          { h: 'Date', v: l => dDate(l.at), s: l => l.at, t: l => dDate(l.at) },
          { h: 'Permit', v: l => t2(uname(l.unit), l.permit), t: l => l.permit },
          { h: 'Entry', v: l => stc(l.type, l.type === 'Deposit received' ? 'indigo' : l.type === 'Refund paid' ? 'ok' : l.type === 'Processing fee' ? 'mute' : 'coral'), t: l => l.type },
          { h: 'Account', hide: 'hidden lg:table-cell', v: l => l.escrow ? 'Escrow' : muted('Operating'), t: l => l.escrow ? 'Escrow' : 'Operating' },
          { h: 'Amount', num: true, v: l => `<span class="${l.amount < 0 ? 'text-bad-ink' : l.escrow ? 'text-ok-ink' : 'text-muted'} font-semibold">${l.amount < 0 ? '−' : '+'} ${RM(Math.abs(l.amount))}</span>`, s: l => l.amount, t: l => l.amount.toFixed(2) },
        ], sort: 0, dir: -1, sum: rows => `${RM(sum(rows.filter(l => l.escrow), l => l.amount))} net to escrow`, open: l => { location.hash = '#/permit/' + l.permit; } }));
} };
ACT.payout = el => { const p = PM(el.dataset.id);
  if (p.refund.decision === 'Forfeited') { p.refund.paid = clock(); p.status = 'Deposit Refunded'; p.depositState = 'Forfeited'; trail(p).push({ at: clock(), text: 'Permit closed. Deposit moved to the repair fund.', who: ME.name, ic: 'lock' }); log('Closed forfeited deposit', p.id, p.taman); rerender(); toast(`${p.id} closed`); return; }
  drawer({ title: 'Mark refund paid', sub: `${RM(p.refund.amount)} to ${esc(p.applicant)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Transfer', grid(F({ k: 'ref', label: 'Bank transfer reference', req: true, af: true, ph: 'e.g. IBG 20261003 4471' }), F({ k: 'date', label: 'Paid on', type: 'date', v: '2026-10-03', req: true }), F({ k: 'from', label: 'Paid from', type: 'select', noOpt: true, span: true, opts: REFUND_ACCOUNTS }), F({ k: 'to', label: 'Paid to', dis: true, v: p.bank, span: true, noOpt: true })), { sub: 'The applicant gets a receipt in the app.' })}</form>`,
    foot: footSave('Mark paid'), submit: d => { p.refund.paid = new Date(d.date); p.refund.ref = d.ref.trim(); p.status = 'Deposit Refunded'; p.depositState = 'Refunded'; trail(p).push({ at: clock(), text: `Refund of ${RM(p.refund.amount)} paid to ${p.bank} (${p.refund.ref})`, who: ME.name, ic: 'payments' }); log('Paid deposit refund', `${p.id} · ${RM(p.refund.amount)}`, p.taman); rerender(); toast(`${RM(p.refund.amount)} refund recorded for ${p.id}`); } }); };

function ownerRows() {
  const map = new Map(), invBy = new Map();
  for (const u of UNITS) { if (!inScope(u)) continue; if (!map.has(u.owner)) map.set(u.owner, []); map.get(u.owner).push(u); }
  for (const i of INVOICES) { if (!inScope(i)) continue; if (!invBy.has(i.owner)) invBy.set(i.owner, []); invBy.get(i.owner).push(i); }
  return [...map].map(([pid, units]) => { const inv = invBy.get(pid) || []; const open = inv.filter(i => ['Due', 'Overdue', 'Partially paid'].includes(i.status));
    return { id: pid, name: pn(pid), phone: PERSON.get(pid).phone, units, inv, taman: units[0].taman, tamans: [...new Set(units.map(u => u.taman))], billed: sum(inv.filter(i => i.period === 'Oct 2026'), i => i.amount), out: sum(open, i => i.amount - i.paid), overdue: inv.some(i => i.status === 'Overdue') }; });
}
ROUTES.portfolios = { title: 'Owner portfolios', render: () => head({ title: 'Owner portfolios', path: 'portfolios', sub: `Billing across every unit an owner holds in your tamans. Units they own in tamans other companies manage are not included.` })
  + ixHTML({ id: 'portfolios', noun: 'owners', ph: 'Search owner or phone', rows: ownerRows, scope: () => true, text: r => `${r.name} ${r.phone}`, f0: { multi: 'multi' },
    filters: [{ k: 'multi', label: 'Owners', all: 'All owners', opts: [['multi', 'Owners with 2+ units']], test: r => r.units.length > 1 }, { ...tamanF(), test: (r, v) => r.tamans.includes(v) }, { k: 'od', label: 'Payment', all: 'Any payment status', opts: [['yes', 'Has overdue invoices'], ['no', 'Up to date']], test: (r, v) => r.overdue === (v === 'yes') }],
    cols: [
      { h: 'Owner', v: r => t2(r.name, r.phone), s: r => r.name, t: r => r.name },
      { h: 'Units', num: true, v: r => r.units.length, s: r => r.units.length },
      { h: 'Tamans', v: r => `<div class="flex flex-wrap gap-1">${r.tamans.map(t => chip(T(t).short, 'mute', true)).join('')}</div>`, cv: r => esc(r.tamans.map(t => T(t).short).join(', ')), t: r => r.tamans.map(t => T(t).short).join('; ') },
      { h: 'October billed', num: true, v: r => RM(r.billed), s: r => r.billed, t: r => r.billed.toFixed(2) },
      { h: 'Outstanding', num: true, v: r => r.out ? `<b class="text-bad-ink">${RM(r.out)}</b>` : muted('—'), s: r => r.out, t: r => r.out.toFixed(2) },
      { h: 'Status', badge: true, v: r => r.overdue ? stc('Overdue', 'bad') : r.out ? stc('Due', 'sun') : stc('Paid up', 'ok'), t: r => r.overdue ? 'Overdue' : r.out ? 'Due' : 'Paid up' },
    ], sort: 1, dir: -1, open: ownerDrawer }) };
function ownerDrawer(r) {
  drawer({ wide: true, title: esc(r.name), sub: `${r.units.length} unit${r.units.length > 1 ? 's' : ''} in ${r.tamans.length} taman${r.tamans.length > 1 ? 's' : ''} · ${esc(r.phone)}`,
    body: `<div class="grid gap-5">${sect('Units', `<div class="overflow-x-auto -mx-5 sm:-mx-6"><table class="tbl"><thead><tr><th>Unit</th><th class="num">Monthly</th><th class="num">Outstanding</th><th>Status</th></tr></thead><tbody>${r.units.map(u => { const o = r.inv.filter(i => i.unit === u.id && ['Due', 'Overdue', 'Partially paid'].includes(i.status)), od = o.some(i => i.status === 'Overdue'); return `<tr><td>${t2(u.name, T(u.taman).name)}</td><td class="num">${RM(u.fee)}</td><td class="num">${RM(sum(o, i => i.amount - i.paid))}</td><td>${od ? stc('Overdue', 'bad') : o.length ? stc('Due', 'sun') : stc('Paid up', 'ok')}</td></tr>`; }).join('')}</tbody></table></div>`)}
      ${sect('Total', dl([['October billed', RM(r.billed)], ['Outstanding', `<b class="${r.out ? 'text-bad-ink' : ''}">${RM(r.out)}</b>`]]))}</div>`,
    foot: `<button type="button" class="btn btn-o" data-act="owner-csv" data-id="${r.id}">${icon('download')}Statement (CSV)</button><button type="button" class="btn btn-p" data-act="owner-mail" data-id="${r.id}">${icon('mail')}Send combined statement</button>` });
}
ACT['owner-csv'] = el => { const r = ownerRows().find(x => x.id === el.dataset.id); download(`statement-${r.name.toLowerCase().replace(/\W+/g, '-')}.csv`, toCSV([['Invoice', i => i.id], ['Unit', i => uname(i.unit)], ['Taman', i => T(i.taman).name], ['Description', i => i.desc], ['Due', i => dDate(i.due)], ['Amount', i => i.amount.toFixed(2)], ['Paid', i => i.paid.toFixed(2)], ['Status', i => i.status]], r.inv)); toast('Statement downloaded'); };
ACT['owner-mail'] = el => { const r = ownerRows().find(x => x.id === el.dataset.id); log('Sent combined statement', r.name); toast(`Combined statement for ${r.units.length} units sent to ${esc(r.name)} in the app`); };

ROUTES['late-fees'] = { title: 'Late fees & reminders', render() {
  const l = LATE_FEES, ch = ['Push', 'Email', 'SMS'];
  return head({ title: 'Late fees & reminders', path: 'late-fees', sub: 'When late charges start and how owners are reminded before and after the due date.' })
    + `<form data-form="late" novalidate class="grid gap-6 max-w-4xl">
      ${sect('Late charges', grid(
        F({ k: 'grace', label: 'Days of grace after the due date', type: 'number', noOpt: true, v: l.grace, min: 0, max: 60, req: true }),
        F({ k: 'kind', label: 'How it is charged', type: 'select', noOpt: true, v: l.kind, opts: [['percent', 'Interest, % a year on the overdue amount'], ['flat', 'Flat amount each month']] }),
        F({ k: 'rate', label: 'Interest (% a year)', type: 'number', noOpt: true, v: l.rate, min: 0, max: 24, step: 0.5, req: true, when: 'kind=percent', hint: 'Strata rules usually cap this at 10% a year.' }),
        F({ k: 'flat', label: 'Flat charge per month', type: 'money', noOpt: true, v: l.flat, req: true, when: 'kind=flat' }),
        F({ k: 'cap', label: 'Most it can add up to per invoice', type: 'money', noOpt: true, v: l.cap, req: true }),
        F({ k: 'types', label: 'Applies to', type: 'checks', noOpt: true, span: true, v: l.types, opts: ['Maintenance & sinking fund', 'Extra charge'] }))
        + `<output id="late-ex" class="mt-5 block rounded-2xl bg-paper p-4 text-[13.5px] leading-6"></output>`)}
      ${sect('Reminders', `<div class="overflow-x-auto"><table class="tbl min-w-[480px]"><thead><tr><th>When</th>${ch.map(c => `<th class="text-center">${c}</th>`).join('')}</tr></thead><tbody>${l.reminders.map((r, i) => `<tr><td class="font-medium">${r[0]}</td>${ch.map((c, j) => `<td class="text-center"><input type="checkbox" class="sw align-middle" role="switch" name="r${i}_${j}" ${r[j + 1] ? 'checked' : ''} aria-label="${r[0]} by ${c}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="mt-4 text-[13px] text-muted">SMS uses gateway credits (4,210 left). The reminder text comes from the “Maintenance fee reminder” and “Overdue notice” templates.</p>`, { sub: 'Owners and tenants with “Bills: pay” access get them.' })}
      <div class="flex flex-wrap gap-2"><button type="submit" class="btn btn-p">Save late fees and reminders</button><button type="button" class="btn btn-o" data-act="undo">Undo changes</button></div></form>`;
}, after: () => LIVE.late($('form[data-form="late"]')) };
LIVE.late = f => { const d = formData(f), days = 30, base = 185, over = Math.max(0, days - (+d.grace || 0)); let fee = d.kind === 'flat' ? (+d.flat || 0) : base * (+d.rate || 0) / 100 * over / 365; fee = Math.min(fee, +d.cap || Infinity);
  $('#late-ex').innerHTML = `<b>Example:</b> a ${RM(base)} invoice paid ${days} days late is charged <b class="num">${RM(fee)}</b>${d.kind === 'flat' ? ' (one month)' : ` (${over} days after the grace period at ${+d.rate || 0}% a year)`}.`; };
FORMS.late = (d, f) => { if (!d.types.length) return fieldErr(f, 'types', 'Choose at least one type of invoice.'); Object.assign(LATE_FEES, { grace: +d.grace, kind: d.kind, rate: +d.rate || LATE_FEES.rate, flat: +d.flat || LATE_FEES.flat, cap: +d.cap, types: d.types }); LATE_FEES.reminders.forEach((r, i) => [0, 1, 2].forEach(j => { r[j + 1] = d[`r${i}_${j}`]; })); log('Updated late fees and reminders', `${d.grace} days grace`, 'all'); toast('Saved. Changes apply to invoices that fall due from now on.'); };

const EXPORTS = [
  { id: 'EXP-118', name: 'Taman Desa Harmoni · Sep 2026', scope: 'taman', taman: 'dh', from: '2026-09', to: '2026-09', parts: ['Invoices', 'Payments'], format: 'CSV', at: at(-2, 9, 12), by: 'Ong Boon Hock' },
  { id: 'EXP-117', name: 'Nurul Aisyah Rahman · Sep–Oct 2026', scope: 'owner', owner: aisyah.id, taman: 'dh', from: '2026-09', to: '2026-10', parts: ['Invoices', 'Payments', 'Permit deposits'], format: 'PDF', at: at(-3, 15, 40), by: 'Priya Nair' },
  { id: 'EXP-116', name: 'Residensi Damai Jaya · Sep 2026', scope: 'taman', taman: 'dj', from: '2026-09', to: '2026-09', parts: ['Invoices', 'Payments'], format: 'CSV', at: at(-4, 11, 5), by: 'Ong Boon Hock' },
];
function statementRows(x) {
  const inP = d => ym(d) >= x.from && ym(d) <= x.to;
  const ids = new Set((x.scope === 'taman' ? UNITS.filter(u => u.taman === x.taman) : x.scope === 'owner' ? UNITS.filter(u => u.owner === x.owner && inScope(u)) : UNITS.filter(u => u.id === x.unit)).map(u => u.id));
  const out = [];
  if (x.parts.includes('Invoices')) INVOICES.filter(i => ids.has(i.unit) && inP(i.issued)).forEach(i => out.push({ d: i.issued, kind: 'Invoice', ref: i.id, unit: i.unit, desc: i.desc, amt: i.amount, st: i.status }));
  if (x.parts.includes('Payments')) PAYMENTS.filter(p => ids.has(p.unit) && inP(p.at) && p.status === 'Matched').forEach(p => out.push({ d: p.at, kind: 'Payment', ref: p.id, unit: p.unit, desc: `${p.channel} ${p.ref}`, amt: -p.amount, st: 'Received' }));
  if (x.parts.includes('Permit deposits')) PERMITS.filter(p => ids.has(p.unit) && p.depositState !== 'Not paid').forEach(p => out.push({ d: verifiedAt(p), kind: 'Permit deposit', ref: p.id, unit: p.unit, desc: p.category, amt: p.deposit, st: p.depositState }));
  return out.sort((a, b) => a.d - b.d);
}
const STMT_COLS = [['Date', r => dDate(r.d)], ['Type', r => r.kind], ['Reference', r => r.ref], ['Unit', r => uname(r.unit)], ['Description', r => r.desc], ['Amount (RM)', r => r.amt.toFixed(2)], ['Status', r => r.st]];
function exportFile(x) {
  const rows = statementRows(x);
  if (x.format === 'CSV') { download(`tamanly-${x.id.toLowerCase()}.csv`, toCSV(STMT_COLS, rows)); return; }
  const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to open the PDF view'); return; }
  w.document.write(`<!doctype html><title>${esc(x.name)}</title><style>body{font:13px Inter,system-ui,sans-serif;color:#1F1A2E;margin:40px}h1{font-size:20px;margin:0 0 4px}p{color:#6E6880;margin:0 0 20px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #ECE6DC}td:nth-child(6),th:nth-child(6){text-align:right;font-variant-numeric:tabular-nums}</style><h1>${esc(x.name)}</h1><p>${esc(ORG.name)} · ${esc(x.parts.join(', '))} · generated ${dDate(NOW)}</p><table><tr>${STMT_COLS.map(c => `<th>${c[0]}</th>`).join('')}</tr>${rows.map(r => `<tr>${STMT_COLS.map(c => `<td>${esc(c[1](r))}</td>`).join('')}</tr>`).join('')}</table><script>print()<\/script>`);
  w.document.close();
}
ROUTES.statements = { title: 'Statements', render: () => head({ title: 'Statements', path: 'statements', sub: 'Export invoices, payments and deposits for a taman, an owner or a unit, as CSV for accounting or PDF to send.' })
  + `<div class="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)] items-start">
    ${sect('New export', `<form data-form="statement" novalidate class="grid gap-5">
      ${F({ k: 'scope', label: 'Statement for', type: 'radio', cols: 3, noOpt: true, v: 'taman', opts: [['taman', 'A taman'], ['owner', 'An owner'], ['unit', 'A unit']] })}
      ${F({ k: 'taman', label: 'Taman', type: 'select', noOpt: true, opts: tamanOpts(), when: 'scope=taman' })}
      ${F({ k: 'owner', label: 'Owner', req: true, list: 'own-list', when: 'scope=owner', ph: 'Start typing a name' })}
      ${F({ k: 'unit', label: 'Unit', req: true, list: 'st-units', when: 'scope=unit', ph: 'e.g. No. 12, Jalan Harmoni 3' })}
      <datalist id="own-list">${ownerRows().filter(r => r.units.length > 1).map(r => `<option value="${esc(r.name)}">`).join('')}</datalist><datalist id="st-units">${UNITS.filter(inScope).slice(0, 2000).map(u => `<option value="${esc(u.name)}">`).join('')}</datalist>
      ${grid(F({ k: 'from', label: 'From', type: 'month', v: '2026-09', req: true, noOpt: true }), F({ k: 'to', label: 'To', type: 'month', v: '2026-10', req: true, noOpt: true }))}
      ${F({ k: 'parts', label: 'Include', type: 'checks', noOpt: true, v: ['Invoices', 'Payments'], opts: ['Invoices', 'Payments', 'Permit deposits'] })}
      ${F({ k: 'format', label: 'Format', type: 'radio', cols: 2, noOpt: true, v: 'CSV', opts: [['CSV', 'CSV', 'For accounting software'], ['PDF', 'PDF', 'To print or send']] })}
      <button type="submit" class="btn btn-p">${icon('download')}Export</button></form>`)}
    ${ixHTML({ id: 'exports', noun: 'exports', ph: 'Search exports', rows: () => EXPORTS, text: x => `${x.name} ${x.by}`, csv: false,
      filters: [{ k: 'format', label: 'Format', all: 'All formats', opts: ['CSV', 'PDF'] }],
      cols: [
        { h: 'Export', v: x => t2(x.name, `${x.parts.join(', ')} · ${x.from} to ${x.to}`) },
        { h: 'Format', hide: 'hidden 2xl:table-cell', v: x => chip(x.format, 'mute', true) },
        { h: 'Created', v: x => t2(ago(x.at), x.by), s: x => x.at },
        { h: '', act: true, v: x => `<button type="button" class="btn btn-o btn-sm" data-act="exp-dl" data-id="${x.id}">${icon(x.format === 'PDF' ? 'print' : 'download')}${x.format === 'PDF' ? 'Open' : 'Download'}</button>` },
      ], sort: 2, dir: -1 })}</div>` };
FORMS.statement = (d, f) => {
  if (d.to < d.from) return fieldErr(f, 'to', 'End on or after the start month.');
  if (!d.parts.length) return fieldErr(f, 'parts', 'Include at least one thing.');
  const x = { id: 'EXP-' + (119 + EXPORTS.length - 3), scope: d.scope, from: d.from, to: d.to, parts: d.parts, format: d.format, at: clock(), by: ME.name };
  if (d.scope === 'taman') Object.assign(x, { taman: d.taman, name: T(d.taman).name });
  if (d.scope === 'owner') { const o = PEOPLE.find(p => p.name.toLowerCase() === d.owner.trim().toLowerCase() && UNITS.some(u => u.owner === p.id && inScope(u))); if (!o) return fieldErr(f, 'owner', 'No owner by that name in your tamans.'); Object.assign(x, { owner: o.id, taman: UNITS.find(u => u.owner === o.id).taman, name: o.name }); }
  if (d.scope === 'unit') { const u = UNITS.find(v => inScope(v) && v.name.toLowerCase() === d.unit.trim().toLowerCase()); if (!u) return fieldErr(f, 'unit', 'No unit with that number in your tamans.'); Object.assign(x, { unit: u.id, taman: u.taman, name: u.name }); }
  x.name += ` · ${d.from === d.to ? d.from : `${d.from} to ${d.to}`}`;
  EXPORTS.unshift(x); log(`Exported statement (${d.format})`, x.name, x.taman); exportFile(x); rerender(); toast(`${esc(x.name)} exported, ${statementRows(x).length} lines`);
};
ACT['exp-dl'] = el => exportFile(EXPORTS.find(x => x.id === el.dataset.id));

// ================= Facilities =================
const rate = f => f.rate ? `${RM0(f.rate)} ${f.kind === 'Court' ? 'per hour' : 'per booking'}` : 'Free';
ROUTES.facilities = { title: 'Facilities', render(id) {
  const list = FACILITIES.filter(inScope);
  let fid = id && FAC(id) && inScope(FAC(id)) ? id : S.tab.fac; if (!list.some(f => f.id === fid)) fid = list[0]?.id; S.tab.fac = fid;
  return head({ title: 'Facility catalog & calendar', path: 'facilities', sub: 'Bookable spaces in your tamans. Choose one to see its week.', actions: `<button type="button" class="btn btn-p" data-act="fac-new">${icon('add')}Add facility</button>` })
    + `<div class="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">`
    + ixHTML({ id: 'facilities', noun: 'facilities', one: 'facility', ph: 'Search facility', rows: () => FACILITIES, text: x => `${x.name} ${x.kind}`, per: 8, csv: false,
      filters: [tamanF(), { k: 'kind', label: 'Type', all: 'All types', opts: ['Hall', 'Court', 'BBQ', 'Pool', 'Gym'] }],
      cols: [
        { h: 'Facility', v: x => `<div class="flex items-center gap-2.5">${icon(x.id === fid ? 'radio_button_checked' : 'radio_button_unchecked', x.id === fid ? 'text-indigo' : 'text-muted')}${t2(x.name, `${T(x.taman).short} · ${rate(x)}${x.approval ? ' · approval' : ''}`)}${x.status === 'Open' ? '' : stc('Repair', 'sun')}</div>`, s: x => x.name },
        { h: '', act: true, v: x => `<button type="button" class="btn btn-g btn-sm btn-icon" data-act="fac-edit" data-id="${x.id}" aria-label="Edit ${esc(x.name)}" title="Edit">${icon('edit')}</button>` },
      ], open: x => { S.tab.fac = x.id; if (location.hash !== '#/facilities') history.replaceState(null, '', '#/facilities'); S.path = 'facilities/'; rerender(); if (innerWidth < 1280) $('#cal')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } })
    + (fid ? calendar(FAC(fid)) : '') + `</div>`;
} };
function calendar(f) {
  const wk = S.tab.calwk || 0, days = Array.from({ length: 7 }, (_, i) => at(-5 + i + wk * 7)), H0 = 7, H1 = 23, PX = 30;
  const bk = BOOKINGS.filter(b => b.facility === f.id && b.status !== 'Cancelled' && b.status !== 'Declined' && b.start >= days[0] && b.start < new Date(+days[6] + DAY));
  const black = d => f.rules.blackout.find(x => x.d === `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  const block = b => `<button type="button" data-act="bk-open" data-id="${b.id}" class="absolute inset-x-1 rounded-lg px-1.5 py-1 text-left text-[11.5px] leading-4 overflow-hidden ${b.status === 'Pending approval' ? 'bg-sun-tint text-sun-ink shadow-[inset_0_0_0_1.5px_#E8B84A]' : b.start < NOW ? 'bg-indigo-tint text-indigo' : 'bg-indigo text-white'}" style="top:${(b.start.getHours() - H0) * PX + 1}px;height:${b.hours * PX - 2}px"><b class="block truncate">${dTime(b.start)}</b><span class="block truncate">${esc(b.purpose)}</span></button>`;
  return `<section id="cal" class="panel p-4 sm:p-5 min-w-0 scroll-mt-4" aria-label="${esc(f.name)} calendar">
    <div class="flex flex-wrap items-center gap-3 mb-4"><div class="min-w-0"><h2 class="text-[16px] font-semibold">${esc(f.name)}</h2><p class="text-[13px] text-muted">${esc(T(f.taman).name)} · open ${f.open} · ${esc(rate(f))}</p></div>
      <div class="ml-auto flex items-center gap-1"><button type="button" class="btn btn-o btn-sm btn-icon" data-act="calwk" data-d="-1" aria-label="Previous week">${icon('chevron_left')}</button><span class="px-2 text-[13px] font-medium num">${dShort(days[0])} – ${dShort(days[6])}</span><button type="button" class="btn btn-o btn-sm btn-icon" data-act="calwk" data-d="1" aria-label="Next week">${icon('chevron_right')}</button></div></div>
    <div class="hidden md:grid grid-cols-[44px_repeat(7,minmax(0,1fr))] text-[12px]">
      <div></div>${days.map(d => `<div class="pb-2 text-center ${sameDay(d, NOW) ? 'text-indigo font-semibold' : 'text-muted'}">${d.toLocaleDateString('en-GB', { weekday: 'short' })} <span class="num">${d.getDate()}</span></div>`).join('')}
      <div class="relative" style="height:${(H1 - H0) * PX}px">${Array.from({ length: H1 - H0 }, (_, i) => `<span class="absolute right-2 -translate-y-1/2 text-[11px] text-muted num" style="top:${i * PX}px">${i ? dTime(new Date(2026, 0, 1, H0 + i)).replace(':00', '') : ''}</span>`).join('')}</div>
      ${days.map(d => { const bo = black(d); return `<div class="relative border-l border-line ${sameDay(d, NOW) ? 'bg-indigo-tint/40' : ''}" style="height:${(H1 - H0) * PX}px;background-image:repeating-linear-gradient(to bottom,transparent 0 ${PX - 1}px,#F1ECE3 ${PX - 1}px ${PX}px)">${bo ? `<div class="absolute inset-1 rounded-lg grid place-items-center text-center text-[11.5px] font-semibold text-coral-ink bg-[repeating-linear-gradient(135deg,#FBE6E2_0_8px,#FFF_8px_16px)] p-1">Closed: ${esc(bo.why)}</div>` : ''}${bk.filter(b => sameDay(b.start, d)).map(block).join('')}</div>`; }).join('')}
    </div>
    <ol class="md:hidden grid gap-4">${days.map(d => { const l = bk.filter(b => sameDay(b.start, d)), bo = black(d); return `<li><p class="text-[13px] font-semibold ${sameDay(d, NOW) ? 'text-indigo' : ''}">${dDay(d)}${sameDay(d, NOW) ? ' · today' : ''}</p>${bo ? `<p class="mt-1 text-[13px] text-coral-ink">Closed: ${esc(bo.why)}</p>` : l.length ? `<ul class="mt-1.5 grid gap-1.5">${l.map(b => `<li><button type="button" data-act="bk-open" data-id="${b.id}" class="w-full flex items-center gap-3 rounded-xl bg-paper px-3 py-2 text-left"><span class="text-[13px] font-semibold num w-[72px] shrink-0">${dTime(b.start)}</span><span class="min-w-0 flex-1 text-[13px] truncate">${esc(b.purpose)} · ${esc(uname(b.unit))}</span>${b.status === 'Pending approval' ? stc('Pending', 'sun') : ''}</button></li>`).join('')}</ul>` : `<p class="mt-1 text-[13px] text-muted">No bookings</p>`}</li>`; }).join('')}</ol>
    <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-muted"><span class="inline-flex items-center gap-2"><span class="w-3 h-3 rounded bg-indigo"></span>Confirmed</span><span class="inline-flex items-center gap-2"><span class="w-3 h-3 rounded bg-sun-tint shadow-[inset_0_0_0_1.5px_#E8B84A]"></span>Needs approval</span><span class="inline-flex items-center gap-2"><span class="w-3 h-3 rounded bg-indigo-tint"></span>Past</span><a href="#/booking-rules" class="ml-auto font-semibold text-indigo hover:underline">Booking rules</a></div>
  </section>`;
}
ACT.calwk = el => { S.tab.calwk = (S.tab.calwk || 0) + +el.dataset.d; rerender(); };
ACT['fac-new'] = () => facDrawer();
ACT['fac-edit'] = el => facDrawer(FAC(el.dataset.id));
function facDrawer(f) {
  const isNew = !f;
  drawer({ title: isNew ? 'Add facility' : esc(f.name), sub: isNew ? esc(scopeName()) : esc(T(f.taman).name),
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Facility', grid(
      F({ k: 'name', label: 'Name', v: f?.name, req: true, af: true, span: true, ph: 'e.g. Pickleball court' }),
      isNew ? F({ k: 'taman', label: 'Taman', type: 'select', opts: tamanOpts(), v: myTamans()[0].id, req: true }) : '',
      F({ k: 'kind', label: 'Type', type: 'select', noOpt: true, v: f?.kind || 'Court', opts: ['Hall', 'Court', 'BBQ', 'Pool', 'Gym'] }),
      F({ k: 'cap', label: 'Capacity (people)', type: 'number', v: f?.cap, min: 1, req: true }),
      F({ k: 'open', label: 'Opening hours', v: f?.open || '08:00–23:00', req: true }),
      F({ k: 'rate', label: 'Fee', type: 'money', v: f?.rate ?? 0, noOpt: true, hint: 'Per hour for courts, per booking otherwise. 0 for free.' }),
      F({ k: 'deposit', label: 'Refundable deposit', type: 'money', v: f?.deposit ?? 0, noOpt: true }),
      F({ k: 'status', label: 'Status', type: 'select', noOpt: true, v: f?.status || 'Open', opts: ['Open', 'Closed for repair'] }),
      F({ k: 'approval', label: 'Bookings need management approval', type: 'switch', v: f?.approval, span: true })))}</form>`,
    foot: footSave(isNew ? 'Add facility' : 'Save'),
    submit: d => { const rec = { name: d.name.trim(), kind: d.kind, cap: +d.cap, open: d.open, rate: +d.rate || 0, deposit: +d.deposit || 0, status: d.status, approval: d.approval };
      if (isNew) { const nf = { id: 'F' + (FACILITIES.length + 1), taman: d.taman, rules: { maxHours: 2, perMonth: 8, advance: 14, cutoff: 6, blackout: [] }, ...rec }; FACILITIES.push(nf); S.tab.fac = nf.id; log('Added facility', nf.name, nf.taman); toast(`${esc(nf.name)} added. Residents can book it in the app now.`); }
      else { Object.assign(f, rec); log('Updated facility', f.name, f.taman); toast(`${esc(f.name)} saved`); }
      rerender(); } });
}

ROUTES.bookings = { title: 'Bookings', render: () => head({ title: 'Bookings', path: 'bookings', sub: 'Every facility booking. Approve the ones that need it, or override a booking when something comes up.' })
  + ixHTML({ id: 'bookings', noun: 'bookings', ph: 'Search booking, unit or purpose', rows: () => BOOKINGS, text: b => `${b.id} ${FAC(b.facility).name} ${uname(b.unit)} ${b.by} ${b.purpose}`, f0: { _date: 'n7' },
    filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Pending approval', 'Confirmed', 'Completed', 'Overridden', 'Cancelled', 'Declined'] }, { k: 'facility', label: 'Facility', all: 'All facilities', opts: FACILITIES.filter(inScope).map(f => [f.id, `${f.name} · ${T(f.taman).short}`]) }, dateF(b => b.start, 'Date', true)],
    cols: [
      { h: 'Booking', v: b => t2(FAC(b.facility).name, `${b.purpose} · ${b.id}`), s: b => FAC(b.facility).name, t: b => `${FAC(b.facility).name} (${b.id})` },
      { h: 'When', v: b => t2(dDay(b.start), `${dTime(b.start)} – ${dTime(new Date(+b.start + b.hours * 36e5))}`), s: b => b.start, t: b => `${dDate(b.start)} ${dTime(b.start)}` },
      { h: 'Booked by', v: b => t2(uname(b.unit), b.by), t: b => `${uname(b.unit)} (${b.by})` },
      { h: 'Fee', num: true, hide: 'hidden 2xl:table-cell', v: b => b.fee ? RM(b.fee) + (b.deposit ? muted(` + ${RM0(b.deposit)} dep.`) : '') : muted('Free'), s: b => b.fee, t: b => b.fee.toFixed(2) },
      { h: 'Status', badge: true, v: b => stc(b.status), s: b => b.status, t: b => b.status },
      { h: '', act: true, v: b => b.status === 'Pending approval' ? `<div class="flex gap-2"><button type="button" class="btn btn-t btn-sm" data-act="bk-approve" data-id="${b.id}">Approve</button><button type="button" class="btn btn-o btn-sm" data-act="bk-open" data-id="${b.id}">Decline…</button></div>` : '' },
    ], sort: 1, dir: 1, open: bookingDrawer }) };
ACT['bk-approve'] = el => { const b = BOOKINGS.find(x => x.id === el.dataset.id); b.status = 'Confirmed'; log('Approved booking', `${b.id} · ${FAC(b.facility).name}`, b.taman); buildNotifs(); rerender(); toast(`${esc(FAC(b.facility).name)} on ${dDay(b.start)} approved. ${esc(b.by)} has been told.`); };
ACT['bk-open'] = el => bookingDrawer(BOOKINGS.find(x => x.id === el.dataset.id));
function bookingDrawer(b) {
  const f = FAC(b.facility), future = b.start > NOW && !['Cancelled', 'Declined'].includes(b.status);
  drawer({ title: esc(f.name), sub: `${b.id} · ${dDay(b.start)}, ${dTime(b.start)} for ${b.hours} h`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Booking', dl([['Booked by', `${esc(b.by)} · ${esc(uname(b.unit))}`, true], ['Purpose', esc(b.purpose)], ['Status', stc(b.status)], ['Fee', b.fee ? RM(b.fee) : 'Free'], ['Deposit', b.deposit ? RM(b.deposit) : 'None']]))}
      ${future ? sect('Action', F({ k: 'act', label: 'What to do', type: 'radio', noOpt: true, req: true, v: b.status === 'Pending approval' ? 'approve' : 'override', opts: [...(b.status === 'Pending approval' ? [['approve', 'Approve'], ['decline', 'Decline', 'The resident is told why. Nothing is charged.']] : []), ['override', 'Move it', 'Change the date or time, for example for a taman event.'], ['cancel', 'Cancel and refund', 'Fee and deposit go back to the resident.']] })
        + `<div class="mt-4 grid gap-4">${grid(F({ k: 'date', label: 'New date', type: 'date', v: `${b.start.getFullYear()}-${pad(b.start.getMonth() + 1)}-${pad(b.start.getDate())}`, req: true, when: 'act=override' }), F({ k: 'time', label: 'New start time', type: 'time', v: `${pad(b.start.getHours())}:00`, req: true, when: 'act=override' }))}${F({ k: 'reason', label: 'Reason, shown to the resident', type: 'textarea', rows: 2, req: true, when: 'act=decline|override|cancel', msg: 'Tell the resident why.' })}</div>`) : ''}
    </form>`,
    foot: future ? footSave('Apply') : `<button type="button" class="btn btn-o" data-act="drawer-close">Close</button>`,
    submit: (d, form) => {
      if (d.act === 'approve') b.status = 'Confirmed';
      if (d.act === 'decline') b.status = 'Declined';
      if (d.act === 'cancel') b.status = 'Cancelled';
      if (d.act === 'override') { const s = new Date(`${d.date}T${d.time}`); if (BOOKINGS.some(x => x !== b && x.facility === b.facility && !['Cancelled', 'Declined'].includes(x.status) && Math.abs(x.start - s) < Math.max(x.hours, b.hours) * 36e5)) return fieldErr(form, 'time', 'Another booking already holds that slot.'); b.start = s; b.status = 'Overridden'; }
      log(`Booking ${d.act}`, `${b.id} · ${f.name}`, b.taman); buildNotifs(); rerender(); toast(`Booking ${b.status.toLowerCase()}. ${esc(b.by)} has been notified.`);
    } });
}

ROUTES['booking-rules'] = { title: 'Booking rules', render() {
  const list = FACILITIES.filter(inScope); let fid = S.tab.rfac; if (!list.some(f => f.id === fid)) fid = list[0]?.id; S.tab.rfac = fid; const f = FAC(fid), r = f.rules;
  return head({ title: 'Booking rules', path: 'booking-rules', sub: 'Limits, deposits and closed dates for each facility. Residents see these when they book.' })
    + `<div class="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
      <nav class="panel p-2 grid gap-1 max-h-[70vh] overflow-y-auto" aria-label="Facilities">${list.map(x => `<button type="button" class="pop-item" aria-current="${x.id === fid}" data-act="tab" data-k="rfac" data-v="${x.id}"><span class="min-w-0"><span class="block text-[14px] font-semibold truncate">${esc(x.name)}</span><span class="block text-[12.5px] text-muted">${esc(T(x.taman).short)} · ${x.approval ? 'needs approval' : 'instant'}</span></span></button>`).join('')}</nav>
      <div class="grid gap-6 min-w-0"><form data-form="rules" data-id="${f.id}" novalidate class="grid gap-6">
        ${sect(`${esc(f.name)}, ${esc(T(f.taman).short)}`, grid(
          F({ k: 'maxHours', label: 'Longest booking (hours)', type: 'number', noOpt: true, v: r.maxHours, min: 1, max: 12, req: true }),
          F({ k: 'perMonth', label: 'Bookings per unit per month', type: 'number', noOpt: true, v: r.perMonth, min: 1, max: 60, req: true }),
          F({ k: 'advance', label: 'Book up to (days ahead)', type: 'number', noOpt: true, v: r.advance, min: 1, max: 365, req: true }),
          F({ k: 'cutoff', label: 'Free cancellation until (hours before)', type: 'number', noOpt: true, v: r.cutoff, min: 0, max: 168, req: true }),
          F({ k: 'deposit', label: 'Refundable deposit', type: 'money', noOpt: true, v: f.deposit }),
          F({ k: 'rate', label: f.kind === 'Court' ? 'Fee per hour' : 'Fee per booking', type: 'money', noOpt: true, v: f.rate }),
          F({ k: 'approval', label: 'Management approves each booking', type: 'switch', v: f.approval, span: true, hint: 'Good for halls and function rooms. Courts usually book instantly.' })))}
        <div><button type="submit" class="btn btn-p">Save rules</button></div></form>
        ${sect('Closed dates', `<ul class="divide-y divide-line -my-2">${r.blackout.map((b, i) => `<li class="py-3 flex items-center gap-3"><span class="tile tile-coral w-9 h-9">${icon('event_busy')}</span><div class="min-w-0 flex-1"><p class="text-[14px] font-medium">${dDay(new Date(b.d + 'T00:00'))}</p><p class="text-[12.5px] text-muted">${esc(b.why)}</p></div><button type="button" class="btn btn-g btn-sm" data-act="bo-del" data-i="${i}">Remove</button></li>`).join('') || `<li class="py-4 text-[13.5px] text-muted">No closed dates. Add one for AGMs, repairs or festive events.</li>`}</ul>
          <form data-form="bo" novalidate class="mt-5 grid gap-3 sm:grid-cols-[180px_1fr_auto] items-end">${F({ k: 'd', label: 'Date', type: 'date', req: true, noOpt: true, min: '2026-10-03' })}${F({ k: 'why', label: 'Reason', req: true, noOpt: true, ph: 'e.g. Taman AGM' })}<button type="submit" class="btn btn-t">${icon('add')}Add</button></form>`, { sub: 'Bookings are blocked on these dates. Existing bookings are not cancelled automatically.' })}
      </div></div>`;
} };
FORMS.rules = (d, f) => { const x = FAC(f.dataset.id); Object.assign(x.rules, { maxHours: +d.maxHours, perMonth: +d.perMonth, advance: +d.advance, cutoff: +d.cutoff }); Object.assign(x, { deposit: +d.deposit || 0, rate: +d.rate || 0, approval: d.approval }); log('Updated booking rules', x.name, x.taman); rerender(); toast(`Rules saved for ${esc(x.name)}`); };
FORMS.bo = d => { const x = FAC(S.tab.rfac); x.rules.blackout.push({ d: d.d, why: d.why.trim() }); x.rules.blackout.sort((a, b) => a.d.localeCompare(b.d)); log('Added closed date', `${x.name} · ${d.d}`, x.taman); rerender(); toast(`${esc(x.name)} closed on ${dDay(new Date(d.d + 'T00:00'))}`); };
ACT['bo-del'] = el => { const x = FAC(S.tab.rfac); x.rules.blackout.splice(+el.dataset.i, 1); rerender(); toast('Closed date removed'); };

ROUTES.utilization = { title: 'Utilization', render() {
  const fs = FACILITIES.filter(inScope), bk = BOOKINGS.filter(b => inScope(b) && ['Completed', 'Confirmed', 'Overridden'].includes(b.status));
  const first = new Date(Math.min(...BOOKINGS.map(b => +b.start))), last = new Date(Math.max(...BOOKINGS.map(b => +b.start))), days = Math.max(1, Math.round((last - first) / DAY) + 1);
  const use = f => { const h = sum(bk.filter(b => b.facility === f.id), b => b.hours); return { h, p: Math.round(h / (15 * days) * 1000) / 10 }; };
  const heat = Array.from({ length: 7 }, (_, d) => Array.from({ length: 16 }, (_, h) => bk.filter(b => (b.start.getDay() + 6) % 7 === d && b.start.getHours() <= h + 7 && b.start.getHours() + b.hours > h + 7).length));
  const max = Math.max(1, ...heat.flat()), DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bookable = fs.filter(f => f.kind !== 'Pool' && f.kind !== 'Gym');
  return head({ title: 'Facility utilization', path: 'utilization', sub: `Booked hours against opening hours, ${dDate(first)} – ${dDate(last)}. Pool and gym are walk-in and not booked.` })
    + `<div class="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">${metric('Booked hours', N(sum(bk, b => b.hours)), `${bk.length} bookings`)}${metric('Busiest facility', esc(bookable.slice().sort((a, b) => use(b).h - use(a).h)[0]?.name || '—'), `${use(bookable.slice().sort((a, b) => use(b).h - use(a).h)[0] || { id: '' }).h} hours`)}${metric('Cancelled', BOOKINGS.filter(b => inScope(b) && b.status === 'Cancelled').length, 'bookings in the period')}${metric('Waiting approval', BOOKINGS.filter(b => inScope(b) && b.status === 'Pending approval').length, 'see Bookings')}</div>
    <div class="grid gap-6 xl:grid-cols-2 mb-6">
      ${sect('Share of opening hours booked', hbars(bookable.map(f => ({ l: `${f.name} · ${T(f.taman).short}`, v: use(f).p })).sort((a, b) => b.v - a.v), { fmt: v => v + '%', max: Math.max(10, ...bookable.map(f => use(f).p)), label: 'Utilization by facility' }))}
      ${sect('When people book', `<div class="overflow-x-auto"><table class="w-full min-w-[520px] border-separate border-spacing-[3px] text-[11px]" aria-label="Bookings by weekday and hour"><thead><tr><th></th>${Array.from({ length: 16 }, (_, h) => `<th class="font-normal text-muted">${h % 3 === 0 ? dTime(new Date(2026, 0, 1, h + 7)).replace(':00', '') : ''}</th>`).join('')}</tr></thead><tbody>${heat.map((row, d) => `<tr><th class="pr-2 text-left font-medium text-muted">${DOW[d]}</th>${row.map((v, h) => `<td class="h-6 rounded-[5px]" style="background:${v ? `rgba(61,43,107,${0.12 + 0.88 * v / max})` : '#F4EFE7'}" title="${DOW[d]} ${h + 7}:00, ${v} booking${v === 1 ? '' : 's'}"></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="mt-3 text-[12.5px] text-muted">Darker means more bookings running at that hour.</p>`)}
    </div>`
    + ixHTML({ id: 'util', noun: 'facilities', one: 'facility', ph: 'Search facility', rows: () => bookable, text: f => f.name,
      filters: [tamanF(), { k: 'kind', label: 'Type', all: 'All types', opts: ['Hall', 'Court', 'BBQ'] }],
      cols: [
        { h: 'Facility', v: f => t2(f.name, T(f.taman).short), s: f => f.name, t: f => f.name },
        { h: 'Bookings', num: true, v: f => bk.filter(b => b.facility === f.id).length, s: f => bk.filter(b => b.facility === f.id).length },
        { h: 'Hours', num: true, v: f => use(f).h, s: f => use(f).h },
        { h: 'Utilization', num: true, v: f => use(f).p + '%', s: f => use(f).p },
        { h: 'Fees earned', num: true, v: f => RM(sum(bk.filter(b => b.facility === f.id), b => b.fee)), s: f => sum(bk.filter(b => b.facility === f.id), b => b.fee), t: f => sum(bk.filter(b => b.facility === f.id), b => b.fee).toFixed(2) },
      ], sort: 3, dir: -1 });
} };

// ================= Marketplace =================
const LST = id => LISTINGS.find(l => l.id === id);
ROUTES.listings = { title: 'Listings', render: () => head({ title: 'Marketplace listings', path: 'listings', sub: 'What residents are selling and offering. Approve new listings in categories that need it; take down anything against the rules.' })
  + ixHTML({ id: 'listings', noun: 'listings', ph: 'Search title, seller or unit', rows: () => LISTINGS, text: l => `${l.id} ${l.title} ${l.seller} ${uname(l.unit)}`,
    filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Pending approval', 'Live', 'Sold', 'Expired', 'Taken down'] }, { k: 'cat', label: 'Category', all: 'All categories', opts: MARKET_CATS.map(c => c.name) }, { k: 'rep', label: 'Reports', all: 'Any', opts: [['yes', 'Has reports']], test: l => l.reports > 0 }],
    cols: [
      { h: 'Listing', v: l => t2(l.title, `${l.cat} · ${l.id}`), s: l => l.title, t: l => l.title },
      { h: 'Seller', v: l => t2(l.seller, `${uname(l.unit)} · ${T(l.taman).short}`), t: l => `${l.seller} (${uname(l.unit)})` },
      { h: 'Price', num: true, v: l => RM0(l.price), s: l => l.price, t: l => l.price },
      { h: 'Posted', hide: 'hidden 2xl:table-cell', v: l => ago(l.posted), s: l => l.posted, t: l => dDate(l.posted) },
      { h: 'Reports', num: true, v: l => l.reports ? `<span class="inline-flex items-center gap-1 font-semibold text-bad-ink">${icon('flag', 'text-[16px]')}${l.reports}</span>` : muted('0'), s: l => l.reports, t: l => l.reports },
      { h: 'Status', badge: true, v: l => stc(l.status), s: l => l.status, t: l => l.status },
      { h: '', act: true, v: l => l.status === 'Pending approval' ? `<button type="button" class="btn btn-t btn-sm" data-act="lst-approve" data-id="${l.id}">Approve</button>` : '' },
    ], sort: 3, dir: -1, open: listingDrawer }) };
ACT['lst-approve'] = el => { const l = LST(el.dataset.id); l.status = 'Live'; log('Approved listing', l.title, l.taman); rerender(); toast(`“${esc(l.title)}” is live`); };
function listingDrawer(l, report) {
  const reps = REPORTS.filter(r => r.listing === l.id);
  drawer({ title: esc(l.title), sub: `${l.id} · ${esc(l.cat)} · ${esc(T(l.taman).short)}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Listing', `<div class="rounded-2xl bg-paper p-4"><p class="text-[20px] font-semibold num">${RM0(l.price)}</p><p class="mt-2 text-[14px] leading-6">${esc(l.desc)}</p><p class="mt-3 text-[12.5px] text-muted">${esc(l.seller)} · ${esc(uname(l.unit))} · posted ${ago(l.posted)}</p></div>`)}
      ${reps.length ? sect(`Reports (${reps.length})`, `<ul class="divide-y divide-line -my-2">${reps.map(r => `<li class="py-2.5 flex items-center gap-3"><div class="min-w-0 flex-1"><p class="text-[14px] font-medium">${esc(r.reason)}</p><p class="text-[12.5px] text-muted">${esc(r.by)} · ${ago(r.at)}</p></div>${stc(r.status)}</li>`).join('')}</ul>`) : ''}
      ${sect('Decision', F({ k: 'act', label: 'Action', type: 'radio', noOpt: true, req: true, v: l.status === 'Pending approval' ? 'approve' : report ? 'down' : 'keep', opts: [
        ...(l.status === 'Pending approval' ? [['approve', 'Approve', 'Goes live for everyone in the taman.']] : [['keep', l.status === 'Taken down' ? 'Restore it' : 'Keep it live', reps.length ? 'Open reports are dismissed.' : '']]),
        ['down', 'Take down', 'The seller sees your reason and can appeal.'], ['warn', 'Warn the seller', 'Stays live; the warning is kept on their account.']] })
        + `<div class="mt-4">${F({ k: 'reason', label: 'Message to the seller', type: 'textarea', rows: 3, req: true, when: 'act=down|warn', msg: 'Tell the seller which rule applies.', v: /forex|guaranteed/i.test(l.title) ? 'Investment schemes and trading signals are not allowed on the Tamanly marketplace.' : '' })}</div>`)}
    </form>`,
    foot: footSave('Apply'),
    submit: d => {
      if (d.act === 'approve' || d.act === 'keep') { l.status = 'Live'; reps.forEach(r => { if (r.status === 'Open') r.status = 'Dismissed'; }); }
      if (d.act === 'down') { l.status = 'Taken down'; reps.forEach(r => { if (r.status === 'Open') r.status = 'Resolved'; }); }
      if (d.act === 'warn') reps.forEach(r => { if (r.status === 'Open') r.status = 'Resolved'; });
      log({ approve: 'Approved listing', keep: 'Kept listing live', down: 'Took down listing', warn: 'Warned seller' }[d.act], l.title, l.taman); buildNotifs(); rerender();
      toast({ approve: 'Listing approved', keep: 'Listing kept live', down: 'Listing taken down. The seller has been told why.', warn: 'Warning sent to the seller' }[d.act]);
    } });
}
ROUTES.reports = { title: 'Reported listings', render: () => head({ title: 'Reported listings', path: 'reports', sub: `Listings residents flagged. After ${MARKET_POLICY.autoHide} reports a listing hides itself until you decide.` })
  + ixHTML({ id: 'reports', noun: 'reports', ph: 'Search listing, reason or reporter', rows: () => REPORTS, text: r => `${r.id} ${LST(r.listing).title} ${r.reason} ${r.by}`,
    filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Open', 'Resolved', 'Dismissed'] }, { k: 'reason', label: 'Reason', all: 'All reasons', opts: [...new Set(REPORTS.map(r => r.reason))] }],
    f0: { status: 'Open' },
    cols: [
      { h: 'Listing', v: r => t2(LST(r.listing).title, `${LST(r.listing).seller} · ${r.listing}`), t: r => LST(r.listing).title },
      { h: 'Reason', v: r => stc(r.reason, 'coral', true), s: r => r.reason, t: r => r.reason },
      { h: 'Reported by', v: r => t2(r.by, ago(r.at)), s: r => r.at, t: r => r.by },
      { h: 'Listing status', hide: 'hidden lg:table-cell', v: r => stc(LST(r.listing).status), t: r => LST(r.listing).status },
      { h: 'Status', badge: true, v: r => stc(r.status), s: r => r.status, t: r => r.status },
      { h: '', act: true, v: r => r.status === 'Open' ? `<button type="button" class="btn btn-t btn-sm" data-act="report-open" data-id="${r.id}">Review</button>` : '' },
    ], sort: 2, dir: -1, open: r => listingDrawer(LST(r.listing), true), emptyTitle: 'No open reports', emptyText: 'When residents flag a listing it appears here.' }) };
ACT['report-open'] = el => { const r = REPORTS.find(x => x.id === el.dataset.id); listingDrawer(LST(r.listing), true); };
ROUTES['market-policy'] = { title: 'Categories & policy', render: () => head({ title: 'Marketplace categories & policy', path: 'market-policy', sub: 'What residents can list, which categories need approval first, and the rules every listing follows. Applies to all your tamans.' })
  + `<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] items-start">`
  + ixHTML({ id: 'mcats', noun: 'categories', one: 'category', ph: 'Search category', rows: () => MARKET_CATS, scope: () => true, text: c => c.name, csv: false,
    cols: [
      { h: 'Category', v: c => `<b class="font-semibold">${esc(c.name)}</b>`, s: c => c.name },
      { h: 'Live listings', num: true, v: c => LISTINGS.filter(l => inScope(l) && l.cat === c.name && l.status === 'Live').length },
      { h: 'Open to residents', v: c => `<input type="checkbox" role="switch" class="sw" data-act="cat-toggle" data-k="on" data-id="${esc(c.name)}" ${c.on ? 'checked' : ''} aria-label="${esc(c.name)} open to residents">` },
      { h: 'Needs approval', v: c => `<input type="checkbox" role="switch" class="sw" data-act="cat-toggle" data-k="approval" data-id="${esc(c.name)}" ${c.approval ? 'checked' : ''} aria-label="${esc(c.name)} needs approval">` },
    ] })
  + `<form data-form="mpolicy" novalidate class="grid gap-6">${sect('Listing rules', `<div class="grid gap-5">${grid(
      F({ k: 'expiry', label: 'Listings expire after (days)', type: 'number', noOpt: true, v: MARKET_POLICY.expiry, min: 1, max: 365, req: true }),
      F({ k: 'perUnit', label: 'Live listings per unit', type: 'number', noOpt: true, v: MARKET_POLICY.perUnit, min: 1, max: 50, req: true }),
      F({ k: 'autoHide', label: 'Hide a listing after this many reports', type: 'number', noOpt: true, v: MARKET_POLICY.autoHide, min: 1, max: 20, req: true, span: true }))}
      ${F({ k: 'subtenants', label: 'Sub-tenants can post listings', type: 'switch', v: MARKET_POLICY.subtenants })}
      ${F({ k: 'prohibited', label: 'Not allowed (one per line)', type: 'textarea', rows: 6, noOpt: true, v: MARKET_POLICY.prohibited, hint: 'Residents see this list before they post.' })}</div>`)}
      <div><button type="submit" class="btn btn-p">Save policy</button></div></form></div>` };
ACT['cat-toggle'] = el => { const c = MARKET_CATS.find(x => x.name === el.dataset.id); c[el.dataset.k] = el.checked; log('Changed marketplace category', `${c.name}: ${el.dataset.k} ${el.checked ? 'on' : 'off'}`, 'all'); toast(`${esc(c.name)}: ${el.dataset.k === 'on' ? (el.checked ? 'open to residents' : 'closed to new listings') : (el.checked ? 'new listings need approval' : 'listings go live instantly')}`); };
FORMS.mpolicy = d => { Object.assign(MARKET_POLICY, { expiry: +d.expiry, perUnit: +d.perUnit, autoHide: +d.autoHide, subtenants: d.subtenants, prohibited: d.prohibited }); log('Updated marketplace policy', `${d.expiry}-day expiry`, 'all'); toast('Marketplace policy saved'); };

// ================= Communications =================
ROUTES.announcements = { title: 'Announcements', render: () => head({ title: 'Announcements', path: 'announcements', sub: 'News for residents in the app: taman-wide, or for particular streets, blocks or units.', actions: `<button type="button" class="btn btn-p" data-act="new-ann">${icon('add')}New announcement</button>` })
  + ixHTML({ id: 'announcements', noun: 'announcements', ph: 'Search announcements', rows: () => ANNOUNCEMENTS, text: a => `${a.title} ${a.body} ${a.audience}`,
    filters: [tamanF(), { k: 'status', label: 'Status', all: 'All statuses', opts: ['Sent', 'Scheduled', 'Draft'] }],
    cols: [
      { h: 'Announcement', v: a => t2(a.title, a.body), s: a => a.title, t: a => a.title },
      { h: 'Audience', v: a => t2(a.audience, T(a.taman).short), t: a => `${a.audience}, ${T(a.taman).short}` },
      { h: 'Channels', hide: 'hidden xl:table-cell', v: a => `<div class="flex flex-wrap gap-1">${a.channels.map(c => chip(c, 'mute', true)).join('')}</div>`, t: a => a.channels.join('; ') },
      { h: 'Date', v: a => dWhen(a.at), s: a => a.at, t: a => dDate(a.at) },
      { h: 'Read', num: true, v: a => a.reads != null ? `${a.reads}%` : muted('—'), s: a => a.reads ?? -1, t: a => a.reads ?? '' },
      { h: 'Status', badge: true, v: a => stc(a.status), s: a => a.status, t: a => a.status },
    ], sort: 3, dir: -1, open: a => composeDrawer(a) }) };
ACT['new-ann'] = () => composeDrawer();
function composeDrawer(a) {
  const isNew = !a, sent = a?.status === 'Sent';
  drawer({ title: isNew ? 'New announcement' : esc(a.title), sub: isNew ? 'Residents see it on their home feed' : `${a.status} · ${dWhen(a.at)}${a.reads != null ? ` · read by ${a.reads}%` : ''}`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">
      ${sect('Message', grid(
        F({ k: 'title', label: 'Title', v: a?.title, req: true, af: isNew, span: true, max: 80, ph: 'e.g. Water disruption · Sat 9 am–2 pm' }),
        F({ k: 'body', label: 'Message', type: 'textarea', v: a?.body, rows: 5, req: true, span: true, max: 1000 }),
        F({ k: 'tpl', label: 'Start from a template', type: 'select', ph: 'No template', span: true, opts: TEMPLATES.map(t => [t.id, t.name]) })))}
      ${sect('Who sees it', grid(
        F({ k: 'taman', label: 'Taman', type: 'select', req: true, v: a?.taman || myTamans()[0].id, opts: tamanOpts(), span: true }),
        F({ k: 'aud', label: 'Audience', type: 'radio', cols: 2, noOpt: true, span: true, v: !a || a.audience === 'Taman-wide' ? 'all' : a.audience === 'Owners only' ? 'owners' : 'part', opts: [['all', 'Whole taman'], ['owners', 'Owners only'], ['part', 'Some streets, blocks or units']] }),
        F({ k: 'part', label: 'Streets, blocks or units', req: true, span: true, when: 'aud=part', v: a && !['Taman-wide', 'Owners only'].includes(a.audience) ? a.audience : '', ph: 'e.g. Jalan Harmoni 1–4, or Block B' }),
        F({ k: 'channels', label: 'Send by', type: 'checks', noOpt: true, span: true, v: a?.channels || ['In-app', 'Push'], opts: ['In-app', 'Push', 'Email', 'SMS'], hint: 'In-app is always on. SMS uses credits.' }),
        F({ k: 'when', label: 'When', type: 'radio', cols: 2, noOpt: true, span: true, v: a?.status === 'Scheduled' ? 'later' : 'now', opts: [['now', 'Publish now'], ['later', 'Schedule']] }),
        F({ k: 'at', label: 'Publish at', type: 'datetime-local', req: true, when: 'when=later', v: '2026-10-04T09:00', min: '2026-10-03T10:43', span: true })))}
      ${sent ? note('This was already sent. Saving publishes a correction to the same readers.', 'sun', 'edit_note') : ''}
    </form>`,
    foot: `${isNew || a.status === 'Draft' ? '<button type="submit" form="dr-form" class="btn btn-o sm:mr-auto" data-intent="draft">Save draft</button>' : ''}<button type="button" class="btn btn-o" data-act="drawer-close">Cancel</button><button type="submit" form="dr-form" class="btn btn-p" data-intent="publish">${sent ? 'Publish correction' : 'Publish'}</button>`,
    input: (f, e) => { if (e?.target?.name === 'tpl' && e.target.value) { const t = TEMPLATES.find(x => x.id === e.target.value), el = f.elements; el.title.value ||= t.name; el.body.value = t.en; } },
    submit: (d, f, btn) => {
      const draft = btn?.dataset.intent === 'draft';
      if (!draft && !d.channels.includes('In-app')) d.channels.unshift('In-app');
      const rec = { title: d.title.trim(), body: d.body.trim(), taman: d.taman, audience: d.aud === 'all' ? 'Taman-wide' : d.aud === 'owners' ? 'Owners only' : d.part.trim(), channels: d.channels, status: draft ? 'Draft' : d.when === 'later' ? 'Scheduled' : 'Sent', at: d.when === 'later' ? new Date(d.at) : clock(), reads: draft || d.when === 'later' ? null : 0 };
      if (isNew) ANNOUNCEMENTS.unshift({ id: 'ANN-' + (240 + ANNOUNCEMENTS.length), ...rec }); else Object.assign(a, rec);
      log(draft ? 'Saved announcement draft' : 'Published announcement', rec.title, rec.taman); rerender();
      toast(draft ? 'Draft saved' : rec.status === 'Scheduled' ? `Scheduled for ${dWhen(rec.at)}` : `Published to ${esc(rec.audience === 'Taman-wide' ? T(rec.taman).name : rec.audience)}`, { href: '#/announcements', label: 'View' });
    } });
}
ROUTES.broadcasts = { title: 'Broadcasts', render: () => head({ title: 'Broadcasts', path: 'broadcasts', sub: 'Direct messages by SMS, email, push or in-app, for reminders and urgent notices. Delivery is tracked per channel.', actions: `<button type="button" class="btn btn-p" data-act="new-bc">${icon('send')}New broadcast</button>` })
  + ixHTML({ id: 'broadcasts', noun: 'broadcasts', ph: 'Search broadcasts', rows: () => BROADCASTS, text: b => `${b.title} ${b.audience} ${b.channel}`,
    filters: [tamanF(), { k: 'channel', label: 'Channel', all: 'All channels', opts: ['SMS', 'Email', 'Push', 'In-app'] }, { k: 'status', label: 'Status', all: 'All statuses', opts: ['Sent', 'Scheduled', 'Partly failed'] }],
    cols: [
      { h: 'Message', v: b => t2(b.title, `${b.audience} · ${T(b.taman).short}`), s: b => b.title, t: b => b.title },
      { h: 'Channel', v: b => chip(b.channel, b.channel === 'SMS' ? 'sun' : 'indigo', true), s: b => b.channel, t: b => b.channel },
      { h: 'Recipients', num: true, v: b => N(b.sent), s: b => b.sent },
      { h: 'Delivered', num: true, v: b => b.delivered != null ? `<span class="${b.delivered < 90 ? 'text-bad-ink font-semibold' : ''}">${b.delivered}%</span>` : muted('—'), s: b => b.delivered ?? -1, t: b => b.delivered ?? '' },
      { h: 'Date', v: b => dWhen(b.at), s: b => b.at, t: b => dDate(b.at) },
      { h: 'Status', badge: true, v: b => stc(b.status), s: b => b.status, t: b => b.status },
    ], sort: 4, dir: -1, open: b => drawer({ title: esc(b.title), sub: `${b.channel} · ${dWhen(b.at)}`, body: `<div class="grid gap-5">${sect('Delivery', dl([['Audience', `${esc(b.audience)}, ${esc(T(b.taman).short)}`, true], ['Recipients', N(b.sent)], ['Delivered', b.delivered != null ? `${b.delivered}% · ${N(Math.round(b.sent * b.delivered / 100))} people` : 'Not sent yet'], ['Failed', b.delivered != null ? N(b.sent - Math.round(b.sent * b.delivered / 100)) : '—'], ['Status', stc(b.status)]]))}${b.status === 'Partly failed' ? note('Most failures are numbers that no longer exist. Ask residents to update their phone number in the app.', 'coral', 'sms_failed') : ''}</div>`, foot: b.status === 'Partly failed' ? `<button type="button" class="btn btn-p" data-act="bc-retry" data-id="${b.id}">${icon('replay')}Retry failed</button>` : '' }) }) };
ACT['bc-retry'] = el => { const b = BROADCASTS.find(x => x.id === el.dataset.id); b.delivered = 96; b.status = 'Sent'; closeDrawer(); rerender(); toast('Retried. 96% delivered now.'); };
ACT['new-bc'] = () => drawer({ title: 'New broadcast', sub: esc(scopeName()),
  body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Message', grid(
    F({ k: 'channel', label: 'Channel', type: 'radio', cols: 2, noOpt: true, span: true, v: 'SMS', opts: [['SMS', 'SMS', '4,210 credits left'], ['Push', 'Push'], ['Email', 'Email'], ['In-app', 'In-app']] }),
    F({ k: 'tpl', label: 'Template', type: 'select', ph: 'No template', span: true, opts: TEMPLATES.map(t => [t.id, `${t.name} (${t.cat})`]) }),
    F({ k: 'title', label: 'Title', req: true, span: true, ph: 'For your records and the email subject' }),
    F({ k: 'msg', label: 'Message', type: 'textarea', rows: 4, req: true, span: true }),
    `<p id="sms-count" class="sm:col-span-2 -mt-3 text-[12.5px] text-muted" aria-live="polite"></p>`))}
    ${sect('Recipients', grid(
      F({ k: 'taman', label: 'Taman', type: 'select', req: true, opts: tamanOpts(), v: myTamans()[0].id }),
      F({ k: 'aud', label: 'Who', type: 'select', noOpt: true, opts: ['All residents', 'Owners only', 'Units with unpaid fees', 'Units with overdue fees'] }),
      F({ k: 'when', label: 'Send', type: 'radio', cols: 2, noOpt: true, span: true, v: 'now', opts: [['now', 'Now'], ['later', 'Schedule']] }),
      F({ k: 'at', label: 'Send at', type: 'datetime-local', req: true, when: 'when=later', v: '2026-10-04T09:00', span: true }),
      `<output id="bc-n" class="sm:col-span-2 block rounded-2xl bg-indigo-tint p-4 text-[14px] text-indigo"></output>`))}</form>`,
  foot: footSave('Send broadcast'),
  input: (f, e) => {
    if (e?.target?.name === 'tpl' && e.target.value) { const t = TEMPLATES.find(x => x.id === e.target.value); f.elements.title.value = t.name; f.elements.msg.value = t.en; }
    const d = formData(f), len = d.msg.length, seg = Math.max(1, Math.ceil(len / 160));
    $('#sms-count').textContent = d.channel === 'SMS' ? `${len} characters · ${seg} SMS per person` : `${len} characters`;
    const units = UNITS.filter(u => u.taman === d.taman), inv = INVOICES.filter(i => i.taman === d.taman);
    const n = d.aud === 'All residents' ? OCC.filter(o => o.taman === d.taman).length : d.aud === 'Owners only' ? new Set(units.map(u => u.owner)).size : new Set(inv.filter(i => d.aud.includes('overdue') ? i.status === 'Overdue' : ['Due', 'Overdue', 'Partially paid'].includes(i.status)).map(i => i.unit)).size;
    f.dataset.n = n; $('#bc-n').innerHTML = `Goes to <b class="num">${N(n)}</b> ${d.aud === 'All residents' ? 'residents' : d.aud === 'Owners only' ? 'owners' : 'units'}${d.channel === 'SMS' ? ` and uses <b class="num">${N(n * seg)}</b> SMS credits` : ''}.`;
  },
  submit: (d, f) => { if (d.channel === 'SMS' && +f.dataset.n * Math.ceil(d.msg.length / 160) > 4210) return fieldErr(f, 'msg', 'Not enough SMS credits. Shorten the message or top up in Integrations.'); BROADCASTS.unshift({ id: 'BRC-' + (120 + BROADCASTS.length), title: d.title.trim(), channel: d.channel, taman: d.taman, audience: d.aud, sent: +f.dataset.n, status: d.when === 'later' ? 'Scheduled' : 'Sent', at: d.when === 'later' ? new Date(d.at) : clock(), delivered: d.when === 'later' ? null : 98 }); log('Sent broadcast', `${d.title} (${d.channel})`, d.taman); rerender(); toast(d.when === 'later' ? 'Broadcast scheduled' : `Sent to ${N(+f.dataset.n)} by ${d.channel}`); } });
ROUTES.templates = { title: 'Templates', render: () => head({ title: 'Message templates', path: 'templates', sub: 'Reusable messages in English and Bahasa Melayu. Words in {braces} are filled in for each resident.', actions: `<button type="button" class="btn btn-p" data-act="tpl-new">${icon('add')}New template</button>` })
  + ixHTML({ id: 'templates', noun: 'templates', ph: 'Search templates', rows: () => TEMPLATES, scope: () => true, text: t => `${t.name} ${t.en} ${t.bm}`,
    filters: [{ k: 'cat', label: 'Category', all: 'All categories', opts: [...new Set(TEMPLATES.map(t => t.cat))] }],
    cols: [
      { h: 'Template', v: t => t2(t.name, t.en), s: t => t.name, t: t => t.name },
      { h: 'Category', v: t => chip(t.cat, 'mute', true), s: t => t.cat, t: t => t.cat },
      { h: 'Languages', v: t => `${chip('EN', 'indigo', true)} ${t.bm ? chip('BM', 'indigo', true) : chip('BM missing', 'coral', true)}`, t: t => t.bm ? 'EN, BM' : 'EN' },
      { h: 'Used', num: true, v: t => `${t.used}×`, s: t => t.used },
      { h: 'Updated', v: t => ago(t.updated), s: t => t.updated, t: t => dDate(t.updated) },
    ], sort: 0, dir: 1, open: t => tplDrawer(t) }) };
ACT['tpl-new'] = () => tplDrawer();
function tplDrawer(t) {
  const isNew = !t, vars = ['{name}', '{unit}', '{amount}', '{due_date}', '{date}', '{time}', '{area}', '{permit_id}'];
  drawer({ wide: true, title: isNew ? 'New template' : esc(t.name), sub: isNew ? '' : `${t.cat} · used ${t.used} times`,
    body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Template', grid(
      F({ k: 'name', label: 'Name', v: t?.name, req: true, af: isNew }), F({ k: 'cat', label: 'Category', type: 'select', noOpt: true, v: t?.cat, opts: [...new Set(TEMPLATES.map(x => x.cat))] }),
      F({ k: 'en', label: 'English', type: 'textarea', rows: 4, v: t?.en, req: true, span: true }),
      F({ k: 'bm', label: 'Bahasa Melayu', type: 'textarea', rows: 4, v: t?.bm, span: true, hint: 'Residents who chose BM in the app get this version.' })))}
      ${sect('Fill-in words', `<div class="flex flex-wrap gap-2">${vars.map(v => `<span class="chip chip-indigo plain">${v}</span>`).join('')}</div>`, { sub: 'Type these into the message and they are replaced for each resident.' })}</form>`,
    foot: footSave(isNew ? 'Create template' : 'Save template'),
    submit: d => { const rec = { name: d.name.trim(), cat: d.cat, en: d.en.trim(), bm: d.bm.trim(), updated: clock() }; if (isNew) TEMPLATES.unshift({ id: 'TPL-' + (10 + TEMPLATES.length), used: 0, ...rec }); else Object.assign(t, rec); log(isNew ? 'Created template' : 'Updated template', rec.name, 'all'); rerender(); toast(`${esc(rec.name)} saved`); } });
}

// ================= Analytics =================
ROUTES.analytics = { title: 'Analytics', render() {
  const tm = myTamans(), metrics = t => {
    const units = UNITS.filter(u => u.taman === t.id), inv = INVOICES.filter(i => i.taman === t.id), sep = inv.filter(i => i.period === 'Sep 2026'), oct = inv.filter(i => i.period === 'Oct 2026');
    const vis = VISITORS.filter(v => v.taman === t.id && v.in > at(-7, 0) && v.status !== 'Expected'), bk = BOOKINGS.filter(b => b.taman === t.id && ['Completed', 'Confirmed', 'Overridden'].includes(b.status));
    return { t, units: units.length, occ: occRate(units), coll: pct(sum(sep, i => i.paid), sum(sep, i => i.amount)), octColl: pct(sum(oct, i => i.paid), sum(oct, i => i.amount)), vis: vis.length, fac: sum(bk, b => b.hours), reno: PERMITS.filter(p => p.taman === t.id && p.category === 'Renovation' && ['Approved', 'Work In Progress', 'Inspection Scheduled'].includes(p.status)).length, escrow: sum(ledger().filter(l => l.taman === t.id && l.escrow), l => l.amount) };
  };
  const M = tm.map(metrics), all = { units: sum(M, m => m.units), occ: Math.round(sum(M, m => m.occ * m.units) / Math.max(1, sum(M, m => m.units))), coll: Math.round(sum(M, m => m.coll * m.units) / Math.max(1, sum(M, m => m.units))), vis: sum(M, m => m.vis), fac: sum(M, m => m.fac), reno: sum(M, m => m.reno), escrow: sum(M, m => m.escrow) };
  const hist = [['Apr', 94], ['May', 92], ['Jun', 95], ['Jul', 93], ['Aug', 91]].map(([l, v], i) => ({ l, v: Math.max(80, v - (S.scope === 'all' ? 0 : (S.scope.charCodeAt(0) + i) % 4)) }));
  const octTotal = Math.round(sum(M, m => m.octColl * m.units) / Math.max(1, all.units));
  const days = Array.from({ length: 10 }, (_, i) => at(-9 + i));
  const cell = (k, v, s) => `<div class="bg-white p-5"><p class="text-[13px] text-muted">${k}</p><p class="mt-1 text-[22px] leading-8 font-semibold tracking-[-0.02em] num">${v}</p><p class="mt-1 text-[12.5px] text-muted">${s}</p></div>`;
  return head({ title: 'Analytics', sub: `${esc(scopeName())} · figures as of ${dDate(NOW)}. Switch the scope in the top bar to compare one taman with the portfolio.` })
    + `<section class="panel overflow-hidden mb-6" aria-label="Key figures"><div class="grid gap-px bg-line grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      ${cell('Occupancy', all.occ + '%', `${N(all.units)} units`)}${cell('September collection rate', all.coll + '%', `October so far: ${octTotal}%`)}${cell('Visitors, last 7 days', N(all.vis), `${Math.round(all.vis / 7)} a day`)}${cell('Facility hours booked', N(all.fac), `across ${N(BOOKINGS.filter(b => inScope(b) && ['Completed', 'Confirmed', 'Overridden'].includes(b.status)).length)} bookings`)}${cell('Active renovations', all.reno, 'approved or under way')}${cell('Deposits in escrow', RM0(all.escrow), 'refundable to residents')}</div></section>
    <div class="grid gap-6 xl:grid-cols-2 mb-6">
      ${sect('Collection rate by month', vbars([...hist, { l: 'Sep', v: all.coll }, { l: 'Oct*', v: octTotal, hl: true }], { fmt: v => v + '%', label: 'Collection rate by month' }) + `<p class="mt-3 text-[12.5px] text-muted">*October is month to date; fees are due on the 15th.</p>`)}
      ${sect('Visitors per day', vbars(days.map((d, i) => ({ l: String(d.getDate()), v: VISITORS.filter(v => inScope(v) && sameDay(v.in, d) && v.status !== 'Expected').length, hl: i === 9 })), { label: 'Visitors per day' }) + `<p class="mt-3 text-[12.5px] text-muted">${dShort(days[0])} – ${dShort(days[9])}. Today, in coral, runs to ${dTime(NOW)}.</p>`)}
      ${sect('Occupancy by taman', hbars(M.map(m => ({ l: m.t.short, v: m.occ })), { fmt: v => v + '%', max: 100, label: 'Occupancy by taman' }))}
      ${sect('Permits by status', hbars(PSTATUS.map(s => ({ l: s, v: PERMITS.filter(p => inScope(p) && p.status === s).length })).filter(d => d.v), { label: 'Permits by status' }))}
    </div>`
    + ixHTML({ id: 'compare', noun: 'tamans', one: 'taman', ph: 'Search taman', rows: () => M.map(m => ({ ...m, taman: m.t.id })), text: m => m.t.name, scope: () => true,
      cols: [
        { h: 'Taman', v: m => t2(m.t.name, `${N(m.units)} units`), s: m => m.t.name, t: m => m.t.name },
        { h: 'Occupancy', num: true, v: m => m.occ + '%', s: m => m.occ },
        { h: 'Sep collected', num: true, v: m => `<span class="${m.coll < 90 ? 'text-bad-ink font-semibold' : ''}">${m.coll}%</span>`, s: m => m.coll, t: m => m.coll + '%' },
        { h: 'Oct so far', num: true, v: m => m.octColl + '%', s: m => m.octColl },
        { h: 'Visitors (7 days)', num: true, v: m => N(m.vis), s: m => m.vis },
        { h: 'Facility hours', num: true, hide: 'hidden lg:table-cell', v: m => N(m.fac), s: m => m.fac },
        { h: 'Renovations', num: true, hide: 'hidden lg:table-cell', v: m => m.reno, s: m => m.reno },
        { h: 'Escrow', num: true, v: m => RM0(m.escrow), s: m => m.escrow, t: m => m.escrow.toFixed(2) },
      ], sort: 0, dir: 1, emptyText: '' })
    + (S.scope === 'all' ? '' : `<p class="mt-3 text-[13px] text-muted">Set the scope to All tamans to compare tamans side by side.</p>`);
} };

// ================= Settings =================
const lum = hex => { const c = hex.replace('#', '').match(/../g).map(x => { const v = parseInt(x, 16) / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
ROUTES.profile = { title: 'Taman profile & branding', render() {
  const tid = myTamans().some(t => t.id === S.tab.ptaman) ? S.tab.ptaman : myTamans()[0].id, t = T(tid), b = BRANDING[tid];
  return head({ title: 'Taman profile & branding', path: 'profile', sub: 'How each taman appears to its residents in the app, and who they call in an emergency.' })
    + (S.scope === 'all' ? `<div class="seg mb-5 max-w-full overflow-x-auto no-sb" role="tablist" aria-label="Taman">${TAMANS.map(x => `<button type="button" role="tab" aria-selected="${x.id === tid}" data-act="tab" data-k="ptaman" data-v="${x.id}">${esc(x.short)}</button>`).join('')}</div>` : '')
    + `<form data-form="profile" data-id="${tid}" novalidate class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div class="grid gap-6 min-w-0">
        ${sect('Profile', grid(F({ k: 'name', label: 'Name residents see', v: t.name, req: true, span: true }), F({ k: 'city', label: 'Town and state', v: t.city, req: true }), F({ k: 'phone', label: 'Management office phone', type: 'tel', v: t.phone, req: true }), F({ k: 'gates', label: 'Guarded gates', type: 'number', v: t.gates, min: 0, max: 6, req: true }), F({ k: 'lang', label: 'Default app language for new residents', type: 'select', noOpt: true, v: t.lang || 'en', opts: [['en', 'English'], ['bm', 'Bahasa Melayu']] })))}
        ${sect('Branding', `<div class="grid gap-5">
          <div class="flex flex-wrap items-center gap-4"><span id="logo-prev" class="w-16 h-16 rounded-2xl bg-paper grid place-items-center overflow-hidden shadow-[inset_0_0_0_1px_var(--line)]">${b.logo ? `<img src="${b.logo}" alt="Taman logo" class="w-full h-full object-cover">` : '<span class="mark"></span>'}</span>
            <div class="min-w-0"><label class="btn btn-o btn-sm cursor-pointer">${icon('upload')}Upload taman logo<input type="file" name="logo" accept="image/png,image/jpeg,image/svg+xml" class="sr-only"></label><p class="mt-1.5 text-[12.5px] text-muted">Square PNG, JPG or SVG. Without one, the Tamanly mark is used.</p></div></div>
          ${grid(F({ k: 'primary', label: 'Header colour', type: 'color', v: b.primary, noOpt: true }), F({ k: 'accent', label: 'Accent colour', type: 'color', v: b.accent, noOpt: true }))}
          <p id="contrast-msg" class="text-[13px]" aria-live="polite"></p>
          <button type="button" class="btn btn-g btn-sm justify-self-start" data-act="brand-reset">${icon('restart_alt')}Use Tamanly colours</button></div>`, { sub: 'Residents see these in the app header and buttons.' })}
        ${sect('Emergency and SOS contacts', `<ul id="sos" class="grid gap-3">${SOS[tid].map((s, i) => sosRow(s, i)).join('')}</ul><button type="button" class="btn btn-t btn-sm mt-4" data-act="sos-add">${icon('add')}Add contact</button>`, { sub: 'Shown on the SOS screen in the app, in this order.' })}
        <div><button type="submit" class="btn btn-p">Save ${esc(t.short)}</button></div>
      </div>
      <aside class="lg:sticky lg:top-6"><p class="mb-2 text-[13px] font-medium text-muted">Resident app preview</p><div id="app-prev">${appPreview(t, b)}</div></aside>
    </form>`;
}, after: () => LIVE.profile($('form[data-form="profile"]')) };
const sosRow = (s, i) => `<li class="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"><div>${i === 0 ? '<span class="block text-[13px] font-medium mb-1.5">Label</span>' : ''}<input class="input" name="sosl${i}" value="${esc(s[0])}" aria-label="Contact ${i + 1} label" required></div><div>${i === 0 ? '<span class="block text-[13px] font-medium mb-1.5">Phone</span>' : ''}<input class="input num" name="sosp${i}" type="tel" value="${esc(s[1])}" aria-label="Contact ${i + 1} phone" required></div><button type="button" class="btn btn-g btn-icon" data-act="sos-del" data-i="${i}" aria-label="Remove contact ${i + 1}">${icon('delete')}</button></li>`;
const appPreview = (t, b) => `<div class="rounded-[32px] bg-ink p-2 shadow-[0_18px_40px_rgba(61,43,107,.18)] max-w-[300px]"><div class="rounded-[26px] overflow-hidden bg-cream">
  <div class="px-5 pt-5 pb-10 text-white" style="background:${b.primary}"><div class="flex items-center justify-between"><span class="w-8 h-8 rounded-full bg-white/25"></span><span class="rounded-full bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold truncate max-w-[160px]">${esc(t.short)} · No. 12</span><span class="relative w-8 h-8 rounded-full bg-white/15 grid place-items-center">${icon('notifications', 'text-[16px]')}<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style="background:${b.accent}"></span></span></div><p class="mt-5 text-[20px] font-bold">Hello, Aisyah!</p><p class="text-[12px] opacity-80">Owner · 3 properties</p></div>
  <div class="-mt-5 rounded-t-[22px] bg-white px-4 pt-4 pb-4"><div class="grid grid-cols-4 gap-2">${[['group_add', 'Visitors'], ['assignment', 'Permits'], ['receipt_long', 'Bills'], ['pool', 'Facilities']].map(([ic, l], i) => `<span class="grid justify-items-center gap-1"><span class="w-full aspect-square rounded-xl grid place-items-center ${['tile-coral', 'tile-sun', 'tile-indigo', 'tile-ok'][i]}">${icon(ic, 'text-[18px]')}</span><span class="text-[10px] font-medium text-ink">${l}</span></span>`).join('')}</div>
  <div class="mt-3 rounded-2xl px-3.5 py-3 text-white" style="background:${b.primary}"><p class="text-[10.5px] opacity-80">October dues · Jalan Harmoni 3</p><div class="mt-0.5 flex items-center justify-between"><p class="text-[17px] font-bold num">RM 185.00</p><span class="rounded-full px-3 py-1 text-[11px] font-semibold text-ink" style="background:${b.accent}">Pay now</span></div></div>
  <div class="mt-3 grid justify-items-center gap-1"><span class="w-11 h-11 rounded-full grid place-items-center text-white" style="background:${b.accent}">${icon('qr_code_2', 'text-[20px]')}</span><span class="text-[10px] font-medium text-muted">QR Pass</span></div></div></div></div>`;
LIVE.profile = (f, e) => {
  const d = formData(f), b = { ...BRANDING[f.dataset.id], primary: d.primary, accent: d.accent };
  if (e?.target?.name === 'logo' && e.target.files[0]) { const r = new FileReader(); r.onload = () => { f.dataset.logo = r.result; $('#logo-prev').innerHTML = `<img src="${r.result}" alt="Taman logo" class="w-full h-full object-cover">`; }; r.readAsDataURL(e.target.files[0]); }
  const c = contrast(d.primary, '#FFFFFF'), m = $('#contrast-msg');
  m.className = `text-[13px] ${c < 4.5 ? 'text-bad-ink font-semibold' : 'text-muted'}`;
  m.textContent = c < 4.5 ? `White text on this header colour is hard to read (${c.toFixed(1)}:1, needs 4.5:1). Pick a darker colour.` : `White text on the header reads well (${c.toFixed(1)}:1).`;
  $('#app-prev').innerHTML = appPreview({ ...T(f.dataset.id), short: d.name.replace(/^(Taman|Residensi)\s+/i, '') || T(f.dataset.id).short }, b);
};
ACT['brand-reset'] = () => { const f = $('form[data-form="profile"]'); f.primary.value = '#3D2B6B'; f.accent.value = '#E87A6B'; LIVE.profile(f); };
ACT['sos-add'] = () => { const f = $('form[data-form="profile"]'), i = $$('#sos li').length; $('#sos').insertAdjacentHTML('beforeend', sosRow(['', ''], i)); f[`sosl${i}`].focus(); };
ACT['sos-del'] = el => { const li = el.closest('li'); if ($$('#sos li').length === 1) { toast('Keep at least one emergency contact'); return; } li.remove(); };
FORMS.profile = (d, f) => {
  const tid = f.dataset.id, t = T(tid);
  if (contrast(d.primary, '#FFFFFF') < 4.5) return fieldErr(f, 'primary', 'Choose a darker header colour so white text stays readable.');
  Object.assign(t, { name: d.name.trim(), city: d.city.trim(), phone: d.phone.trim(), gates: +d.gates, lang: d.lang });
  Object.assign(BRANDING[tid], { primary: d.primary, accent: d.accent, logo: f.dataset.logo || BRANDING[tid].logo });
  SOS[tid] = $$('#sos li').map((li, i) => [li.querySelector('[name^="sosl"]').value.trim(), li.querySelector('[name^="sosp"]').value.trim()]).filter(x => x[0] && x[1]);
  log('Updated taman profile and branding', t.name, tid); rerender(); toast(`${esc(t.name)} saved. Residents see the change next time they open the app.`);
};
ROUTES.integrations = { title: 'Integrations', render: () => head({ title: 'Integrations', path: 'integrations', sub: 'Services Tamanly connects to for payments, messages and gates. Keys are stored encrypted and shown masked.' })
  + `<section class="panel"><ul class="divide-y divide-line">${INTEGRATIONS.map(x => `<li class="flex flex-wrap items-center gap-4 px-5 sm:px-6 py-5"><span class="tile tile-indigo">${icon(x.icon)}</span><div class="min-w-[60%] flex-1"><p class="text-[15px] font-semibold">${x.name}</p><p class="text-[13.5px] text-muted leading-5">${x.desc}</p><p class="mt-1 text-[12.5px] text-muted">${esc(x.detail)}</p></div>${stc(x.status)}<button type="button" class="btn btn-o btn-sm" data-act="intg" data-id="${x.id}">${x.status === 'Connected' ? 'Settings' : 'Set up'}</button></li>`).join('')}</ul></section>` };
ACT.intg = el => { const x = INTEGRATIONS.find(i => i.id === el.dataset.id);
  const fields = { pay: [F({ k: 'mid', label: 'Merchant ID', v: 'TML-LESTARI-01', req: true }), F({ k: 'key', label: 'Secret key', type: 'password', v: 'sk_live_••••••••3f9a', req: true }), F({ k: 'settle', label: 'Settlement account', type: 'select', noOpt: true, opts: REFUND_ACCOUNTS, span: true })],
    sms: [F({ k: 'sender', label: 'Sender ID', v: 'TAMANLY', req: true, max: 11 }), F({ k: 'key', label: 'API key', type: 'password', v: '••••••••••••a71c', req: true }), F({ k: 'low', label: 'Warn when credits fall below', type: 'number', v: 500, min: 0 })],
    mail: [F({ k: 'from', label: 'From address', type: 'email', v: 'notices@lestarifm.my', req: true }), F({ k: 'host', label: 'SMTP host', v: 'smtp.lestarifm.my', req: true }), F({ k: 'port', label: 'Port', type: 'number', v: 587, req: true }), F({ k: 'pass', label: 'Password', type: 'password', v: '••••••••', req: true })],
    gate: [F({ k: 'url', label: 'Webhook URL', type: 'url', req: true, span: true, ph: 'https://gate-controller.example/hooks/tamanly', msg: 'Enter the https address your gate vendor gave you.' }), F({ k: 'secret', label: 'Signing secret', type: 'password', req: true, span: true }), F({ k: 'events', label: 'Send these events', type: 'checks', noOpt: true, span: true, v: ['Visitor admitted', 'Visitor denied', 'Contractor checked in'], opts: ['Visitor admitted', 'Visitor denied', 'Contractor checked in', 'Stop-work order issued'] })] }[x.id];
  drawer({ title: x.name, sub: x.status, body: `<form id="dr-form" data-form="drawer" novalidate class="grid gap-5">${sect('Connection', grid(...fields), { sub: x.desc })}</form>`,
    foot: `<button type="button" class="btn btn-o sm:mr-auto" data-act="intg-test" data-id="${x.id}">${icon('network_check')}Test connection</button>` + footSave(x.status === 'Connected' ? 'Save' : 'Connect'),
    submit: (d, f) => { if (x.id === 'gate' && !/^https:\/\//.test(d.url)) return fieldErr(f, 'url', 'Use an https address so events are encrypted.'); x.status = 'Connected'; if (x.id === 'gate') x.detail = `Sending ${d.events.length} event types to ${new URL(d.url).host}`; log(`Updated ${x.name}`, x.detail, 'all'); rerender(); toast(`${x.name} saved`); } }); };
ACT['intg-test'] = el => { const f = $('#dr-form'), x = INTEGRATIONS.find(i => i.id === el.dataset.id); if (x.id === 'gate' && !/^https:\/\//.test(f.url.value)) { fieldErr(f, 'url', 'Enter the https address first, then test.'); return; } el.classList.add('busy'); setTimeout(() => { el.classList.remove('busy'); toast(x.id === 'gate' ? 'Test event delivered (200 OK)' : `${x.name}: connection OK`); }, 700); };
ROUTES.audit = { title: 'Audit log', render: () => head({ title: 'Audit log', path: 'audit', sub: `Every change made by ${esc(ORG.short)} staff in this console. Entries can't be edited or deleted.` })
  + ixHTML({ id: 'audit', noun: 'entries', one: 'entry', ph: 'Search action, target or person', rows: () => AUDIT, scope: r => S.scope === 'all' || r.taman === S.scope || r.taman === 'all', text: a => `${a.actor} ${a.action} ${a.target}`,
    filters: [{ k: 'actor', label: 'Person', all: 'Everyone', opts: STAFF.map(s => s[0]) }, dateF(a => a.at), { k: 'taman', label: 'Taman', all: 'All tamans', opts: TAMANS.map(t => [t.id, t.short]) }],
    cols: [
      { h: 'When', v: a => dWhen(a.at), s: a => a.at, t: a => a.at.toISOString() },
      { h: 'Who', v: a => esc(a.actor), s: a => a.actor },
      { h: 'Action', v: a => `<b class="font-semibold">${esc(a.action)}</b>`, s: a => a.action, t: a => a.action },
      { h: 'Target', v: a => `<span class="block max-w-[320px] truncate">${esc(a.target)}</span>`, t: a => a.target },
      { h: 'Taman', v: a => a.taman === 'all' ? muted('Portfolio') : esc(T(a.taman)?.short || a.taman), t: a => a.taman === 'all' ? 'Portfolio' : T(a.taman)?.name },
      { h: 'IP address', hide: 'hidden xl:table-cell', v: a => `<span class="num text-muted">${a.ip}</span>`, t: a => a.ip },
    ], sort: 0, dir: -1, per: 25 }) };

ROUTES['404'] = { title: 'Not found', render: () => head({ title: 'Page not found' }) + `<p class="text-muted">That address doesn't match a page. <a class="font-semibold text-indigo underline" href="#/">Go to the overview</a> or press ${IS_MAC ? '⌘' : 'Ctrl'} K to search.</p>` };

// ================= Boot =================
buildNotifs();
if (QS.get('view') === 'board') IX.permits = { q: '', f: {}, sort: 6, dir: -1, page: 1, view: 'board' };
render();
if (QS.has('nav') && S.authed) openNav();
if (QS.get('act') && S.authed) ACT[QS.get('act')]?.(document.createElement('button')); // mobile.html opens a drawer this way
if (QS.has('check')) checkBulkParse();
