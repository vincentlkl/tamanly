'use strict';
// Synthetic demo data for the admin prototype. Seeded, so every reload shows the same tamans, people and amounts.
let seed = 20261003;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = p => rnd() < p;
const DAY = 864e5;
const NOW = new Date(2026, 9, 3, 10, 42); // Saturday 3 Oct 2026, 10:42 (fixed so the demo reads the same every day)
const at = (days, h = 9, m = 0) => { const d = new Date(NOW.getTime() + days * DAY); d.setHours(h, m, 0, 0); return d; };
const pad = n => String(n).padStart(2, '0');
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXY';
const plate = () => pick('WBVJPANM') + pick(LETTERS) + (chance(.6) ? pick(LETTERS) : '') + ' ' + int(1, 9999);
// Non-breaking spaces keep a phone number on one line wherever it lands
const phone = () => `+60\u00a01${int(1, 9)}-${int(200, 999)}\u00a0${int(1000, 9999)}`;

const MALAY_G = ['Nurul Aisyah', 'Siti Hajar', 'Nur Izzati', 'Farah Nadia', 'Aina Sofea', 'Nor Hidayah', 'Ahmad Faizal', 'Muhammad Hafiz', 'Mohd Azlan', 'Amirul Hakim', 'Khairul Anuar', 'Syafiq Iskandar', 'Haziq Danial', 'Puteri Balqis'];
const MALAY_L = ['Rahman', 'Ismail', 'Hassan', 'Abdullah', 'Yusof', 'Osman', 'Ibrahim', 'Kamaruddin', 'Zakaria'];
const CN_L = ['Tan', 'Lim', 'Wong', 'Chong', 'Lee', 'Ng', 'Ong', 'Goh', 'Teh', 'Chan', 'Yap', 'Loh'];
const CN_G = ['Wei Ming', 'Mei Yee', 'Kah Hoe', 'Jia Hui', 'Chee Keong', 'Siew Ling', 'Boon Hock', 'Pei Shan', 'Kok Leong', 'Hui Min', 'Zhi Hao', 'Xin Yi'];
const IN_G = ['Priya', 'Ravi', 'Kavitha', 'Suresh', 'Arjun', 'Deepa', 'Ganesh', 'Lakshmi', 'Vijay', 'Revathi'];
const IN_L = ['Subramaniam', 'Chandran', 'Muniandy', 'Nair', 'Pillai', 'Krishnan', 'Raj', 'Selvam'];
const person = () => { const r = rnd(); return r < .5 ? `${pick(MALAY_G)} ${pick(MALAY_L)}` : r < .8 ? `${pick(CN_L)} ${pick(CN_G)}` : `${pick(IN_G)} ${pick(IN_L)}`; };

const ORG = { name: 'Lestari Facility Management Sdn Bhd', short: 'Lestari FM' };
const ME = { name: 'Chong Mei Ling', first: 'Mei Ling', role: 'Portfolio admin', email: 'meiling@lestarifm.my', initials: 'ML' };

const TAMANS = [
  { id: 'dh', name: 'Taman Desa Harmoni', short: 'Desa Harmoni', city: 'Shah Alam, Selangor', kind: 'Landed', blocks: [1, 2, 3, 4, 5, 6, 7, 8].map(n => `Jalan Harmoni ${n}`), size: 412, fee: 185, gates: 2, manager: 'Faizal Rahim', phone: '+60\u00a03-5521\u00a00412' },
  { id: 'bi', name: 'Taman Bukit Indah', short: 'Bukit Indah', city: 'Puchong, Selangor', kind: 'Landed', blocks: [1, 2, 3, 4, 5, 6].map(n => `Jalan BI ${n}`), size: 268, fee: 150, gates: 1, manager: 'Revathi Selvam', phone: '+60\u00a03-8061\u00a02268' },
  { id: 'dj', name: 'Residensi Damai Jaya', short: 'Damai Jaya', city: 'Cheras, Kuala Lumpur', kind: 'Strata', blocks: ['Block A', 'Block B', 'Block C'], size: 540, fee: 0, gates: 2, manager: 'Lee Chee Keong', phone: '+60\u00a03-9130\u00a00540' },
  { id: 'mp', name: 'Taman Melati Permai', short: 'Melati Permai', city: 'Klang, Selangor', kind: 'Landed', blocks: [1, 2, 3, 4].map(n => `Jalan Melati ${n}`), size: 186, fee: 120, gates: 1, manager: 'Siti Hajar Osman', phone: '+60\u00a03-3341\u00a00186' },
];

// ---------- People, units, occupants ----------
const PEOPLE = [];
const PERSON = new Map();
const newPerson = (name = person()) => { const p = { id: 'p' + (PEOPLE.length + 1), name, phone: phone() }; PEOPLE.push(p); PERSON.set(p.id, p); return p; };

const UNITS = [];
for (const t of TAMANS) {
  const add = (block, name, kind, sqft, fee) => {
    const r = rnd();
    UNITS.push({ id: `${t.id}-${UNITS.length + 1}`, taman: t.id, block, name, kind, sqft, fee, status: r < .87 ? 'Occupied' : r < .95 ? 'Vacant' : 'Under notice', owner: null, tenant: null });
  };
  if (t.kind === 'Strata') {
    for (const b of t.blocks) for (let f = 1; f <= 18; f++) for (let n = 1; n <= 10; n++) {
      const k = pick([['2R2B', 850, 245], ['3R2B', 1050, 310], ['3R2B', 1050, 310], ['4R3B', 1380, 390]]);
      add(b, `${b.slice(-1)}-${pad(f)}-${pad(n)}`, `Condo ${k[0]}`, k[1], k[2]);
    }
  } else {
    const per = Math.ceil(t.size / t.blocks.length); let left = t.size;
    for (const b of t.blocks) {
      const n = Math.min(per, left); left -= n;
      for (let k = 1; k <= n; k++) { const ty = rnd(); add(b, `No. ${k}, ${b}`, ty < .7 ? 'Double-storey terrace' : ty < .85 ? 'Corner lot' : 'Semi-D', ty < .7 ? 1650 : ty < .85 ? 2100 : 2600, ty < .7 ? t.fee : t.fee + 35); }
    }
  }
}
const UNIT = new Map(UNITS.map(u => [u.id, u]));

// Multi-property owners. Nurul Aisyah is the owner from the mobile storyboard (No. 12, Jalan Harmoni 3, 3 properties).
const aisyah = newPerson('Nurul Aisyah Rahman');
const aisyahUnits = ['No. 12, Jalan Harmoni 3', 'No. 7, Jalan BI 2', 'B-07-04'].map(n => UNITS.find(u => u.name === n));
aisyahUnits.forEach((u, i) => { u.owner = aisyah.id; if (i === 0) u.status = 'Occupied'; else { u.status = 'Occupied'; u.tenant = newPerson().id; } });
for (let i = 0; i < 13; i++) {
  const p = newPerson();
  for (let n = int(2, 4); n > 0; n--) { let u; do { u = pick(UNITS); } while (u.owner); u.owner = p.id; if (u.status !== 'Vacant' && chance(.7)) u.tenant = newPerson().id; }
}
for (const u of UNITS) {
  if (!u.owner) u.owner = newPerson().id;
  if (!u.tenant && u.status !== 'Vacant' && chance(.24)) u.tenant = newPerson().id;
}

