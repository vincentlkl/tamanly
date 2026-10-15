STATUS='''<div class="status"><span>9:41</span><span style="display:flex;gap:6px;align-items:center"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg><svg width="25" height="11" viewBox="0 0 25 11"><rect x=".5" y=".5" width="21" height="10" rx="3" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="18" height="7" rx="1.5" fill="currentColor"/></svg></span></div>'''
def L(n,s=20,c='currentColor',w=1.8):
  return f'<i data-lucide="{n}" width="{s}" height="{s}" stroke-width="{w}" style="color:{c};display:inline-flex;flex:none"></i>'
def page(body,h=844,cls='ws',css=''):
  return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="tl.css"><script src="assets/lucide.min.js"></script><style>body{{height:{h}px}}{css}</style></head><body class="{cls}">{body}<script>lucide.createIcons();</script></body></html>'''
def ib(n,dark=True,badge=False):
  b='<span style="position:absolute;top:8px;right:9px;width:8px;height:8px;border-radius:8px;background:var(--coral);box-shadow:0 0 0 2px var(--ind)"></span>' if badge else ''
  st='' if dark else 'background:#F1F5F9;border-color:#E2E8F0;color:var(--ink)'
  return f'<div class="ib" style="position:relative;{st}">{L(n,20)}{b}</div>'
def nav(title,sub='',left='arrow-left',right=None,badge=False,subicon='map-pin'):
  r=ib(right,badge=badge) if right else '<div style="width:40px"></div>'
  l=ib(left) if left else '<div style="width:40px"></div>'
  s=f'<p>{L(subicon,12) if subicon else ""}{sub}</p>' if sub else ''
  return f'<div class="nav" style="height:auto;min-height:44px">{l}<div class="t"><h2>{title}</h2>{s}</div>{r}</div>'
def hdr(inner,pb=36):
  return f'{STATUS}<div class="hd" style="padding-bottom:{pb}px">{inner}</div>'
def sheet(inner,pb=110,pt=20,mt=-24):
  return f'<div class="sheet" style="margin-top:{mt}px;padding:{pt}px 20px {pb}px">{inner}</div>'
def tab(active='Home',guard=False):
  items=[('house','Home'),('layout-grid','Services'),None,('receipt-text','Bills'),('user-round','Me')] if not guard else [('door-open','Gate'),('scroll-text','Log'),None,('shield-check','Permits'),('user-round','Me')]
  out=''
  for it in items:
    if it is None: out+=f'<div class="qr"><i class="q">{L("scan-qr-code",24,"#fff",2)}</i><span>{"Scan" if guard else "QR Pass"}</span></div>';continue
    i,n=it;out+=f'<div class="{"on" if n==active else ""}">{L(i,22)}<span>{n}</span></div>'
  return f'<div class="tabbar">{out}</div>'
def tile(n,t='t-ind',s=44,i=22,r=12): return f'<div class="tile {t}" style="width:{s}px;height:{s}px;border-radius:{r}px">{L(n,i)}</div>'
def chip(x,c='c-lav',icon=None): return f'<span class="chip {c}" style="white-space:nowrap">{L(icon,12) if icon else ""}{x}</span>'
def tog(on): return f'<div style="width:44px;height:26px;border-radius:999px;background:{"var(--ind)" if on else "#E2E8F0"};position:relative;flex:none"><i style="position:absolute;top:3px;{"right" if on else "left"}:3px;width:20px;height:20px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)"></i></div>'
def btn(x,icon='arrow-right',cls='btn',pre=None):
  return f'<div class="{cls}">{L(pre,18,"currentColor",2) if pre else ""}{x}{L(icon,18,"currentColor",2.2) if icon else ""}</div>'
def foot(inner): return f'<div class="foot" style="padding-bottom:24px">{inner}</div>'
def card(inner,st='',cls='card'): return f'<div class="{cls}" style="{st}">{inner}</div>'
def pills(items,on=0): return '<div class="pills">'+''.join(f'<span class="pill{" on" if k==on else ""}">{x}</span>' for k,x in enumerate(items))+'</div>'
def sh(a,b=''): return f'<div class="sh"><b>{a}</b><span>{b}</span></div>'
def radio(on): return f'<div class="radio{" on" if on else ""}"></div>'
