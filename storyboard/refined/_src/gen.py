import re
I={
'back':'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
'arrow':'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
'key':'<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
'house':'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
'door':'<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>',
'shield':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
'building':'<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
'msg':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
'timer':'<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
'check':'<path d="M20 6 9 17l-5-5"/>',
'checkc':'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
'pin':'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
'plus':'<path d="M5 12h14"/><path d="M12 5v14"/>',
'alert':'<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
'help':'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
'idcard':'<path d="M16 10h2M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>',
'down':'<path d="m6 9 6 6 6-6"/>',
'receipt':'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
'wallet':'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
'qr':'<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1"/>',
'court':'<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93c4.08 2.38 8.16 2.38 14.14 14.14"/><path d="M19.07 4.93c-4.08 2.38-8.16 8.16-14.14 14.14"/>',
'file':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
'store':'<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
'lock':'<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
'cal':'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
'send':'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
'info':'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
'ticket':'<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
}
def ic(n,s=20,c='currentColor',w=1.8): return f'<svg class="i" width="{s}" height="{s}" viewBox="0 0 24 24" style="color:{c};stroke-width:{w}">{I[n]}</svg>'
STATUS='''<div class="status"><span>9:41</span><span style="display:flex;gap:6px;align-items:center"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg><svg width="25" height="11" viewBox="0 0 25 11"><rect x=".5" y=".5" width="21" height="10" rx="3" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="18" height="7" rx="1.5" fill="currentColor"/></svg></span></div>'''
def page(body,cls='',h=844,extra=''):
  return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="tl.css"><style>body{{height:{h}px}}{extra}</style></head><body class="{cls}">{body}</body></html>'''
def stepsnav(title,step,label,pct,n,right=''):
  bars=''.join(f'<i class="{"on" if k<n else ""}"></i>' for k in range(3))
  return f'''{STATUS}<div class="band" style="padding-bottom:36px"><div class="nav"><div class="ib">{ic("back",20,"#fff")}</div><h2>{title}</h2><div style="width:40px;text-align:right;font:500 13px Inter;color:var(--lav)">{right}</div></div>
<div class="steps"><span>Step {step} of 3 · {label}</span><b>{pct}</b></div><div class="bar">{bars}</div></div>'''
S={}
# A1
S['A1']=page(f'''{STATUS}
<div style="display:flex;justify-content:flex-end;padding:8px 24px 0"><div style="display:flex;background:#fff;border:1px solid var(--hair);border-radius:999px;padding:3px"><span style="font:600 12px Inter;padding:6px 12px;border-radius:999px;background:var(--ind);color:#fff">EN</span><span style="font:600 12px Inter;padding:6px 12px;color:var(--mute)">BM</span></div></div>
<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:40px"><div style="width:52px;height:52px;border-radius:14px;background:#fff;border:1px solid var(--hair);overflow:hidden"><img src="assets/logo_mark.png" style="width:100%;height:100%;object-fit:contain"></div><span style="font:700 30px/1 Inter;letter-spacing:-.02em;color:var(--ind)">Tamanly</span></div>
<div style="margin:32px 24px 0;height:262px;border-radius:24px;overflow:hidden;box-shadow:0 1px 2px rgba(31,26,46,.06),0 8px 24px -12px rgba(42,29,77,.25)"><img src="assets/a1_taman.png" style="width:100%;height:100%;object-fit:cover"></div>
<div style="text-align:center;padding:0 32px;margin-top:32px"><h1 style="font-size:26px;line-height:32px">Your taman, all in one app</h1><p class="sub" style="font-size:15px;line-height:22px;margin-top:10px">Visitors, bills, permits and facilities for every property you own or live in.</p></div>
<div style="display:flex;justify-content:center;gap:6px;margin-top:24px"><i style="width:24px;height:6px;border-radius:6px;background:var(--ind)"></i><i style="width:6px;height:6px;border-radius:6px;background:#CBD5E1"></i><i style="width:6px;height:6px;border-radius:6px;background:#CBD5E1"></i></div>
<div style="position:absolute;left:24px;right:24px;bottom:40px"><div class="btn">Sign in {ic("arrow",18,"#fff",2.2)}</div><p style="text-align:center;margin-top:18px;font:400 14px Inter;color:var(--mute)">New here? Your management office will email you an invite.</p></div><div class="home"></div>''','light')
# A4
S['A4']=page(STATUS+'<div class="band" style="padding-bottom:36px"><div class="nav"><div class="ib">{ic("back",20,"#fff")}</div><h2>Link a property</h2><div style="width:40px"></div></div></div>'+f'''<div class="sheet" style="height:740px;margin-top:-24px">
<div class="sec">Find your taman</div><p class="sub" style="margin-top:4px">Search your taman and unit. Management approves the link.</p>
<div class="field" style="margin-top:14px">{ic("search",18,"#64748B")}<span style="flex:1;color:var(--mute)">Taman name</span></div>
<div class="field" style="margin-top:10px">No. 7, Jalan BI 2</div>
<label style="margin-top:14px">Note for management (optional)</label><div class="field" style="min-height:64px;align-items:flex-start">I rent this unit from the owner.</div>
<div class="card sel" style="margin-top:14px;display:flex;gap:12px;align-items:center"><div class="tile t-ind" style="width:40px;height:40px">{ic("search",18)}</div><div style="flex:1"><b style="font:600 15px Inter">Find my taman</b><p style="font:400 13px Inter;color:var(--mute);margin-top:3px">Management will approve your unit</p></div><div class="radio on"></div></div></div>
<div class="foot"><div class="btn">Send link request {ic("arrow",18,"#fff",2.2)}</div></div>''')
# A5
def prop(i,t,name,chips,on):
  return f'''<div class="card{' sel' if on else ''}" style="display:flex;gap:14px;align-items:center;margin-top:10px;padding:14px 16px"><div class="tile {t}">{ic(i,22)}</div><div style="flex:1;min-width:0"><div style="font:600 15px Inter;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{name}</div><div style="display:flex;gap:6px;margin-top:8px">{chips}</div></div>{'<div style="width:24px;height:24px;border-radius:999px;background:var(--ind);display:grid;place-items:center">'+ic("check",14,"#fff",3)+'</div>' if on else '<div class="radio"></div>'}</div>'''