const SCOPES = ['Bills: view', 'Bills: pay', 'Visitor passes', 'Facility booking'];
const OCC = [];
for (const u of UNITS) {
  OCC.push({ id: 'o' + OCC.length, unit: u.id, taman: u.taman, person: u.owner, rel: 'Owner', since: at(-int(90, 2400)), status: 'Active', scopes: [] });
  if (u.tenant) OCC.push({ id: 'o' + OCC.length, unit: u.id, taman: u.taman, person: u.tenant, rel: 'Tenant', since: at(-int(20, 900)), status: u.status === 'Under notice' ? 'Ending' : 'Active', ends: u.status === 'Under notice' ? at(int(10, 40)) : null, scopes: [] });
}
const occupiedUnits = UNITS.filter(u => u.status !== 'Vacant');
for (let i = 0; i < 46; i++) {
  const u = pick(occupiedUnits); const p = newPerson();
  const scopes = SCOPES.filter(() => chance(.5)); if (!scopes.length) scopes.push('Bills: view');
  OCC.push({ id: 'o' + OCC.length, unit: u.id, taman: u.taman, person: p.id, rel: 'Sub-tenant', since: at(-int(3, 300)), status: chance(.8) ? 'Active' : 'Invite pending', scopes, grantedBy: PERSON.get(u.tenant || u.owner).name });
}

// ---------- Users (one per person, plus staff and guards) ----------
const byPerson = new Map();
for (const o of OCC) { if (!byPerson.has(o.person)) byPerson.set(o.person, []); byPerson.get(o.person).push(o); }
const USERS = PEOPLE.map(p => {
  const list = byPerson.get(p.id) || []; const first = list[0] || {};
  const r = rnd();
  return { id: p.id, name: p.name, contact: p.phone, role: first.rel === 'Owner' ? 'Owner' : first.rel === 'Tenant' ? 'Resident' : 'Sub-tenant', tamans: [...new Set(list.map(o => o.taman))], units: list.map(o => o.unit), status: first.status === 'Invite pending' ? 'Invited' : r < .9 ? 'Active' : r < .97 ? 'Invited' : 'Suspended', last: at(-int(0, 40), int(7, 22), int(0, 59)) };
});
const STAFF = [['Chong Mei Ling', 'Portfolio admin', 'all'], ['Faizal Rahim', 'Taman manager', 'dh'], ['Revathi Selvam', 'Taman manager', 'bi'], ['Lee Chee Keong', 'Taman manager', 'dj'], ['Siti Hajar Osman', 'Taman manager', 'mp'], ['Ong Boon Hock', 'Billing ops', 'all'], ['Priya Nair', 'Billing ops', 'all'], ['Arjun Pillai', 'Security lead', 'all']];
STAFF.forEach(([name, title, tm], i) => USERS.unshift({ id: 's' + i, name, contact: name.toLowerCase().split(' ')[0] + '@lestarifm.my', role: 'Management staff', title, tamans: tm === 'all' ? TAMANS.map(t => t.id) : [tm], units: [], status: 'Active', last: at(-int(0, 2), int(8, 18), int(0, 59)) }));

const GUARD_NAMES = ['Ram Bahadur Thapa', 'Bishnu Gurung', 'Mohd Rizal Ahmad', 'Suresh Kumar', 'Dil Bahadur Rai', 'Azman Hamid', 'Krishna Shrestha', 'Rosli Mat Isa', 'Hari Tamang', 'Kamal Magar', 'Zainal Abidin', 'Prem Limbu', 'Gopal Rai', 'Hamzah Yusof', 'Nabin Gurung', 'Ravi Kumar'];
const POSTS = { dh: ['Main gate', 'Back gate', 'Patrol', 'Main gate', 'Back gate'], bi: ['Main gate', 'Patrol', 'Main gate'], dj: ['Lobby A/B', 'Lobby C', 'Car park gate', 'Patrol', 'Lobby A/B'], mp: ['Main gate', 'Patrol', 'Main gate'] };
const GUARDS = [];
const BASE_ROTA = ['D', 'D', 'N', 'N', 'O', 'O', 'D'];
for (const t of TAMANS) POSTS[t.id].forEach((post, i) => {
  const g = { id: 'g' + GUARDS.length, name: GUARD_NAMES[GUARDS.length], taman: t.id, post, company: 'Perisai Kawalan Sdn Bhd', phone: phone() };
  g.rota = BASE_ROTA.map((_, d) => BASE_ROTA[(d + i * 2) % 7]);
  GUARDS.push(g);
  USERS.push({ id: g.id, name: g.name, contact: g.phone, role: 'Security', title: post, tamans: [t.id], units: [], status: 'Active', last: at(0, int(6, 10), int(0, 59)) });
});
const guardsOf = tid => GUARDS.filter(g => g.taman === tid);

const SHIFT_NOTES = [
  [0, 7, 52, 'dh', 'Lorry PJH 2231 for No. 18, Jalan Harmoni 5 arrived 7:40. Held at the gate until 9:00 (Saturday permit hours).'],
  [0, 6, 58, 'dj', 'Lift B2 back in service 6:30 am after overnight repair. Technician report left at management office.'],
  [-1, 22, 15, 'bi', 'Food delivery rider tried to tailgate a resident car at the main gate. Stopped and turned away.'],
  [-1, 19, 40, 'mp', 'Fogging team arrived 6:30 pm, Jalan Melati 1–2 done. Residents informed via announcement.'],
  [-1, 14, 5, 'dh', 'Back gate boom barrier slow to lift. Vendor notified, visit booked for Monday.'],
  [-2, 2, 20, 'dj', 'CCTV camera 4 (car park level 2) offline since 1:10 am. Logged as incident INC-0193.'],
  [-2, 23, 45, 'dh', 'Noise complaint, No. 30 Jalan Harmoni 7 (party). Spoke to host at 11:30 pm, resolved.'],
].map(([d, h, m, taman, text], i) => ({ id: 'n' + i, at: at(d, h, m), taman, guard: pick(guardsOf(taman)).name, text }));

