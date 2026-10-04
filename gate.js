'use strict';
// Password gate for the static preview pages (storyboard, admin, admin/mobile). Load it first in <head>.
// Deterrent only: the check runs in the browser, so anyone who reads this file or the page source can get past it.
// ponytail: cyrb53 hash keeps the password out of the source as plain text; swap for host-level auth (basic auth, Cloudflare Access) when this goes public.
(() => {
  const OK = '19bkcuugpgw', KEY = 'tm-gate';
  const hash = s => { let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0, c; i < s.length; i++) { c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36); };
  const store = { get() { try { return sessionStorage.getItem(KEY); } catch { return null; } }, set(v) { try { sessionStorage.setItem(KEY, v); } catch { /* blocked storage: asks again on the next page */ } } };
  if (store.get() === OK) return; // same tab, same origin: the admin phone frames in mobile.html pass through here too

  const root = document.documentElement, logo = new URL('logo.jpg', document.currentScript.src).href;
  root.dataset.locked = '';
  const css = document.createElement('style');
  css.textContent = `
    html[data-locked] { overflow: hidden; background: #3D2B6B; }
    html[data-locked] body { background: #3D2B6B !important; }
    html[data-locked] body > :not(#tm-gate) { display: none !important; }
    #tm-gate { margin: auto; width: min(400px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 28px; border: 0; border-radius: 28px; background: #fff; color: #1F1A2E; font: 400 15px/1.5 Inter, system-ui, sans-serif; box-shadow: 0 24px 64px rgba(20, 12, 40, .35); -webkit-font-smoothing: antialiased; }
    #tm-gate::backdrop { background: #3D2B6B; }
    #tm-gate * { box-sizing: border-box; }
    #tm-gate .tg-brand { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 500; letter-spacing: -0.02em; color: #3D2B6B; }
    /* ponytail: crops the mark out of logo.jpg; swap for the real SVG mark when it exists */
    #tm-gate .tg-mark { width: 44px; height: 44px; border-radius: 14px; flex: none; background: #FBF7EF url(${logo}) -5px -15px / 140px auto no-repeat; }
    #tm-gate h2 { margin: 24px 0 0; font-size: 22px; line-height: 28px; font-weight: 600; letter-spacing: -0.01em; }
    #tm-gate p { margin: 6px 0 0; color: #6E6880; }
    #tm-gate label { display: block; margin: 24px 0 6px; font-size: 13px; font-weight: 500; color: #1F1A2E; }
    #tm-gate .tg-field { position: relative; }
    #tm-gate input { width: 100%; height: 48px; padding: 0 64px 0 14px; border: 0; border-radius: 14px; background: #fff; color: inherit; font: inherit; box-shadow: inset 0 0 0 1px #E2DACB; caret-color: #3D2B6B; }
    #tm-gate input:hover { box-shadow: inset 0 0 0 1px #CFC6B6; }
    #tm-gate input:focus { outline: none; box-shadow: inset 0 0 0 2px #3D2B6B; }
    #tm-gate input[aria-invalid="true"] { box-shadow: inset 0 0 0 2px #D64545; }
    #tm-gate .tg-peek { position: absolute; top: 6px; right: 6px; height: 36px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: #3D2B6B; font: 600 13px Inter, system-ui, sans-serif; cursor: pointer; }
    #tm-gate .tg-peek:hover { background: #ECE9F3; }
    #tm-gate #tg-err { min-height: 0; margin: 8px 0 0; font-size: 13px; color: #B33232; }
    #tm-gate #tg-err:empty { display: none; }
    #tm-gate .tg-go { width: 100%; height: 48px; margin-top: 20px; border: 0; border-radius: 999px; background: #3D2B6B; color: #fff; font: 600 15px Inter, system-ui, sans-serif; cursor: pointer; transition: background-color .15s, transform .1s; }
    #tm-gate .tg-go:hover { background: #2A1D4D; }
    #tm-gate .tg-go:active { transform: scale(.98); }
    #tm-gate :focus-visible { outline: 2px solid #3D2B6B; outline-offset: 2px; }
    #tm-gate .tg-shake { animation: tg-shake .32s cubic-bezier(.2, .8, .2, 1); }
    @keyframes tg-shake { 20% { transform: translateX(-8px); } 50% { transform: translateX(6px); } 80% { transform: translateX(-3px); } }
    @media (prefers-reduced-motion: reduce) { #tm-gate .tg-shake { animation: none; } }`;
  document.head.append(css);

  const build = () => {
    const dlg = document.createElement('dialog');
    dlg.id = 'tm-gate'; dlg.setAttribute('aria-labelledby', 'tm-gate-h'); dlg.setAttribute('aria-describedby', 'tm-gate-d');
    dlg.innerHTML = `<div class="tg-brand"><span class="tg-mark" role="img" aria-label="Tamanly logo"></span><span>Tamanly</span></div>
      <h2 id="tm-gate-h">Enter the password</h2>
      <p id="tm-gate-d">This design preview is private. Ask the project owner if you need access.</p>
      <form novalidate>
        <label for="tg-pw">Password</label>
        <div class="tg-field"><input id="tg-pw" type="password" autocomplete="current-password" autofocus aria-describedby="tg-err"><button type="button" class="tg-peek" aria-pressed="false">Show</button></div>
        <p id="tg-err" role="alert"></p>
        <button type="submit" class="tg-go">View preview</button>
      </form>`;
    document.body.append(dlg);
    const form = dlg.querySelector('form'), pw = dlg.querySelector('#tg-pw'), err = dlg.querySelector('#tg-err'), peek = dlg.querySelector('.tg-peek');
    // Keep the dashboard's own shortcuts (Ctrl/Cmd+K, "/") from firing while it is locked
    dlg.addEventListener('keydown', e => e.stopPropagation());
    dlg.addEventListener('cancel', e => e.preventDefault()); // Esc must not dismiss the lock
    peek.addEventListener('click', () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; peek.textContent = show ? 'Hide' : 'Show'; peek.setAttribute('aria-pressed', show); pw.focus(); });
    pw.addEventListener('input', () => { pw.removeAttribute('aria-invalid'); err.textContent = ''; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = pw.value.trim();
      if (v && hash(v) === OK) { store.set(OK); delete root.dataset.locked; dlg.close(); dlg.remove(); return; }
      pw.setAttribute('aria-invalid', 'true');
      err.textContent = v ? 'That password isn’t right. Check it and try again.' : 'Enter the password to continue.';
      form.classList.remove('tg-shake'); void form.offsetWidth; form.classList.add('tg-shake');
      pw.focus(); pw.select();
    });
    dlg.showModal();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', build) : build();
})();