S['A5']=page(f'''<img src="assets/h0_blur.png" style="position:absolute;top:0;left:0;width:390px"><div style="position:absolute;inset:0;background:rgba(31,26,46,.45)"></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:590px;background:#fff;border-radius:28px 28px 0 0;padding:10px 24px 0">
<div style="width:36px;height:5px;border-radius:5px;background:#CBD5E1;margin:0 auto 14px"></div>
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1 style="font-size:22px">Switch property</h1><p class="sub" style="margin-top:2px">You have 3 units across 2 tamans</p></div><div class="ib" style="background:var(--cream);border-color:var(--hair);color:var(--ink);width:36px;height:36px">{ic("x",18,"#1F1A2E")}</div></div>
<div class="over" style="margin-top:18px">{ic("pin",14)}Taman Desa Harmoni · Seri Kembangan</div>
{prop("house","t-coral","No. 12, Jalan Harmoni 3",'<span class="chip c-ind">Owner</span><span class="chip c-sage"><i style="width:6px;height:6px;border-radius:6px;background:#3E6B4B"></i>Lives here</span>',1)}
{prop("house","t-ind","No. 7, Jalan Harmoni 2",'<span class="chip c-lav">Owner</span><span class="chip c-yel">Rented · 1 sub-tenant</span>',0)}
<div class="over" style="margin-top:18px">{ic("building",14)}Taman Bukit Indah · Ampang</div>
{prop("building","t-yel","B-12-03, Residensi Bukit Indah",'<span class="chip c-lav">Owner</span><span class="chip c-coral">'+ic("alert",12,"#B4432F",2.2)+'RM 240 due</span>',0)}
<div style="position:absolute;left:24px;right:24px;bottom:30px"><div class="btn ghost">{ic("plus",18,"#3D2B6B",2.2)}Link another property</div></div></div><div class="home"></div>''')
# A6
def tog(on): return f'<div style="width:44px;height:26px;border-radius:999px;background:{"var(--ind)" if on else "#E2E8F0"};position:relative;flex:none"><i style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:20px;height:20px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)"></i></div>'
sc=[('receipt','t-ind','View bills &amp; receipts','Monthly maintenance bills and payment history','',1),('wallet','t-yel','Pay bills','Pay unit dues by FPX','',0),('qr','t-coral','Register visitors &amp; QR','Create visitor passes and entry codes','',1),('court','t-sage','Book facilities','Badminton courts, hall and BBQ pits','',1),('file','t-ind','Submit permits','Renovation, moving and heavy vehicles','<span class="chip c-yel">'+ic("lock",11,"#8A5E0E",2.2)+'Owner only</span>',0),('store','t-coral','Marketplace','Browse and post in the community market','',1)]
scs=''.join(f'''<div style="display:flex;gap:12px;align-items:center;padding:12px 0;{'border-top:1px solid var(--hair)' if k else ''}"><div class="tile {t}" style="width:38px;height:38px;border-radius:10px">{ic(i,19)}</div><div style="flex:1"><div style="display:flex;gap:6px;align-items:center;font:600 14px Inter">{n}{c}</div><div style="font:400 12px/16px Inter;color:var(--mute);margin-top:2px">{d}</div></div>{tog(on)}</div>''' for k,(i,t,n,d,c,on) in enumerate(sc))
S['A6']=page(f'''{STATUS}<div class="band" style="padding-bottom:36px"><div class="nav"><div class="ib">{ic("back",20,"#fff")}</div><h2>Invite sub-tenant</h2><div class="ib">{ic("help",20,"#fff")}</div></div><p style="text-align:center;font:400 13px Inter;color:var(--lav);margin-top:8px">Give limited, time-bound access to your unit</p></div>
<div class="sheet" style="margin-top:-24px;padding-bottom:170px">
<div class="card" style="display:flex;gap:14px;align-items:center;background:var(--cream);border-color:var(--hair)"><div class="tile t-yel">{ic("house",22)}</div><div style="flex:1"><div style="font:600 15px Inter">No. 7, Jalan Harmoni 2</div><div style="font:400 13px Inter;color:var(--mute);margin-top:3px">Taman Desa Harmoni · Seri Kembangan</div></div><span class="chip c-ind">Owner</span></div>
<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:24px"><div class="sec">Sub-tenant details</div><span style="font:500 12px Inter;color:var(--mute)">Step 1 of 2</span></div>
<label>Full name (as per NRIC / passport)</label><div class="field"><span style="flex:1">Tan Mei Ling</span>{ic("idcard",20,"#64748B")}</div>
<label>Email</label><div class="field">meiling.tan@gmail.com</div>
<label>Relationship / occupancy</label><div class="field" style="justify-content:space-between">Tenant (room rental){ic("down",16,"#64748B",2)}</div>
<div class="sec" style="margin-top:26px">Access scopes</div><p class="sub" style="margin-top:2px">Choose exactly what Mei Ling can do</p>
<div class="card" style="margin-top:12px;padding:4px 16px">{scs}</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:26px"><div><div class="sec">Access period</div><p class="sub" style="margin-top:2px">How long passes and unit access last</p></div><span class="chip c-sage">1 year</span></div>
<div style="display:flex;align-items:center;gap:10px;margin-top:12px"><div class="card" style="flex:1;text-align:center;padding:12px"><div class="over" style="justify-content:center;font-size:10px">Start date</div><div style="font:600 15px Inter;margin-top:4px">1 Nov 2026</div></div>{ic("arrow",18,"#64748B")}<div class="card" style="flex:1;text-align:center;padding:12px"><div class="over" style="justify-content:center;font-size:10px">End date</div><div style="font:600 15px Inter;margin-top:4px">31 Oct 2027</div></div></div>
<div style="margin-top:18px;border-radius:12px;background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 14px;display:flex;gap:10px;font:400 13px/18px Inter;color:#334155">{ic("info",18,"#9A6B12")}<span>You can change scopes or revoke access any time in unit settings. Guards are notified once she's verified.</span></div></div>
<div class="foot"><div class="btn">Send invite by email {ic("send",17,"#fff",2)}</div><p style="text-align:center;margin-top:12px;font:400 12px/16px Inter;color:var(--mute)">Mei Ling gets an email link to set a password and join. You can also share it on WhatsApp.</p></div>''',h=1460)
# A7
gr=[('View bills &amp; receipts','Monthly maintenance bills and payment history'),('Register visitors &amp; QR','Visitor passes and entry codes'),('Book facilities','Badminton courts, hall and BBQ pits'),('Marketplace','Browse and post in the community market')]
grs=''.join(f'<div style="display:flex;gap:12px;padding:10px 0">{ic("checkc",20,"#3E6B4B",2)}<div><div style="font:600 14px Inter">{n}</div><div style="font:400 12px/16px Inter;color:var(--mute);margin-top:2px">{d}</div></div></div>' for n,d in gr)
lk=''.join(f'<div style="display:flex;gap:12px;align-items:center;padding:10px 0;color:#94A3B8">{ic("lock",18,"#94A3B8")}<span style="flex:1;font:500 14px Inter">{n}</span><span style="font:500 11px Inter;background:var(--cream);padding:4px 8px;border-radius:999px">{c}</span></div>' for n,c in [('Pay bills','Not granted'),('Submit permits','Owner only')])
S['A7']=page(f'''{STATUS}<div style="padding:4px 24px 0;color:#fff"><div class="nav"><div class="ib">{ic("x",20,"#fff")}</div><div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 12px;font:600 13px Inter"><i style="width:7px;height:7px;border-radius:7px;background:var(--coral)"></i>Tamanly <span style="color:var(--lav);font-weight:500;font-size:11px;letter-spacing:.06em">INVITE</span></div><div class="ib">{ic("help",20,"#fff")}</div></div>
<div style="margin-top:14px;height:196px;border-radius:20px;overflow:hidden"><img src="assets/a7_invite.png" style="width:100%;height:100%;object-fit:cover;transform:scale(1.03)"></div></div>
<div class="sheet" style="margin-top:20px;padding-bottom:140px"><span class="chip c-coral" style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid var(--hair);padding:7px 12px;font-size:12px;color:var(--ind)">{ic("ticket",14,"#E87A6B",2)}Sub-tenant access pass</span>
<h1 style="margin-top:12px">You're invited, Mei Ling</h1>
<div class="card" style="display:flex;gap:14px;align-items:center;margin-top:16px"><div class="tile" style="background:var(--ind);color:#fff">{ic("building",22)}</div><div style="flex:1"><div style="font:400 12px Inter;color:var(--mute)">Invited by <b style="color:var(--ink);font-weight:600">Encik Hafiz (owner)</b></div><div style="font:600 15px Inter;color:var(--ind);margin-top:3px">No. 7, Jalan Harmoni 2</div><div style="display:flex;gap:4px;align-items:center;font:400 12px Inter;color:var(--mute);margin-top:3px">{ic("pin",13)}Taman Desa Harmoni</div></div><span class="chip c-lav" style="align-self:flex-start">Unit 7</span></div>
<div class="card" style="display:flex;gap:12px;align-items:center;margin-top:10px"><div class="tile t-ind" style="width:38px;height:38px;border-radius:10px">{ic("cal",19)}</div><div style="flex:1"><div class="over" style="font-size:10px">Access period</div><div style="font:600 14px Inter;margin-top:3px">1 Nov 2026 – 31 Oct 2027</div></div><span class="chip c-sage">1 year</span></div>
<div class="card" style="margin-top:10px;padding:16px 16px 6px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="sec">What you can do</div><p style="font:400 12px Inter;color:var(--mute);margin-top:2px">Set by the owner</p></div><span class="chip c-lav">4 granted · 2 locked</span></div><div style="height:1px;background:var(--hair);margin:12px 0 4px"></div>{grs}<div style="height:1px;background:var(--hair);margin:4px 0"></div>{lk}</div>
<div style="display:flex;gap:8px;justify-content:center;align-items:center;margin-top:16px;font:400 12px Inter;color:var(--mute)">{ic("shield",15,"#64748B")}Secured by Tamanly guardhouse &amp; management</div></div>
<div class="foot"><div class="btn">Accept &amp; continue {ic("arrow",18,"#fff",2.2)}</div><p style="text-align:center;margin-top:12px;font:600 14px Inter;color:#B4432F">Decline invite</p></div>''',h=1180)
# A2b / A2c / A8: invite and password screens
def form_page(title,sub,fields,cta,note='',h=700):
  return page(STATUS+f'''<div class="band" style="padding-bottom:36px"><div class="nav"><div class="ib">{ic("back",20,"#fff")}</div><h2>{title}</h2><div style="width:40px"></div></div></div>
<div class="sheet" style="height:{h}px;margin-top:-24px"><h1>{title}</h1><p class="sub">{sub}</p>{fields}</div>
<div class="foot"><div class="btn">{cta}</div>{note}</div>''')
pw=lambda l:f'<label style="margin-top:14px">{l}</label><div class="field" style="justify-content:space-between">••••••••</div>'
S['A2b']=form_page('Forgot password','Enter your email. If an account exists, we\'ve emailed a link to reset your password.','<label style="margin-top:14px">Email</label><div class="field">nurul@example.com</div><p class="sub" style="margin-top:14px">If an account exists, we\'ve emailed a link.</p>','Send reset link',h=560)
S['A2c']=form_page('Set a new password','Opened from the reset link in your email.',pw('New password')+pw('Confirm password')+'<p class="sub" style="margin-top:10px;color:#B4432F">Password must be at least 8 characters.</p>','Save new password',h=640)
S['A8']=form_page('Set your password','Your management office invited you. Choose a password to sign in.',pw('New password')+pw('Confirm password')+'<div style="margin-top:18px;border:1px dashed var(--hair);border-radius:12px;padding:12px 14px;font:500 14px Inter;color:var(--ind)">Paste invite link</div><p class="sub" style="margin-top:14px">Expired link? Ask your management office to send a new one.</p>','Set password &amp; sign in',h=760)
for k,v in S.items(): open(f'{k}.html','w').write(v)