// ---------- Visitors ----------
const VTYPES = ['Guest', 'Guest', 'Guest', 'Guest', 'Delivery', 'Delivery', 'Delivery', 'E-hailing', 'E-hailing', 'Contractor', 'Service'];
const COURIERS = ['Parcel courier', 'Food delivery rider', 'Grocery delivery', 'Furniture delivery', 'Document courier'];
const VISITORS = [];
for (let i = 0; i < 600; i++) {
  const d = -int(0, 9), today = d === 0;
  const u = pick(occupiedUnits), type = pick(VTYPES);
  const host = PERSON.get(u.tenant || u.owner).name;
  let status, h;
  if (today) { const r = rnd(); status = r < .45 ? 'Inside' : r < .72 ? 'Checked out' : r < .94 ? 'Expected' : 'Denied'; h = status === 'Expected' ? int(11, 20) : int(7, 10); }
  else { const r = rnd(); status = r < .8 ? 'Checked out' : r < .87 ? 'Denied' : r < .95 ? 'No-show' : 'Overstayed'; h = int(7, 21); }
  const m = int(0, 59), tIn = at(d, h, m);
  if (today && status !== 'Expected' && tIn > NOW) tIn.setHours(10, int(0, 40));
  const stay = type === 'Guest' ? int(60, 300) : type === 'Contractor' ? int(180, 480) : int(5, 25);
  const tm = TAMANS.find(t => t.id === u.taman);
  VISITORS.push({
    id: 'VIS-' + (20410 + i), taman: u.taman, unit: u.id, host, type,
    name: type === 'Delivery' ? pick(COURIERS) : type === 'E-hailing' ? 'E-hailing driver' : person(),
    plate: type === 'Delivery' && chance(.6) ? plate() : chance(.7) ? plate() : '',
    pax: type === 'Guest' ? int(1, 5) : 1,
    gate: tm.kind === 'Strata' ? pick(['Lobby A/B', 'Car park gate']) : tm.gates > 1 ? pick(['Main gate', 'Main gate', 'Back gate']) : 'Main gate',
    guard: pick(guardsOf(u.taman)).name, status,
    via: type === 'Guest' ? (chance(.85) ? 'Pre-registered QR' : 'Walk-in, host confirmed') : type === 'Delivery' ? 'Delivery code' : type === 'E-hailing' ? 'Ride code from resident' : 'Contractor pass',
    in: tIn, out: status === 'Checked out' || status === 'Overstayed' ? new Date(tIn.getTime() + stay * 6e4) : null,
    denyReason: status === 'Denied' ? pick(['Host did not confirm', 'Pass expired', 'Plate does not match pass', 'Contractor not on today’s permit list']) : '',
  });
}
VISITORS.sort((a, b) => b.in - a.in);

// ---------- Permits ----------
const CONTRACTORS = [
  ['Bina Jaya Renovation Sdn Bhd', '201801023456 (1281234-K)'], ['Kemas Interior Works', '201903011872 (1323455-A)'], ['Seri Teguh Builders Sdn Bhd', '201601040021 (1199870-P)'],
  ['Pantas Move & Logistics', '202001009934 (1360021-W)'], ['Hijau Landscape Services', '201701015560 (1229431-D)'], ['Aircond Pro Services', '202101032211 (1425780-M)'],
  ['Cemerlang Plumbing & Wiring', '201901044807 (1349025-T)'], ['Jati Kitchen Cabinet Works', '201501012345 (1139905-H)'], ['Megah Lorry Transport', '201401006678 (1081129-V)'], ['Rapi Roofing Specialist', '202201018890 (1460917-X)'],
];
const PERMIT_TYPES = [
  { id: 'reno', name: 'Renovation', icon: 'construction', deposit: { Landed: 1000, Strata: 2000 }, fee: 50, maxDays: 90, maxWorkers: 8, inspection: true, account: 0,
    docs: [['Renovation plan / drawings', true], ['Contractor SSM certificate', true], ['Public liability insurance', true], ['Worker IC / passports', true], ['Structural engineer letter', false]] },
  { id: 'entry', name: 'Contractor entry', icon: 'badge', deposit: { Landed: 300, Strata: 300 }, fee: 30, maxDays: 14, maxWorkers: 5, inspection: false, account: 0,
    docs: [['Contractor SSM certificate', true], ['Worker IC / passports', true], ['Scope of work letter', true], ['Public liability insurance', false]] },
  { id: 'move', name: 'Move-in / out', icon: 'local_shipping', deposit: { Landed: 300, Strata: 500 }, fee: 20, maxDays: 2, maxWorkers: 8, inspection: true, account: 0,
    docs: [['Tenancy agreement or SPA', true], ['Mover company details', true], ['Lift booking slip', false]] },
  { id: 'heavy', name: 'Heavy vehicle', icon: 'front_loader', deposit: { Landed: 500, Strata: 500 }, fee: 50, maxDays: 3, maxWorkers: 3, inspection: true, account: 0, maxTonnes: 10,
    docs: [['Vehicle registration (grant)', true], ['Driver licence', true], ['Route and timing plan', true]] },
];
const REFUND_ACCOUNTS = ['Lestari FM client account · Maybank ••• 2210', 'Desa Harmoni JMB · CIMB ••• 8841', 'Damai Jaya MC · Public Bank ••• 3307'];
const WORK_HOURS = Object.fromEntries(TAMANS.map(t => [t.id, { wkFrom: '09:00', wkTo: t.kind === 'Strata' ? '17:30' : '18:00', satFrom: '09:00', satTo: '13:00', sunOff: true, quiet: true }]));
const SCOPE_TEXT = {
  Renovation: ['Kitchen extension to the rear, 3.2 m × 2.4 m, new wet kitchen and roof', 'Re-tiling living and dining floor, hacking existing tiles', 'Replace roof tiles and install auto-gate', 'Two bathrooms renovated, full re-piping', 'Built-in wardrobes and kitchen cabinets'],
  'Contractor entry': ['Aircond servicing, 4 units', 'Water heater installation, 2 bathrooms', 'Window grilles and awning installation', 'Termite and pest control treatment', 'Solar panel inspection and cleaning'],
  'Move-in / out': ['Move-in, 3-tonne lorry, 6 movers', 'Move-out in 2 trips', 'Furniture delivery and assembly'],
  'Heavy vehicle': ['10-tonne lorry delivering sand and cement', 'Mobile crane lifting roof trusses', 'Concrete mixer, 2 trips'],
};
const CAT_TYPE = { Renovation: 'reno', 'Contractor entry': 'entry', 'Move-in / out': 'move', 'Heavy vehicle': 'heavy' };
const PSTATUS = ['Pending Review', 'Docs requested', 'Pending Deposit', 'Approved', 'Work In Progress', 'Inspection Scheduled', 'Completed', 'Deposit Refunded', 'Rejected'];
const BANKS = ['Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong', 'AmBank'];
const PERMITS = [];
const pcount = [7, 3, 5, 6, 9, 4, 3, 7, 2];
pcount.forEach((n, si) => {
  for (let k = 0; k < n; k++) {
    const status = PSTATUS[si];
    const cat = PERMITS.length === 0 ? 'Renovation' : pick(['Renovation', 'Renovation', 'Renovation', 'Contractor entry', 'Contractor entry', 'Move-in / out', 'Heavy vehicle']);
    const type = PERMIT_TYPES.find(t => t.name === cat || t.id === CAT_TYPE[cat]);
    const u = PERMITS.length === 0 ? aisyahUnits[0] : pick(UNITS);
    const tm = TAMANS.find(t => t.id === u.taman);
    const [contractor, ssm] = cat === 'Move-in / out' ? CONTRACTORS[3] : cat === 'Heavy vehicle' ? CONTRACTORS[8] : pick(CONTRACTORS);
    const workers = Math.min(type.maxWorkers, int(2, 7));
    const ago = { 'Pending Review': int(0, 3), 'Docs requested': int(3, 7), 'Pending Deposit': int(2, 6), Approved: int(4, 9), 'Work In Progress': int(8, 30), 'Inspection Scheduled': int(20, 45), Completed: int(30, 60), 'Deposit Refunded': int(40, 120), Rejected: int(5, 20) }[status];
    const submitted = at(-ago, int(8, 21), int(0, 59));
    const dur = Math.min(type.maxDays, cat === 'Renovation' ? int(14, 60) : int(1, 3));
    // Finished work ends in the past: inspection due (si 5), inspected and awaiting payout (6), refunded (7)
    const doneEnd = si === 5 ? at(-int(1, 3)) : si === 6 ? at(-int(6, 10)) : si === 7 ? at(-int(15, 60)) : null;
    const start = status === 'Work In Progress' ? at(-int(1, Math.max(1, ago - 5))) : doneEnd ? new Date(doneEnd.getTime() - dur * DAY) : at(int(2, 12));
    const end = status === 'Work In Progress' ? at(int(3, 30)) : doneEnd || new Date(start.getTime() + dur * DAY);
    if (doneEnd && submitted > start) submitted.setTime(start.getTime() - int(4, 9) * DAY);
    const dep = type.deposit[tm.kind];
    const docs = type.docs.filter(d => d[1]).map(([name]) => ({ name, file: name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '') + '.pdf', size: `${int(180, 4200)} KB`, state: si >= 2 && si !== 8 ? 'Verified' : 'Needs review' }));
    if (status === 'Docs requested') docs[docs.length - 1].state = 'Resubmit';
    const p = {
      id: 'PMT-' + (2600 + PERMITS.length * 7 + 41), taman: u.taman, unit: u.id, applicant: PERSON.get(u.owner).name, category: cat, type: type.id,
      contractor, ssm, contact: `${person()} · ${phone()}`, workers, plates: Array.from({ length: cat === 'Move-in / out' || cat === 'Heavy vehicle' ? 1 : int(1, 2) }, plate),
      scope: pick(SCOPE_TEXT[cat]), start, end, deposit: dep, fee: type.fee, status, submitted, docs,
      insurer: pick(['Etiqa General', 'Allianz General', 'Tokio Marine', 'AmGeneral']), policyNo: `PL-${int(100000, 999999)}`, cover: 1000000,
      bank: `${pick(BANKS)} ••• ${int(1000, 9999)}`, depositState: 'Not paid', stopped: false, refund: null, inspection: null,
    };
    if (status === 'Pending Deposit') p.depositState = chance(.6) ? 'Receipt uploaded' : 'Not paid';
    if (si >= 3 && si <= 7) p.depositState = 'Held';
    if (status === 'Inspection Scheduled') p.inspection = at(int(0, 4), pick([10, 11, 15]), 0);
    if (status === 'Completed' || status === 'Deposit Refunded') {
      const r = rnd();
      const deductions = r < .6 ? [] : [{ item: pick(tm.kind === 'Strata' ? ['Lift car padding torn, panel scratched', 'Corridor floor tiles chipped', 'Common area wall paint scuffed'] : ['Road shoulder damaged by lorry', 'Monsoon drain cover cracked', 'Debris left at road side']), amount: Math.min(pick([150, 250, 350, 480]), Math.round(dep * .6)) }]; // repairs never exceed the deposit
      const forfeit = status === 'Deposit Refunded' && k === 6;
      p.inspection = new Date(end.getTime() + 2 * DAY); p.inspection.setHours(10, 0, 0, 0);
      p.refund = forfeit ? { decision: 'Forfeited', deductions: [], amount: 0, reason: 'Works abandoned; site left unsafe for 3 weeks' } : { decision: deductions.length ? 'Partial refund' : 'Full refund', deductions, amount: dep - deductions.reduce((s, d) => s + d.amount, 0) };
      p.refund.decided = new Date(p.inspection.getTime() + DAY);
      if (status === 'Deposit Refunded') { p.refund.paid = new Date(p.inspection.getTime() + 4 * DAY); p.refund.ref = `IBG ${int(10000000, 99999999)}`; p.depositState = forfeit ? 'Forfeited' : 'Refunded'; }
    }
    if (status === 'Rejected') p.remarks = 'Structural change to party wall needs an engineer’s letter. Resubmit with the letter attached.';
    PERMITS.push(p);
  }
});
PERMITS.sort((a, b) => b.submitted - a.submitted);
// Inspection checklist items, recorded before work starts and after it ends
const CHECKLIST = {
  Landed: ['Road and road shoulder', 'Monsoon drain and covers', 'Neighbouring walls and fences', 'Street lights and signage', 'Debris and waste removed', 'Guardhouse and boom gate'],
  Strata: ['Lift car padding and doors', 'Lift lobby and corridor floors', 'Common area walls and paint', 'Fire hose reel and extinguishers', 'Debris and waste removed', 'Loading bay and car park'],
};
const PRE_NOTES = ['Existing hairline crack near drain cover (photo 3)', 'Old scuff on lobby wall, left side', 'Street light post already leaning'];

