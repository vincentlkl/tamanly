'use strict';
// Formatting and lookup helpers shared by the admin console (app.js) and the guard console (security/guard.js).
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
