import sys,importlib,subprocess,os
from PIL import Image,ImageDraw
mods=sys.argv[1:]
for m in mods:
  S=importlib.import_module(m).S
  for c,html in S.items():
    open(f'{c}.html','w').write(html)
    h=int(html.split('body{height:')[1].split('px')[0])
    subprocess.run(['google-chrome','--headless=new','--no-sandbox','--hide-scrollbars','--force-device-scale-factor=2','--virtual-time-budget=5000',f'--window-size=390,{h}',f'--screenshot=/workspace/tamanly_shots/refined/{c}.png',f'file://{os.getcwd()}/{c}.html'],stderr=subprocess.DEVNULL,stdout=subprocess.DEVNULL)
    o=Image.open(f'/workspace/tamanly_design/orig/{c}.png').convert('RGB');r=Image.open(f'/workspace/tamanly_shots/refined/{c}.png').convert('RGB')
    H=max(o.height,r.height);im=Image.new('RGB',(780*2+60,H+80),'#E9E6EF');d=ImageDraw.Draw(im)
    im.paste(o,(20,60));im.paste(r,(820,60));d.text((20,20),f'{c} original',fill='#1F1A2E');d.text((820,20),f'{c} refined',fill='#1F1A2E')
    im.save(f'/workspace/tamanly_shots/refined/compare_{c}.png');print(c,r.size)