// Contractors on site today (synced from guardhouse scans)
const ONSITE = [];
PERMITS.filter(p => p.status === 'Work In Progress').forEach((p, i) => {
  if (i % 4 === 3) return;
  const over = i === 1;
  ONSITE.push({ permit: p.id, taman: p.taman, in: at(0, i === 2 ? 8 : 9, int(0, 50)), onSite: over ? p.workers + 2 : int(1, p.workers), guard: pick(guardsOf(p.taman)).name, note: i === 4 ? 'Hacking noise reported by neighbour at 10:15 (weekend quiet hours)' : '' });
});

const BLACKLIST = [
  { id: 'BL-07', name: 'Kilat Renovation Works', ref: 'SSM 202001045512 (1371230-H)', reason: 'Abandoned job at No. 3, Jalan Harmoni 6. Deposit forfeited, debris left for 3 weeks.', scope: 'portfolio', by: 'Chong Mei Ling', at: at(-64) },
  { id: 'BL-06', name: 'Sinar Cahaya Electrical', ref: 'SSM 201801077120 (1290457-U)', reason: 'Tapped common-area power supply without approval.', scope: 'dj', by: 'Lee Chee Keong', at: at(-41) },
  { id: 'BL-05', name: 'Worker: passport ••• 7781 (Bangladesh)', ref: 'Kemas Interior Works', reason: 'Entered with another worker’s pass twice.', scope: 'dh', by: 'Faizal Rahim', at: at(-23) },
  { id: 'BL-04', name: 'Lorry WTK 8812', ref: 'Megah Lorry Transport', reason: 'Over 10 t entered without heavy-vehicle permit; cracked drain cover.', scope: 'bi', by: 'Revathi Selvam', at: at(-12) },
  { id: 'BL-03', name: 'Zam Zam Movers', ref: 'SSM 202101003390 (1405552-W)', reason: 'Damaged lift car doors, refused to pay for repairs.', scope: 'portfolio', by: 'Chong Mei Ling', at: at(-120) },
];
const wip = PERMITS.filter(p => p.status === 'Work In Progress');
const NOTICES = [
  { id: 'NTC-031', kind: 'Violation notice', permit: wip[4]?.id, reason: 'Hacking during weekend quiet hours (Sat 10:15).', at: at(0, 10, 30), status: 'Active' },
  { id: 'NTC-030', kind: 'Violation notice', permit: wip[1]?.id, reason: 'More workers on site than the permit allows.', at: at(0, 9, 55), status: 'Active' },
  { id: 'NTC-029', kind: 'Stop-work order', permit: wip[6]?.id, reason: 'Unapproved structural change to party wall.', at: at(-3, 15, 10), status: 'Lifted' },
  { id: 'NTC-028', kind: 'Violation notice', permit: wip[2]?.id, reason: 'Debris left on road shoulder overnight.', at: at(-6, 18, 20), status: 'Acknowledged' },
  { id: 'NTC-027', kind: 'Violation notice', permit: wip[0]?.id, reason: 'Lorry parked across a resident’s driveway.', at: at(-11, 11, 5), status: 'Acknowledged' },
].filter(n => n.permit).map(n => ({ ...n, taman: PERMITS.find(p => p.id === n.permit).taman }));

