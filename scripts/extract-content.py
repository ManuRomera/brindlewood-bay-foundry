"""Import the authorized Spanish 1.0 PDF; deterministic IDs, source page provenance."""
from pypdf import PdfReader
from pathlib import Path
import re,json,hashlib,html,sys,unicodedata
root=Path(__file__).resolve().parent.parent
pdf=PdfReader(sys.argv[1]); pages={i+1:p.extract_text() for i,p in enumerate(pdf.pages)}
def uid(s):return hashlib.sha256(s.encode()).hexdigest()[:16]
def clean(s):
 s=unicodedata.normalize('NFKC',s).replace('\u00ad','')
 s=re.sub(r'(\w)\s*-\n(\w)',r'\1\2',s)
 s=re.sub(r'\b([TPFY]) ([a-záéíóúñ])',r'\1\2',s)
 return s.replace('M.  A.','M. A.').replace('Hogar ,','Hogar,').replace('A.  J.','A. J.')
def page(n):
 lines=clean(pages[n]).splitlines()
 return '\n'.join(x for x in lines if x.strip() and x.strip()!=str(n) and x.strip() not in ['La Guardiana','Movimientos','La primera sesión','Papá por la borda','Un grito de Halloween','Brindlewood Bay precocinado','Pero mira cómo mueren','La muerte a escena','Un asesinato en aguas oscuras'])
def flat(s):return re.sub(r'\s+',' ',s).strip()
def h(s):
 s=clean(s)
 return '<div class="bb-reading">'+''.join('<p>'+html.escape(flat(x))+'</p>' for x in re.split(r'\n(?= F |•|[A-ZÁÉÍÓÚ][^\n]{0,65}\n)',s) if x.strip())+'</div>'
def save(n,d): (root/'_data'/f'{n}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def journal(name,ns):return {'_id':uid(name),'name':name,'ownership':{'default':0},'pages':[{'_id':uid(name+str(n)),'name':f'{n:02} · '+flat(page(n).split('\n')[0])[:80],'type':'text','sort':n*100000,'text':{'format':1,'content':h(page(n))+f'<p class="bb-source">Brindlewood Bay, edición española 1.0, p. {n}.</p>'}} for n in ns]}
save('reglas',[journal('01 · Bienvenidas a Brindlewood Bay',range(3,12)),journal('02 · Movimientos básicos',range(12,16)),journal('03 · Primera sesión',range(33,37)),journal('04 · Movimientos expertos',[74,75]),journal('05 · Hoja de referencia',[76,77]),journal('06 · Hoja de Experta',[80])])
save('guardiana',[journal('El oficio de la Guardiana',range(16,32)),journal('Las Matronas del Vacío Fragante',[4,30,31,72,73])])
configs=[('Papá por la borda',38,41,6),('Un grito en Halloween',42,45,6),('Brindlewood Bay precocinado',46,49,7),('Pero mira cómo mueren',51,55,7),('La muerte a escena',56,63,8),('Un asesinato en aguas oscuras',64,69,8)]
adventures=[]; dossiers=[]; npcs=[]
for title,start,end,c in configs:
 raw='\n'.join(page(n) for n in range(start,end+1)); raw=raw[raw.index('Complejidad:'):]
 before,cluesraw=re.split(r'\nPistas\n',raw,maxsplit=1)
 cluepart,voidpart=re.split(r'\nPistas del [Vv]acío\n',cluesraw,maxsplit=1)
 clues=[flat(x) for x in re.split(r'\n? F ',cluepart)[1:]]; void=[flat(x) for x in re.split(r'\n? F ',voidpart)[1:]]
 intro,suspects=re.split(r'\nSospechosos\n',before,maxsplit=1)
 suspects,locations=re.split(r'\nTrazar la [Ee]scena\n',suspects,maxsplit=1)
 headers=[m for m in re.finditer(r'^([^\n,]{2,45}, [^\n]{2,45})\n',suspects,re.M) if len(m.group(1))<85 and m.group(1)[0].isupper() and not re.search(r'[.!?():]',m.group(1))]
 characters=[]
 for j,m in enumerate(headers):
  name=m.group(1).replace(' ,',','); description=flat(suspects[m.end():headers[j+1].start() if j+1<len(headers) else len(suspects)])
  characters.append({'name':name,'description':description})
  npcs.append({'_id':uid(title+name),'name':name,'type':'pnj','img':'systems/brindlewood-bay/assets/teacup.svg','ownership':{'default':0},'system':{'description':description,'source':f'{title}, pp. {start}–{end}'}})
 case={'id':uid(title),'name':title,'complexity':c,'minLayer':3 if start==64 else 0,'source':f'Brindlewood Bay 1.0, pp. {start}–{end}','introduction':flat(intro),'suspects':characters,'suspectNotes':flat(suspects[:headers[0].start()]) if headers else '', 'locations':locations,'clues':[{'id':uid(title+'clue'+str(i)),'text':x} for i,x in enumerate(clues)],'voidClues':[{'id':uid(title+'void'+str(i)),'text':x} for i,x in enumerate(void)]}
 adventures.append(case);dossiers.append(journal(title,range(start,end+1)))
 print(title,len(clues),len(void),len(characters),[x['name'] for x in characters])
save('aventuras',dossiers);save('sospechosos',npcs);save('mysteries',adventures)
names=['M. A. Baracus','Frank Colombo','Dale Cooper','Sonny Crockett','Frank Dowling','Tom Hanson','Milton Hardcastle','Jonathan Hart','Angus MacGyver','Thomas Magnum','Fox Mulder','Michael Knight','Rick & A. J.','R. Quincy','Jim Rockford','«Espantapájaros»','Colt Seavers','Gordon Shumway','Remington Steele']
raw=clean(pages[74])+'\n'+clean(pages[75]);raw=raw.replace('M. A. Baracus','M. A. Baracus').replace('Rick & A. J.','Rick & A. J.')
items=[]
for i,name in enumerate(names):
 start=raw.index(name+'\n')+len(name); end=raw.index(names[i+1]+'\n',start) if i+1<len(names) else len(raw)
 items.append({'_id':uid(name),'name':name,'type':'movimiento','img':'systems/brindlewood-bay/assets/teacup.svg','system':{'description':flat(raw[start:end]),'source':f'Brindlewood Bay 1.0, p. {74 if i<10 else 75}','key':str(i),'frequency':'session' if i in [0,1,9,16] else 'once' if i==4 else 'mystery' if i==10 else 'unlimited','automatic':i in [2,3,4,6,7,9,10,11,13,16,17]}})
save('expertos',items)
save('basicos',[{'_id':uid(name),'name':name,'type':'movimiento','img':'systems/brindlewood-bay/assets/teacup.svg','system':{'description':flat(clean(pages[n])),'source':f'Brindlewood Bay 1.0, p. {n}','key':key}} for key,name,n in [('day','Diurno',12),('night','Nocturno',12),('meddle','Metomentodo',13),('cozy','Afable',13),('gold','Misterios de la corona de oro',14),('occult','Ocultista',14),('theorize','Teorizar',15)]])
