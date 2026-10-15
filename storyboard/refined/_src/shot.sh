for c in A1 A3 A4 A5 A6 A7; do h=$(grep -o 'body{height:[0-9]*' $c.html|grep -o '[0-9]*$'); google-chrome --headless=new --no-sandbox --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=4000 --window-size=390,$h --screenshot=/workspace/tamanly_shots/refined/$c.png file://$PWD/$c.html 2>/dev/null; done
python3 - <<'P'
from PIL import Image,ImageDraw
for c in 'A1 A3 A4 A5 A6 A7'.split():
  o=Image.open(f'/workspace/tamanly_design/orig/{c}.png').convert('RGB');r=Image.open(f'/workspace/tamanly_shots/refined/{c}.png').convert('RGB')
  o=o.resize((780,int(o.height*780/o.width)));H=max(o.height,r.height)
  im=Image.new('RGB',(780*2+60,H+80),'#E9E6EF');d=ImageDraw.Draw(im)
  im.paste(o,(20,60));im.paste(r,(780+40,60))
  d.text((20,20),f'{c} original',fill='#1F1A2E');d.text((820,20),f'{c} refined',fill='#1F1A2E')
  im.save(f'/workspace/tamanly_shots/refined/compare_{c}.png')
P