// ---------- Billing ----------
const INVOICES = [];
let invN = 1;
const addInv = (u, type, desc, amount, issued, due, status, paid = 0) => {
  INVOICES.push({ id: `INV-${String(issued.getFullYear()).slice(2)}${pad(issued.getMonth() + 1)}-${String(invN++).padStart(5, '0')}`, taman: u.taman, unit: u.id, owner: u.owner, type, desc, amount, issued, due, status, paid: status === 'Paid' ? amount : paid, period: `${'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[issued.getMonth()]} ${issued.getFullYear()}` });
};
for (const u of UNITS) {
  const r = rnd();
  addInv(u, 'Maintenance & sinking fund', 'Maintenance & sinking fund (Sep)', u.fee, at(-32), at(-18), r < .9 ? 'Paid' : r < .96 ? 'Overdue' : 'Partially paid', Math.round(u.fee / 2));
  addInv(u, 'Maintenance & sinking fund', 'Maintenance & sinking fund (Oct)', u.fee, at(-2), at(12), u === aisyahUnits[0] ? 'Due' : chance(.41) ? 'Paid' : 'Due');
}
const EXTRAS = [['Access card replacement', 50], ['Remote gate fob', 80], ['Bulky waste collection', 60], ['Hall booking fee', 80], ['Car sticker (additional vehicle)', 30]];
for (let i = 0; i < 60; i++) { const u = pick(UNITS), [d, a] = pick(EXTRAS), back = int(0, 30); addInv(u, 'Extra charge', d, a, at(-back), at(-back + 14), back > 14 ? (chance(.8) ? 'Paid' : 'Overdue') : chance(.5) ? 'Paid' : 'Due'); }
const SCHEDULES = [
  ...TAMANS.map((t, i) => ({ id: 'SCH-0' + (i + 1), name: 'Maintenance & sinking fund', taman: t.id, target: 'All units', amount: t.kind === 'Strata' ? 'By unit size' : `RM ${t.fee}.00 / unit`, freq: 'Monthly, 1st', next: at(29), status: 'Active' })),
  { id: 'SCH-05', name: 'Fire insurance premium', taman: 'dj', target: 'All units', amount: 'RM 96.00 / unit', freq: 'Yearly, 1 Jan', next: new Date(2027, 0, 1), status: 'Active' },
  { id: 'SCH-06', name: 'Sinking fund top-up', taman: 'bi', target: 'All units', amount: 'RM 40.00 / unit', freq: 'Quarterly', next: new Date(2027, 0, 1), status: 'Paused' },
  { id: 'SCH-07', name: 'Guardhouse upgrade levy', taman: 'mp', target: 'Jalan Melati 1–2', amount: 'RM 25.00 / unit', freq: 'Monthly, 1st', next: at(29), status: 'Active' },
];

const CHANNELS = ['FPX', 'FPX', 'FPX', 'Card', 'DuitNow QR', 'Bank transfer'];
const PAYMENTS = [];
const octPaid = INVOICES.filter(i => i.period === 'Oct 2026' && i.status === 'Paid');
const octDue = INVOICES.filter(i => i.period === 'Oct 2026' && i.status === 'Due');
for (let i = 0; i < 44; i++) { const inv = octPaid[i * 7]; const ch = pick(CHANNELS); PAYMENTS.push({ id: 'PAY-' + (88120 + i), at: at(-int(0, 2), int(7, 23), int(0, 59)), payer: PERSON.get(inv.owner).name, unit: inv.unit, taman: inv.taman, channel: ch, ref: `${ch === 'Bank transfer' ? 'IBG' : ch === 'DuitNow QR' ? 'DNQR' : ch === 'Card' ? 'CARD' : 'FPX'} ${int(10000000, 99999999)}`, amount: inv.amount, status: 'Matched', invoice: inv.id, kind: 'Invoice' }); }
for (let i = 0; i < 16; i++) { const inv = octDue[i * 9]; const withRef = i < 6; PAYMENTS.push({ id: 'PAY-' + (88200 + i), at: at(-int(0, 2), int(7, 23), int(0, 59)), payer: PERSON.get(inv.owner).name, unit: inv.unit, taman: inv.taman, channel: 'FPX', ref: withRef ? `FPX ${int(10000000, 99999999)} ${inv.id}` : `FPX ${int(10000000, 99999999)}`, amount: inv.amount, status: 'Unmatched', invoice: null, hint: inv.id, kind: 'Invoice' }); }
for (let i = 0; i < 7; i++) { const inv = octDue[i * 13 + 5]; PAYMENTS.push({ id: 'PAY-' + (88230 + i), at: at(-int(0, 3), int(9, 20), int(0, 59)), payer: PERSON.get(inv.owner).name, unit: inv.unit, taman: inv.taman, channel: 'Bank transfer', ref: `Receipt · ${pick(BANKS)} ${int(100000, 999999)}`, amount: inv.amount, status: 'Receipt to verify', invoice: null, hint: inv.id, kind: 'Invoice', receipt: true }); }
PERMITS.filter(p => p.depositState === 'Receipt uploaded').forEach((p, i) => PAYMENTS.push({ id: 'PAY-' + (88250 + i), at: at(-int(0, 2), int(9, 20), int(0, 59)), payer: p.applicant, unit: p.unit, taman: p.taman, channel: 'Bank transfer', ref: `Receipt · ${pick(BANKS)} ${int(100000, 999999)}`, amount: p.deposit + p.fee, status: 'Receipt to verify', invoice: null, permit: p.id, kind: 'Permit deposit', receipt: true }));
for (let i = 0; i < 5; i++) { const inv = octDue[i * 17 + 3]; PAYMENTS.push({ id: 'PAY-' + (88270 + i), at: at(-int(0, 3), int(7, 23), int(0, 59)), payer: PERSON.get(inv.owner).name, unit: inv.unit, taman: inv.taman, channel: pick(['FPX', 'Card']), ref: `FPX ${int(10000000, 99999999)}`, amount: inv.amount, status: 'Failed', invoice: null, kind: 'Invoice', failReason: pick(['Bank declined', 'Session timed out', 'Insufficient funds']) }); }
PAYMENTS.sort((a, b) => b.at - a.at);

