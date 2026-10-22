import sys  # usage: python3 tools/claude_plan.py <LEGIT MANAUL SAVE json> <out json>
import json,math,copy
E=json.load(open(sys.argv[1]))
for k in [k for k in E if k.startswith('__')]: E.pop(k)
ents={e['id']:copy.deepcopy(e) for e in E['ents']}
order=[e['id'] for e in E['ents']]
log=[]
def drop(ids,why):
    for i in ids:
        if i in ents: del ents[i]; order.remove(i)
    log.append(('remove',why,len(ids)))
n=[0]
def nid(p): n[0]+=1; return f'C{p}{n[0]}'
def add(e,why=None):
    e.setdefault('id',nid(e['t'][0].upper())); ents[e['id']]=e; order.append(e['id']); return e
def plant(sp,x,y,**kw): return add(dict(t='plant',sp=sp,x=round(x,1),y=round(y,1),**kw))
def st(k,x,y,w,h,rot=0,**kw): return add(dict(t='st',k=k,x=x,y=y,w=w,h=h,rot=rot,name=kw.pop('name',''),**kw))
def bed(mat,pts,comp=None,edge='none',name='',**kw): return add(dict(t='bed',mat=mat,pts=[[round(a,1),round(b,1)] for a,b in pts],comp=comp or [],edge=edge,name=name,smooth=False,**kw))
def row(sp,x1,y1,x2,y2,spacing): return add(dict(t='row',sp=sp,x1=x1,y1=y1,x2=x2,y2=y2,spacing=spacing))

# ---------- 1. clear errors and swap out thirsty / non-native ornamentals
ROW=[f'P{i}' for i in range(39,88)]
drop([i for i in ROW if i in ents],'street buffer planted in the county right-of-way (off the lot)')
drop(['P1','P2','P14','P15'],'willows and sweetgums in the pond easement (well conflict, crowding, non-native)')
drop(['P13'],'serviceberry in the front utility easement')
drop(['P88','P89','P90','P91','P92','Z17'],'east pines/spruce in the drainage easement and their bed (rebuilt inboard)')
drop(['P97'],'red maple too close to the septic trenches')
drop(['P140','P160'],'grasses off the lot')
for i in ['P155','P159','P161','P163','P165','P168','P169']:
    if i in ents: ents[i]['sp']='sideoats'   # shallow-rooted native instead of deep Indiangrass on the reserve
# river birches -> American persimmon pair (edible swap, same spots)
ents['P96']['sp']='persimmonM'; ents['P95']['sp']='persimmon'
ents['P38'].update(y=160.6)
# elderberries move from the kitchen strip into the hedgerow
drop(['P22','P23'],'elderberries moved to the east hedgerow')
# hoop house: turn east-west on the sunny south strip
S9=ents['S9']; S9.update(x=199,y=98,rot=90)
# swing set out of the hedgerow line, closer to the house
ents['S10'].update(x=160,y=171,rot=0)

# ---------- 2. septic field + reserve -> low-mow fescue (turf, but mown 2-3x a year)
bed('nomow',[(88,3),(233,3),(233,76),(230,85.4),(88,85.4)],name='Septic field · low-mow fescue')
bed('nomow',[(12.5,88),(52.5,88),(52.5,187.5),(12.5,187.5)],name='Reserve · low-mow fescue')

# ---------- 3. south kitchen strip (full sun, outside the well's 50' circle)
crops=['potato','drybean','wsquash']
for i,y in enumerate([90,96,102]):
    st('calbed',165,y,4,24,90,crop=crops[i],rotate=True,name=f'Calorie bed {i+1}')
st('compost',182,98,12,4.5,90,name='Compost bays')
bed('strawbed',[(146,88),(152,88),(152,105),(146,105)],name='Strawberry bed',sv='albion')
st('rainbarrel',182,89.5,2.5,2.5,0)
st('rainbarrel',146.5,108.5,2.5,2.5,0)

# ---------- 4. perennial vegetables by the garden
row('asparagus',175.5,108,175.5,144,1.5)
for x in (180,184.5,189): plant('rhubarb',x,147)
for x,y in ((154,137.5),(157,137.5),(160,137.5),(163,137.5),(166,137.5)): plant('walkonion',x,y)
plant('horseradish',188,108)
plant('grape',155,124); plant('grape',155,134)

# ---------- 5. east privacy hedgerow along the NE line
A=(236,76.1); D=(-51.95/152.99,143.9/152.99); Nn=(-143.9/152.99,-51.95/152.99)
def at(yl,d):
    t=(yl-A[1])/D[1]; x=A[0]+D[0]*t; return (x+Nn[0]*d, yl+Nn[1]*d)
ev=['wspruce','pine','wspruce','pine','wspruce','pine']
for i,yl in enumerate([148,163,178,193]):
    x,y=at(yl,14); plant(ev[i],x,y)
inner=['hazelH','elder','hazelH','aronia','hazelH','aronia','hazelH','elder','hazelH','aronia','hazelH','hazelH']
yl=114; i=0
while yl<=200 and i<len(inner):
    x,y=at(yl,25)
    if y<188.5: plant(inner[i],x,y)
    i+=1; yl+=8.5
P1=[at(105,8)[0],at(105,8)[1]]
hb=[at(104,9),at(196,9),at(196,31),at(104,31)]
bed('mulch',hb,name='East hedgerow · wood chips',edge='none')

# ---------- 6. west hedge north of the patio (shrubs only: oak + reserve nearby)
for (sp,x,y) in (('hazelH',58,166),('hazelH',58,174),('hazelH',63,180),('elder',70,184)):
    plant(sp,x,y)

# ---------- 7. fruit guild north of the house (trees OK in the well circle; no manure, so no food beds)
plant('pear',70,172); plant('pear2',88,171)
plant('pawpaw',138,184); plant('pawpaw',128,176)
plant('cherry',172,163)

# ---------- 8. pond edge: native wet-meadow overseed beyond the limit of disturbance
bed('meadow',[(12.5,191),(188,191),(183.5,205),(179,218),(12.5,218)],
    comp=[['tussock',40],['iris',20],['milkweed',15],['joepye',12],['aster',12]],name='Pond edge · native wet meadow')

out=dict(id='claude-harvest',name='Claude · Private Harvest',base=E.get('base','E'),builtin=False,
         ents=[ents[i] for i in order],prices=E.get('prices',{}),updated='')
json.dump(out,open(sys.argv[2],'w'))
print(len(out['ents']),'items'); [print(l) for l in log]