// ---------- Facilities ----------
const FACILITIES = [
  ['dh', 'Multipurpose hall', 'Hall', 120, 80, 200, true], ['dh', 'Badminton court A', 'Court', 4, 10, 0, false], ['dh', 'Badminton court B', 'Court', 4, 10, 0, false], ['dh', 'BBQ pit', 'BBQ', 20, 30, 50, false], ['dh', 'Futsal court', 'Court', 12, 40, 0, false],
  ['bi', 'Community hall', 'Hall', 80, 60, 150, true], ['bi', 'Tennis court', 'Court', 4, 15, 0, false], ['bi', 'BBQ area', 'BBQ', 15, 25, 50, false],
  ['dj', 'Function room', 'Hall', 60, 100, 300, true], ['dj', 'Squash court', 'Court', 2, 8, 0, false], ['dj', 'BBQ deck', 'BBQ', 20, 40, 100, true], ['dj', 'Swimming pool', 'Pool', 40, 0, 0, false], ['dj', 'Gym', 'Gym', 15, 0, 0, false],
  ['mp', 'Dewan serbaguna', 'Hall', 100, 50, 150, true], ['mp', 'Badminton court', 'Court', 4, 8, 0, false],
].map(([taman, name, kind, cap, rate, dep, approval], i) => ({ id: 'F' + (i + 1), taman, name, kind, cap, rate, deposit: dep, approval, status: name === 'Futsal court' ? 'Closed for repair' : 'Open', open: kind === 'Pool' ? '07:00–21:00' : kind === 'Gym' ? '06:00–23:00' : '08:00–23:00',
  rules: { maxHours: kind === 'Hall' ? 6 : 2, perMonth: kind === 'Hall' ? 2 : 8, advance: kind === 'Hall' ? 60 : 14, cutoff: kind === 'Hall' ? 72 : 6, blackout: kind === 'Hall' ? [{ d: '2026-10-18', why: 'Taman AGM' }, { d: '2026-10-24', why: 'Hall repainting' }] : [] } }));
const BOOKABLE = FACILITIES.filter(f => f.kind !== 'Pool' && f.kind !== 'Gym');
const BOOKINGS = [];
for (let i = 0; i < 110; i++) {
  const f = pick(BOOKABLE), d = int(-9, 12), h = f.kind === 'Hall' ? pick([10, 14, 18]) : int(8, 21), len = f.kind === 'Hall' ? pick([4, 5]) : f.kind === 'BBQ' ? 3 : pick([1, 1, 2]);
  const u = pick(occupiedUnits.filter(x => x.taman === f.taman).slice(0, 200)); const s = at(d, h, 0);
  if (BOOKINGS.some(b => b.facility === f.id && Math.abs(b.start - s) < Math.max(len, b.hours) * 36e5)) continue;
  const past = s < NOW;
  BOOKINGS.push({ id: 'BK-' + (5100 + i), facility: f.id, taman: f.taman, unit: u.id, by: PERSON.get(u.tenant || u.owner).name, start: s, hours: Math.min(len, f.rules.maxHours), purpose: f.kind === 'Hall' ? pick(['Birthday party', 'Aqiqah kenduri', 'Deepavali open house', 'Tuition class', 'Residents’ association meeting', 'Wedding reception']) : f.kind === 'BBQ' ? 'Family BBQ' : 'Game',
    status: past ? (chance(.9) ? 'Completed' : 'Cancelled') : f.approval && chance(.45) ? 'Pending approval' : chance(.08) ? 'Cancelled' : 'Confirmed', fee: f.rate * (f.kind === 'Court' ? len : 1), deposit: f.deposit });
}
BOOKINGS.sort((a, b) => a.start - b.start);

// ---------- Marketplace ----------
const LISTING_SEED = [
  ['Nasi lemak bungkus, Sat & Sun 7–10 am', 'Food & drinks', 6], ['Kuih raya pre-order (kuih bangkit, tart nenas)', 'Food & drinks', 45], ['Home-cooked Indian lunch packs, weekdays', 'Food & drinks', 12], ['Durian D24 pre-order, delivered to your gate', 'Food & drinks', 35],
  ['Aircond servicing, RM 60 per unit', 'Home services', 60], ['Laundry pick-up and delivery', 'Home services', 15], ['Part-time cleaner, 4 hours', 'Home services', 80], ['Plumber, same-day for leaks', 'Home services', 50], ['Pet grooming at your door', 'Home services', 70],
  ['Kids bicycle 16 inch, barely used', 'Pre-loved', 90], ['Baby cot with mattress, like new', 'Pre-loved', 150], ['Rattan sofa set, 3+1+1', 'Pre-loved', 420], ['Study table and chair', 'Pre-loved', 120], ['Car seat for toddler', 'Pre-loved', 180],
  ['Maths tuition, Form 4–5 (SPM)', 'Tuition & classes', 50], ['Piano lessons for kids, ABRSM', 'Tuition & classes', 120], ['Quran reading class, weekends', 'Tuition & classes', 80], ['Mandarin conversation class', 'Tuition & classes', 60],
  ['Room for rent, near MRT, female only', 'Rooms & property', 650], ['Car park bay for rent, Block B', 'Rooms & property', 120], ['iPhone 14, unlocked (cash only, no meet-up)', 'Pre-loved', 900], ['Selling “guaranteed” forex signals', 'Home services', 300],
];
const LISTINGS = [];
for (let i = 0; i < 44; i++) {
  const [title, cat, price] = LISTING_SEED[i % LISTING_SEED.length]; const u = pick(occupiedUnits); const r = rnd();
  const flagged = /guaranteed|cash only/.test(title);
  LISTINGS.push({ id: 'MKT-' + (3300 + i), title, cat, price: price + (i >= LISTING_SEED.length ? int(-5, 20) : 0), taman: u.taman, unit: u.id, seller: PERSON.get(u.tenant || u.owner).name, posted: at(-int(0, 40), int(7, 22), int(0, 59)),
    status: flagged ? 'Live' : r < .2 ? 'Pending approval' : r < .82 ? 'Live' : r < .9 ? 'Sold' : r < .96 ? 'Expired' : 'Taken down', reports: flagged ? int(2, 5) : chance(.06) ? 1 : 0, desc: 'Message me through Tamanly chat. Pick-up at my unit or delivered within the taman.' });
}
const REPORTS = LISTINGS.filter(l => l.reports).flatMap((l, i) => Array.from({ length: Math.min(l.reports, 2) }, (_, k) => ({ id: 'RPT-' + (410 + i * 2 + k), listing: l.id, taman: l.taman, reason: /forex/.test(l.title) ? 'Scam or misleading' : /iPhone/.test(l.title) ? 'Suspicious seller' : pick(['Wrong category', 'Offensive content', 'Prohibited item']), by: person(), at: at(-int(0, 6), int(8, 22), int(0, 59)), status: k === 0 && i < 3 ? 'Open' : chance(.5) ? 'Open' : 'Dismissed', note: '' })));
const MARKET_CATS = [['Food & drinks', true, false], ['Home services', true, true], ['Pre-loved', true, false], ['Tuition & classes', true, false], ['Rooms & property', true, true], ['Vehicles', false, true]].map(([name, on, approval]) => ({ name, on, approval }));
const MARKET_POLICY = { expiry: 30, perUnit: 5, autoHide: 3, subtenants: false, prohibited: 'Alcohol, tobacco and vapes\nWeapons and fireworks\nMedicine and supplements making health claims\nInvestment schemes and forex signals\nLive animals for sale' };

// ---------- Communications ----------
const ANNOUNCEMENTS = [
  ['Water disruption · Sat 9 am–2 pm', 'dh', 'Jalan Harmoni 1–4', 'Sent', 0, 'Air Selangor is replacing a pipe on Jalan Harmoni 2. Store water before 9 am. Tankers at the guardhouse from 10 am.'],
  ['Gotong-royong this Sunday, 8 am', 'dh', 'Taman-wide', 'Sent', -2, 'Meet at the playground. Gloves, bags and breakfast provided by the residents’ association.'],
  ['Fogging on Thursday evening', 'mp', 'Jalan Melati 1–2', 'Sent', -3, 'Close windows and keep pets indoors from 6:30 pm. The fogging team comes from Majlis Bandaraya Klang.'],
  ['Lift B2 maintenance, Mon 5 Oct', 'dj', 'Block B', 'Scheduled', 1, 'Lift B2 will be out of service 10 am–4 pm. Please use lift B1 or the service lift.'],
  ['Main gate boom barrier upgrade', 'bi', 'Taman-wide', 'Scheduled', 4, 'New barrier and ANPR camera at the main gate. Expect 10-minute waits on Wednesday morning.'],
  ['AGM notice: Sunday 18 October', 'dh', 'Owners only', 'Sent', -6, 'Annual general meeting at the multipurpose hall, 10 am. Proxy forms in the app under Documents.'],
  ['New badminton court booking rules', 'dh', 'Taman-wide', 'Sent', -10, 'From 1 October each unit can book up to 8 hours a month. Peak hours are 7–10 pm.'],
  ['Pool closed for cleaning, Tue', 'dj', 'Taman-wide', 'Draft', 3, 'The pool will be closed on Tuesday for quarterly cleaning and chemical balancing.'],
  ['Deepavali open house at Dewan', 'mp', 'Taman-wide', 'Draft', 30, 'Everyone is welcome. Bring a dish to share; the residents’ committee is providing drinks.'],
  ['Maintenance fees for October are out', 'bi', 'Taman-wide', 'Sent', -2, 'Pay by 15 October in the app (FPX, cards or DuitNow QR) to avoid late charges.'],
  ['Smoke detector check, Block A', 'dj', 'Block A', 'Sent', -8, 'Bomba-certified team will test smoke detectors on floors 1–18 between 9 am and 5 pm.'],
  ['Stray dog sightings near the park', 'bi', 'Jalan BI 4–6', 'Sent', -12, 'MPSJ has been informed. Please do not feed stray dogs inside the taman.'],
].map(([title, taman, audience, status, d, body], i) => ({ id: 'ANN-' + (240 + i), title, taman, audience, status, at: at(d, 9, 0), body, channels: ['In-app', 'Push', ...(i % 3 === 0 ? ['Email'] : [])], reads: status === 'Sent' ? int(48, 91) : null }));
const BROADCASTS = [
  ['Maintenance fee reminder (Oct)', 'SMS', 'dh', 'Units with unpaid Oct fees', 238, 'Sent', -1], ['Water disruption alert', 'Push', 'dh', 'Jalan Harmoni 1–4', 198, 'Sent', -1], ['Overdue notice (Sep)', 'Email', 'bi', 'Units with overdue Sep fees', 21, 'Sent', -3],
  ['AGM proxy form', 'Email', 'dh', 'Owners', 412, 'Sent', -6], ['Lift B2 maintenance', 'Push', 'dj', 'Block B', 180, 'Scheduled', 1], ['Fogging tonight', 'SMS', 'mp', 'Jalan Melati 1–2', 96, 'Sent', -3],
  ['Gate barrier works', 'In-app', 'bi', 'All residents', 268, 'Scheduled', 4], ['Overdue notice (Sep)', 'SMS', 'dj', 'Units with overdue Sep fees', 34, 'Partly failed', -3], ['Smoke detector check', 'Push', 'dj', 'Block A', 180, 'Sent', -8],
].map(([title, channel, taman, audience, sent, status, d], i) => ({ id: 'BRC-' + (120 + i), title, channel, taman, audience, sent, status, at: at(d, 10, 0), delivered: status === 'Scheduled' ? null : status === 'Partly failed' ? 81 : int(94, 99) }));
const TEMPLATES = [
  ['Maintenance fee reminder', 'Billing', 'Hi {name}, your maintenance fee of {amount} for {unit} is due on {due_date}. Pay in the Tamanly app to avoid late charges.', 'Hai {name}, yuran penyelenggaraan {amount} untuk {unit} perlu dibayar sebelum {due_date}. Bayar dalam aplikasi Tamanly untuk mengelakkan caj lewat.'],
  ['Overdue notice', 'Billing', 'Hi {name}, {amount} for {unit} is now overdue. A late charge applies after {grace_end}.', 'Hai {name}, bayaran {amount} untuk {unit} telah tertunggak. Caj lewat dikenakan selepas {grace_end}.'],
  ['Water disruption', 'Maintenance', 'Water supply to {area} will be cut on {date}, {time}. Please store water in advance.', 'Bekalan air ke {area} akan terputus pada {date}, {time}. Sila simpan air lebih awal.'],
  ['Fogging schedule', 'Maintenance', 'Fogging in {area} on {date} from {time}. Close windows and keep pets indoors.', 'Semburan kabus di {area} pada {date} mulai {time}. Tutup tingkap dan bawa haiwan peliharaan ke dalam.'],
  ['Permit approved', 'Permits', 'Your {permit_type} permit {permit_id} for {unit} is approved. Share the contractor pass from the app.', 'Permit {permit_type} {permit_id} untuk {unit} telah diluluskan. Kongsi pas kontraktor dari aplikasi.'],
  ['Deposit refund processed', 'Permits', 'We have refunded {amount} for permit {permit_id} to {bank}. It may take 1–3 working days.', 'Kami telah memulangkan {amount} untuk permit {permit_id} ke {bank}. Ia mungkin mengambil 1–3 hari bekerja.'],
  ['Facility booking confirmed', 'Facilities', '{facility} is booked for {date}, {time}. Show your booking QR at the guardhouse.', '{facility} telah ditempah untuk {date}, {time}. Tunjukkan QR tempahan di pondok pengawal.'],
  ['Gate system maintenance', 'Security', 'The {gate} will run on manual check from {time} on {date}. Have your IC or visitor pass ready.', '{gate} akan menggunakan semakan manual mulai {time} pada {date}. Sediakan IC atau pas pelawat anda.'],
  ['AGM notice', 'Events', 'The annual general meeting is on {date} at {venue}, {time}. Proxy forms are in the app.', 'Mesyuarat agung tahunan pada {date} di {venue}, {time}. Borang proksi ada dalam aplikasi.'],
].map(([name, cat, en, bm], i) => ({ id: 'TPL-' + (10 + i), name, cat, en, bm, used: int(2, 48), updated: at(-int(3, 120)) }));

// ---------- Security incidents ----------
const INCIDENTS = [
  ['Back gate boom barrier slow to lift', 'Gate malfunction', 'Medium', 'Open', 'dh', -1, 'Back gate'],
  ['CCTV camera 4 offline (car park L2)', 'Equipment', 'Medium', 'Investigating', 'dj', -2, 'Car park level 2'],
  ['Tailgating attempt by delivery rider', 'Access breach', 'Low', 'Closed', 'bi', -1, 'Main gate'],
  ['Car side mirror damaged in visitor bay', 'Vehicle damage', 'Low', 'Open', 'dj', -3, 'Visitor parking'],
  ['Unknown person checking car doors', 'Suspicious person', 'High', 'Investigating', 'mp', -4, 'Jalan Melati 3'],
  ['Noise complaint, party past midnight', 'Noise', 'Low', 'Closed', 'dh', -2, 'No. 30, Jalan Harmoni 7'],
  ['Fire alarm triggered, Block C level 9', 'Fire alarm', 'High', 'Closed', 'dj', -9, 'Block C, level 9'],
  ['Motorcycle stolen from porch', 'Theft', 'High', 'Open', 'bi', -6, 'No. 19, Jalan BI 5'],
  ['Water leak in lift lobby', 'Facilities', 'Medium', 'Closed', 'dj', -12, 'Block A lobby'],
  ['Stray dogs chasing children', 'Safety', 'Medium', 'Investigating', 'bi', -5, 'Playground'],
].map(([title, cat, sev, status, taman, d, where], i) => ({ id: 'INC-0' + (199 - i), title, cat, sev, status, taman, at: at(d, int(0, 23), int(0, 59)), where, by: pick(guardsOf(taman)).name, updates: [] }));

// ---------- Settings, policies, roles ----------
const QR_POLICY = { validity: '4', maxGuests: 4, perUnit: 10, overnight: true, nights: 3, delivery: '30', plate: true, ic: false, sameDay: false };
const LATE_FEES = { grace: 7, kind: 'percent', rate: 10, flat: 10, cap: 100, types: ['Maintenance & sinking fund'], reminders: [['7 days before due', true, true, false], ['On the due date', true, true, false], ['3 days after due', true, true, true], ['14 days after due', true, true, true]] };
const INTEGRATIONS = [
  { id: 'pay', name: 'Payment gateway', icon: 'credit_card', desc: 'FPX online banking, cards and DuitNow QR for bills and permit deposits.', status: 'Connected', detail: 'Merchant ID TML-LESTARI-01 · settles daily to Maybank ••• 2210' },
  { id: 'sms', name: 'SMS gateway', icon: 'sms', desc: 'Reminders, OTP and broadcast SMS to residents.', status: 'Connected', detail: 'Sender ID TAMANLY · 4,210 credits left' },
  { id: 'mail', name: 'Email (SMTP)', icon: 'mail', desc: 'Statements, receipts and announcements by email.', status: 'Connected', detail: 'notices@lestarifm.my · SPF and DKIM verified' },
  { id: 'gate', name: 'Gate controller webhook', icon: 'sensor_door', desc: 'Sends admit / deny events to boom-gate controllers. Firmware stays with the gate vendor.', status: 'Not set up', detail: 'No endpoint configured' },
];
const BRANDING = Object.fromEntries(TAMANS.map(t => [t.id, { primary: '#3D2B6B', accent: '#E87A6B', logo: null }]));
const SOS = Object.fromEntries(TAMANS.map(t => [t.id, [['Guardhouse', t.phone.replace(/\d{4}$/, '9911')], ['Management office', t.phone], ['Police (PDRM)', '999'], ['Fire and rescue (Bomba)', '994']]]));
const ROLES = ['Portfolio admin', 'Taman manager', 'Billing ops', 'Security lead', 'Guard', 'Owner', 'Resident', 'Sub-tenant'];
const MODULES = ['Properties & units', 'Users & roles', 'Visitor registry', 'QR pass policy', 'Guard roster & incidents', 'Permit review', 'Deposits & refunds', 'Contractor enforcement', 'Invoices & reconciliation', 'Facilities', 'Marketplace moderation', 'Communications', 'Analytics', 'Settings & audit log'];
const LEVELS = ['None', 'View', 'Edit', 'Full'];
const PERM_DEFAULT = {
  'Portfolio admin': [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  'Taman manager': [3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 3, 3, 1, 1],
  'Billing ops': [1, 0, 0, 0, 0, 1, 3, 0, 3, 1, 0, 1, 1, 0],
  'Security lead': [1, 0, 3, 2, 3, 1, 0, 2, 0, 1, 0, 1, 1, 0],
  Guard: [0, 0, 2, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  Owner: [1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0],
  Resident: [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  'Sub-tenant': [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
};
const PERM_OVERRIDE = { bi: { 'Guard|Permit review': 2 } };

const AUDIT = [];
const AUDIT_SEED = [['Approved permit', 'permits'], ['Verified deposit receipt', 'permits'], ['Matched payment', 'billing'], ['Created invoice batch', 'billing'], ['Updated QR pass policy', 'security'], ['Changed user role', 'access'], ['Took down listing', 'marketplace'], ['Published announcement', 'comms'], ['Approved booking', 'facilities'], ['Issued violation notice', 'permits'], ['Updated work hours', 'permits'], ['Signed in', 'access'], ['Exported statement (CSV)', 'billing']];
for (let i = 0; i < 90; i++) {
  const [action, area] = pick(AUDIT_SEED), s = pick(STAFF), t = s[2] === 'all' ? pick(TAMANS).id : s[2];
  AUDIT.push({ id: 'AUD-' + (90000 - i), at: at(-Math.floor(i / 9), int(8, 19), int(0, 59)), actor: s[0], action, area, taman: t,
    target: area === 'permits' ? pick(PERMITS).id : area === 'billing' ? (action.includes('batch') ? 'Oct 2026 · 412 invoices' : 'PAY-' + int(88000, 88300)) : area === 'marketplace' ? pick(LISTINGS).id : area === 'comms' ? pick(ANNOUNCEMENTS).title : area === 'facilities' ? 'BK-' + int(5100, 5200) : area === 'access' ? (action === 'Signed in' ? '—' : pick(USERS).name) : 'Policy',
    ip: `175.143.${int(1, 254)}.${int(1, 254)}` });
}
AUDIT.sort((a, b) => b.at - a.at);

// Events seeded for "today" can land after NOW; move those back a day so nothing in the past reads "in 5 h"
const past = d => (d > NOW ? new Date(d.getTime() - DAY) : d);
PAYMENTS.forEach(p => { p.at = past(p.at); }); PAYMENTS.sort((a, b) => b.at - a.at);
LISTINGS.forEach(l => { l.posted = past(l.posted); });
REPORTS.forEach(r => { r.at = past(r.at); });
USERS.forEach(u => { u.last = past(u.last); });
AUDIT.forEach(a => { a.at = past(a.at); }); AUDIT.sort((a, b) => b.at - a.at);
