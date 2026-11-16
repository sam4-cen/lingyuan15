import numpy as np, json, os
from PIL import Image
from scipy import ndimage as nd
R='lingyuan_art_raw'; O='lingyuan_art'
for s in ['sprites','fx','icons','npc','bg','preview']: os.makedirs(f'{O}/{s}',exist_ok=True)
def rmbg(a,tol=18):
    nw=(np.abs(a.astype(int)-255).max(2)>tol)
    bgc=~nw; lab,_=nd.label(bgc); border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
    bg=np.isin(lab,list(border)); alpha=(~bg).astype(np.uint8)*255
    return np.dstack([a,alpha])
def comps(rgba,dil=10,minarea=3000):
    m=rgba[...,3]>0; lab,n=nd.label(nd.binary_dilation(m,iterations=dil))
    out=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        sub=m[sl]&(lab[sl]==i+1)
        if sub.sum()<minarea: continue
        ys,xs=np.where(sub); y0,x0=sl[0].start,sl[1].start
        out.append((y0+ys.min(),x0+xs.min(),y0+ys.max()+1,x0+xs.max()+1))
    # rows
    out.sort(key=lambda b:(b[0]+b[2])/2); rows=[]
    for b in out:
        c=(b[0]+b[2])/2
        if rows and abs(c-np.mean([(x[0]+x[2])/2 for x in rows[-1]]))<(b[2]-b[0])*0.4: rows[-1].append(b)
        else: rows.append([b])
    return [sorted(r,key=lambda b:b[1]) for r in rows]
def grid(rgba,nr,nc,exp=None,dil=10,minarea=1500):
    H,W=rgba.shape[:2]; out=[]
    for i in range(nr):
        band=rgba[i*H//nr:(i+1)*H//nr].copy()
        r=comps(band,dil,minarea); bx=[(b[0]+i*H//nr,b[1],b[2]+i*H//nr,b[3]) for rr in r for b in rr]; bx.sort(key=lambda b:b[1])
        e=exp[i] if exp else nc
        if len(bx)!=e:
            bx=[]
            for j in range(nc):
                m=band[:, j*W//nc:(j+1)*W//nc,3]>0; m=nd.binary_opening(m,iterations=2)
                if m.sum()<minarea: continue
                ys,xs=np.where(m); bx.append((i*H//nr+ys.min(),j*W//nc+xs.min(),i*H//nr+ys.max()+1,j*W//nc+xs.max()+1))
            FALLBACK.append((i,e,len(bx)))
        out.append(bx)
    return out
FALLBACK=[]
def quant(im,soft=False):
    a=np.array(im); al=a[...,3]
    if not soft: al=np.where(al>110,255,0).astype(np.uint8)
    rgb=Image.fromarray(a[...,:3]).quantize(32,method=Image.Quantize.MEDIANCUT).convert('RGB')
    return Image.fromarray(np.dstack([np.array(rgb),al]))
def frames(rgba,boxes,T,soft=False,pad=1,center=False):
    crops=[rgba[b[0]:b[2],b[1]:b[3]] for b in boxes]
    W=max(c.shape[1] for c in crops); H=max(c.shape[0] for c in crops)
    s=(T-2*pad)/max(W,H); res=[]
    for c in crops:
        im=Image.fromarray(c); w,h=max(1,round(c.shape[1]*s)),max(1,round(c.shape[0]*s))
        im=im.resize((w,h),Image.BOX); f=Image.new('RGBA',(T,T),(0,0,0,0))
        f.paste(im,((T-w)//2,(T-h)//2 if center else T-pad-h),im); res.append(quant(f,soft))
    return res
readme=[]; allfr={}
def save(sub,name,fr):
    T=fr[0].size[0]; strip=Image.new('RGBA',(T*len(fr),T))
    for i,f in enumerate(fr): strip.paste(f,(i*T,0)); f.save(f'{O}/{sub}/{name}_{i}.png',optimize=True)
    strip.save(f'{O}/{sub}/{name}_strip.png',optimize=True)
    strip.resize((strip.width*4,T*4),Image.NEAREST).save(f'{O}/preview/{name}_strip_4x.png',optimize=True)
    readme.append((f'{sub}/{name}_strip.png + {name}_0..{len(fr)-1}.png',f'{T}x{T}',len(fr),name)); allfr[name]=strip
log={}
def load(n): return rmbg(np.array(Image.open(f'{R}/{n}.png').convert('RGB')))
# hero
a=load('hero_idle_walk'); r=grid(a,2,6); log['hero_idle_walk']=[len(x) for x in r]
save('sprites','hero_idle',frames(a,r[0],32)); save('sprites','hero_walk',frames(a,r[1],32))
for n,an in [('hero_dig','hero_dig'),('hero_fall_sleep','hero_fall_sleep')]:
    a=load(n); r=grid(a,1,6 if 'dig' in n else 4); log[n]=[len(x) for x in r]; save('sprites',an,frames(a,sum(r,[]),32))
for n,T in [('box_bag',32),('box_bin',48),('box_scrap',48)]:
    a=load(n); r=grid(a,1,3); log[n]=[len(x) for x in r]; save('sprites',n+'_shake',frames(a,sum(r,[]),T))
# glow
g=np.array(Image.open(f'{R}/glow_fx.png').convert('RGB'))
a=np.dstack([g,np.clip((255-g.astype(int).min(2)-8)*4,0,255).astype(np.uint8)]); r=grid(a,4,6,dil=6,minarea=200); log['glow_fx']=[len(x) for x in r]
for row,nm in zip(r[1:],['blue','gold','rainbow']): save('fx','glow_'+nm,frames(a,row,48,soft=True,center=True))
# white row: alpha from luminance distance to white bg
w=g[:g.shape[0]//4].astype(float); d=(255-w.min(2)); al=np.clip(d*4,0,255).astype(np.uint8)
aw=np.dstack([np.full(w.shape,235,np.uint8)*0+np.clip(w,0,255).astype(np.uint8),al]); aw[...,:3]=np.clip(w-20,0,255).astype(np.uint8)
rw=grid(aw,1,6,dil=6,minarea=100); log['glow_white']=[len(x) for x in rw]; log['glow_white_maxdiff']=float(d.max()); log['glow_white_px>40']=int((d>40).sum())
pass  # white row empty in source
# icons
a=load('item_icons'); r=grid(a,6,6,[6,6,6,6,6,4],dil=8,minarea=500); log['item_icons']=[len(x) for x in r]
names="milk_tea egg_tart cardboard plastic_bottle soda_can old_phone scratch_card left_slipper banana_peel bread buns instant_noodles umbrella charger_cable old_book wallet coins toy_robot sunglasses plush_toy watch earphones keyboard rice_box apple sneaker fan lamp radio tin_can dead_mouse cat_toy lottery_ticket gold_necklace".split()
boxes=sum(r,[]); atlas=Image.new('RGBA',(16*8,16*5)); mp={}
for i,(b,nm) in enumerate(zip(boxes,names)):
    f=frames(a,[b],16,pad=0)[0]  # per-icon fit
    x,y=(i%8)*16,(i//8)*16; atlas.paste(f,(x,y)); f.save(f'{O}/icons/{nm}.png',optimize=True); mp[nm]=dict(x=x,y=y,w=16,h=16)
atlas.save(f'{O}/icons/items_atlas.png',optimize=True); json.dump(mp,open(f'{O}/icons/items_atlas.json','w'),indent=1)
atlas.resize((atlas.width*4,atlas.height*4),Image.NEAREST).save(f'{O}/preview/items_atlas_4x.png'); allfr['items_atlas']=atlas
readme.append(('icons/items_atlas.png + .json + icons/<name>.png','16x16',len(boxes),'items (atlas)'))
# ===== extra icons =====
def rmbg_c(a,tol=28):
    bgc_=np.median(np.r_[a[0],a[-1],a[:,0],a[:,-1]],axis=0)
    nb=np.abs(a.astype(int)-bgc_).max(2)<=tol; lab,_=nd.label(nb)
    border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
    return np.dstack([a,(~np.isin(lab,list(border))).astype(np.uint8)*255])
EX=[]
def rgbimg(n): return np.array(Image.open(f'{R}/{n}.png').convert('RGB'))
A_=rgbimg('items_extra_a'); h,w=A_.shape[:2]
namesA='old_newspaper chopsticks plastic_flower old_clothes onigiri_sealed old_rice_cooker half_rice_bag plaid_shirt metro_card'.split()
for k,nm in enumerate(namesA):
    i,j=divmod(k,3); c=A_[i*h//3:(i+1)*h//3,j*w//3:(j+1)*w//3]; ins=int(0.14*c.shape[0]); EX.append((nm,rmbg_c(c[ins:-ins,ins:-ins])))
B_=rgbimg('items_extra_b'); h,w=B_.shape[:2]
namesB='kite power_bank mooncake_sealed brand_briefcase trendy_tshirt gpu gold_koi cat_hair'.split()
for k,nm in enumerate(namesB):
    i,j=divmod(k,4); EX.append((nm,rmbg_c(B_[i*h//2:(i+1)*h//2,j*w//4:(j+1)*w//4])))
na=len(mp)+len(EX); rows_=(na+7)//8
big_=Image.new('RGBA',(128,16*rows_)); big_.paste(atlas,(0,0))
for k,(nm,c) in enumerate(EX):
    m=c[...,3]>0; m=nd.binary_opening(m,iterations=2); lb,_=nd.label(m)
    sz=nd.sum(m,lb,range(1,lb.max()+1)); keep=np.isin(lb,np.where(sz>=0.01*sz.max())[0]+1); c=c.copy(); c[...,3]=np.where(keep,255,0)
    ys,xs=np.where(keep); f=frames(c,[(ys.min(),xs.min(),ys.max()+1,xs.max()+1)],16,pad=0)[0]
    idx=len(mp); x,y=(idx%8)*16,(idx//8)*16; big_.paste(f,(x,y)); f.save(f'{O}/icons/{nm}.png',optimize=True); mp[nm]=dict(x=x,y=y,w=16,h=16)
atlas=big_; atlas.save(f'{O}/icons/items_atlas.png',optimize=True); json.dump(mp,open(f'{O}/icons/items_atlas.json','w'),indent=1)
atlas.resize((atlas.width*4,atlas.height*4),Image.NEAREST).save(f'{O}/preview/items_atlas_4x.png'); allfr['items_atlas']=atlas
readme[:]=[(r_[0],r_[1],len(mp),'items (atlas %dx%d; +17 extra icons appended at index 34-50)'%atlas.size) if r_[3]=='items (atlas)' else r_ for r_ in readme]
# npcs
a=load('npc_sheet'); r=grid(a,5,5,[5,5,5,5,4]); log['npc_sheet']=[len(x) for x in r]
for row,nm in zip(r,['npc_patrol_uncle','npc_guard','npc_kind_auntie','npc_rival','npc_cat']):
    if nm=='npc_kind_auntie': continue
    save('npc',nm,frames(a,row[:4],32))
a=load('npc_auntie'); r=grid(a,1,4); log['npc_auntie']=[len(x) for x in r]; save('npc','npc_kind_auntie',frames(a,r[0],32))
a=load('npc_sheet2'); r=grid(a,3,3); log['npc_sheet2']=[len(x) for x in r]
for row,nm in zip(r,['npc_delivery_rider','npc_sanitation_auntie','npc_wallet_owner']): save('npc',nm,frames(a,row,32))
# bg
bg=Image.open(f'{R}/loc_bg_compound.png').convert('RGB').resize((180,320),Image.BOX).quantize(64).convert('RGB')
bg.save(f'{O}/bg/loc_bg_compound.png',optimize=True); bg.resize((720,1280),Image.NEAREST).save(f'{O}/preview/loc_bg_compound_4x.png')
readme.append(('bg/loc_bg_compound.png','180x320',1,'loc_compound (64 colors, opaque)')); allfr['bg']=bg.convert('RGBA')
# ===== batch 2 =====
for sd in ['fortune','ui','cards']: os.makedirs(f'{O}/{sd}',exist_ok=True)
def rgbimg(n): return np.array(Image.open(f'{R}/{n}.png').convert('RGB'))
# glow white on black
g=rgbimg('glow_white').astype(float); lum=g.max(2); al=np.clip((lum-10)*1.6,0,255).astype(np.uint8)
aw=np.dstack([np.clip(g*255/np.maximum(lum,1)[...,None],0,255).astype(np.uint8),al])
core=lum>250; lb,_=nd.label(nd.binary_dilation(core,iterations=3)); cs=sorted([(sl,(lb[sl]>0).sum()) for sl in nd.find_objects(lb)],key=lambda o:-o[1])[:6]
cx=[f*aw.shape[1]/800 for f in (45,140,250,380,520,690)]; edges=[0]+[int((cx[i]+cx[i+1])/2) for i in range(5)]+[aw.shape[1]]; bxw=[]
for i in range(6):
    mm=aw[:,edges[i]:edges[i+1],3]>40; ys,xs=np.where(mm); bxw.append((ys.min(),edges[i]+xs.min(),ys.max()+1,edges[i]+xs.max()+1))
log['glow_white']=len(bxw); save('fx','glow_white',frames(aw,bxw,48,soft=True,center=True))
# fx_extra: mask hero
fx=rgbimg('fx_extra'); A=rmbg(fx); f=fx.astype(int); R_,G_,B_=f[...,0],f[...,1],f[...,2]
mx=f.max(2); mn=f.min(2); sat=(mx-mn)/np.maximum(mx,1)
green=(G_>R_+15)&(G_>B_+10)&(mx<200)
effect=((mx>215)&(G_>0.86*R_)&(B_<0.8*G_)&~green)|((B_>R_+40)&(B_>150))|(mn>235)|((R_>230)&(G_>120)&(G_<0.75*R_)&(B_<60))
heromask=np.zeros(green.shape,bool); lab,_=nd.label(nd.binary_dilation(green,iterations=6))
HEROCOV={}
for sl in nd.find_objects(lab):
    h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
    if h*w<15000: continue
    y0=max(0,sl[0].start-int(h*0.45)); y1=min(fx.shape[0],sl[0].stop+int(h*0.5)); x0=max(0,sl[1].start-int(w*0.12)); x1=sl[1].stop+int(w*0.12)
    heromask[y0:y1,x0:x1]=True
A2=A.copy(); A2[...,3]=np.where(heromask&~effect,0,A2[...,3])
# remove remaining tiny specks
m=A2[...,3]>0; lab,_=nd.label(m); sz=nd.sum(m,lab,range(1,lab.max()+1)); A2[...,3]=np.where(np.isin(lab,np.where(sz<25)[0]+1),0,A2[...,3])
H=fx.shape[0]; rows=[(0,5,'fx_flashlight'),(1,5,'fx_lidpop'),(2,4,'fx_clash')]
for i,nc,nm in rows:
    band=A2[i*H//3:(i+1)*H//3]; W=band.shape[1]; bx=[]
    for j in range(nc):
        mm=band[:,j*W//nc:(j+1)*W//nc,3]>0
        if mm.sum()<200: continue
        ys,xs=np.where(mm); bx.append((i*H//3+ys.min(),j*W//nc+xs.min(),i*H//3+ys.max()+1,j*W//nc+xs.max()+1))
    log[nm]=len(bx); fr=frames(A2,bx,48,soft=True)
    # center vertically for fx instead of baseline? keep baseline
    save('fx',nm,fr)
# fortune
fo=rgbimg('fortune'); W=fo.shape[1]; cells=[]
for j in range(8):
    c=fo[:,j*W//8:(j+1)*W//8]; nw=np.abs(c.astype(int)-255).max(2)>40; ys,xs=np.where(nw)
    y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max(); ins=int(0.10*(x1-x0))
    inner=c[y0+ins:y1-ins,x0+ins:x1-ins]; q=rmbg(inner); lb,_=nd.label(q[...,3]>0)
    for k,sl in enumerate(nd.find_objects(lb)):
        hh=sl[0].stop-sl[0].start; ww=sl[1].stop-sl[1].start
        if hh>0.4*q.shape[0] and ww<0.05*q.shape[1]: q[...,3][sl][lb[sl]==k+1]=0
    cells.append(q)
def fit(rgba,Tw,Th,scale=None):
    m=rgba[...,3]>0; ys,xs=np.where(m); c=rgba[ys.min():ys.max()+1,xs.min():xs.max()+1]
    s_=scale or min((Tw-2)/c.shape[1],(Th-2)/c.shape[0]); w,h=max(1,round(c.shape[1]*s_)),max(1,round(c.shape[0]*s_))
    im=Image.fromarray(c).resize((w,h),Image.BOX); o=Image.new('RGBA',(Tw,Th)); o.paste(im,((Tw-w)//2,Th-1-h),im); return quant(o),c.shape
shp=[]
for c in cells[:7]:
    m=c[...,3]>0; ys,xs=np.where(m); shp.append((np.ptp(ys)+1,np.ptp(xs)+1))
sc=min(min(62/w for h,w in shp),min(94/h for h,w in shp))
cup=[fit(c,64,96,sc)[0] for c in cells[:7]]
strip=Image.new('RGBA',(64*7,96))
for i,fr_ in enumerate(cup): strip.paste(fr_,(i*64,0)); fr_.save(f'{O}/fortune/fortune_cup_{i}.png',optimize=True)
strip.save(f'{O}/fortune/fortune_cup_strip.png',optimize=True); strip.resize((strip.width*4,384),Image.NEAREST).save(f'{O}/preview/fortune_cup_strip_4x.png')
readme.append(('fortune/fortune_cup_strip.png + fortune_cup_0..6.png','64x96',7,'fortune_cup (frame 0 = rest pose, 1-6 = shake loop)')); allfr['fortune_cup']=strip
slip=fit(cells[7],64,96)[0]; slip.save(f'{O}/fortune/fortune_slip.png',optimize=True); slip.resize((256,384),Image.NEAREST).save(f'{O}/preview/fortune_slip_4x.png')
readme.append(('fortune/fortune_slip.png','64x96',1,'fortune_slip (blank)')); allfr['fortune_slip']=slip
# backgrounds
BGS={}
locs=['loc_huaqiangbei','loc_dongmen','loc_baishizhou','loc_futian_cbd','loc_nanshan_tech','loc_night_market','loc_fastfood_back','shelter_bed','shelter_bed_up','shelter_recycle','shelter_recycle_up','sleep_park','sleep_fastfood','sleep_netcafe']
for n in locs:
    bg_=Image.open(f'{R}/{n}.png').convert('RGB').resize((180,320),Image.BOX).quantize(64).convert('RGB')
    bg_.save(f'{O}/bg/{n}.png',optimize=True); bg_.resize((720,1280),Image.NEAREST).save(f'{O}/preview/{n}_4x.png',optimize=True)
    readme.append((f'bg/{n}.png','180x320',1,n+' (64 colors, opaque)')); BGS[n]=bg_
mp_=Image.open(f'{R}/map_shenzhen.png').convert('RGB')
mpa=np.array(mp_).astype(int)
# marker rings: cream/white inner ring ~ (255,240,200) surrounded by dark brown; detect near-white ring pixels
ring=(mpa.min(2)>225)&(np.abs(mpa[...,0]-mpa[...,2])<60)
lab,n_=nd.label(nd.binary_closing(ring,iterations=3)); cents=[]
for i,sl in enumerate(nd.find_objects(lab)):
    h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start; area=(lab[sl]==i+1).sum()
    if 80<h<260 and 80<w<260 and abs(h-w)<40 and area<0.5*h*w: cents.append((round((sl[1].start+sl[1].stop)/2*360/1152),round((sl[0].start+sl[0].stop)/2*640/2048)))
log['map_rings']=cents
m2=mp_.resize((360,640),Image.BOX).quantize(64).convert('RGB'); m2.save(f'{O}/bg/map_shenzhen.png',optimize=True); m2.resize((1440,2560),Image.NEAREST).save(f'{O}/preview/map_shenzhen_4x.png',optimize=True)
readme.append(('bg/map_shenzhen.png','360x640',1,'map (64 colors)')); BGS['map_shenzhen']=m2
# ui kit
u=rmbg(rgbimg('ui_kit')); r=comps(u,dil=4,minarea=20000); boxes=sum(r,[]); log['ui_kit']=len(boxes)
names=['bar_frame_red','bar_frame_yellow','bar_frame_blue','inv_grid_normal','inv_grid_highlight','inv_grid_red','button_normal','button_pressed','panel_frame']
UI={}; INS={}
for b,nm in zip(boxes,names):
    c=u[b[0]:b[2],b[1]:b[3]]; w,h=round(c.shape[1]/13),round(c.shape[0]/13)
    im=quant(Image.fromarray(c).resize((w,h),Image.BOX)); im.save(f'{O}/ui/{nm}.png',optimize=True); UI[nm]=im
    ar=np.array(im).astype(int); cy,cx=h//2,w//2; ctr=ar[cy,cx,:3]
    def scan(line):
        for k,p in enumerate(line):
            if p[3]>0 and np.abs(p[:3]-ctr).sum()<40: return k
        return 0
    if nm.startswith('inv'): INS[nm]=None
    else: INS[nm]=dict(left=scan(ar[cy]),right=scan(ar[cy][::-1]),top=scan(ar[:,cx]),bottom=scan(ar[:,cx][::-1]))
    readme.append((f'ui/{nm}.png',f'{w}x{h}',1,nm+(' 9-slice insets L/R/T/B=%(left)d/%(right)d/%(top)d/%(bottom)d'%INS[nm] if INS[nm] else ' (5x5 grid panel, not single cell)')))
    im.resize((w*4,h*4),Image.NEAREST).save(f'{O}/preview/{nm}_4x.png')
# single inventory cells cut from grids: one cell = 1/5 of inner area
for nm in ['inv_grid_normal','inv_grid_highlight','inv_grid_red']:
    pass
# cards
cf=rgbimg('card_frames').astype(int); navy=np.array([43,49,67])
nb=np.abs(cf-navy).sum(2)>70
lab,_=nd.label(~nb); border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
bgm=np.isin(lab,list(border)); bgm=nd.binary_opening(bgm,iterations=1)|bgm
fg=~bgm; fg=nd.binary_fill_holes(nd.binary_opening(fg,iterations=3))
ca=np.dstack([cf.astype(np.uint8),(fg*255).astype(np.uint8)])
lab,_=nd.label(fg); objs=[(sl,(lab[sl]>0).sum()) for sl in nd.find_objects(lab)]; objs=sorted([o for o in objs if o[1]>100000],key=lambda o:o[0][1].start)
log['cards']=len(objs)
for (sl,_),nm in zip(objs,['card_daily','card_fail','card_cert']):
    c=ca[sl]; im=Image.fromarray(c).resize((300,400),Image.BOX)  # stretch to spec
    a_=np.array(im); a_[...,3]=np.where(a_[...,3]>127,255,0); im=Image.fromarray(a_)
    rgb=im.convert('RGB').quantize(64).convert('RGB'); im=Image.fromarray(np.dstack([np.array(rgb),a_[...,3]]))
    im.save(f'{O}/cards/{nm}.png',optimize=True); im.resize((1200,1600),Image.NEAREST).save(f'{O}/preview/{nm}_4x.png')
    readme.append((f'cards/{nm}.png','300x400',1,nm+f' (src {c.shape[1]}x{c.shape[0]} stretched)')); UI[nm]=im
# ===== batch 3 =====
def lumalpha(n,gain=3.5,thr=10):
    g=rgbimg(n).astype(float); lum=g.max(2); al=np.clip((lum-thr)*gain,0,255).astype(np.uint8)
    return np.dstack([np.clip(g*255/np.maximum(lum,1)[...,None],0,255).astype(np.uint8),al])
def colsplit(a,n):
    col=(a[...,3]>40).sum(0)>0; xs=np.where(col)[0]; runs=[[xs[0],xs[0]]]
    for x in xs[1:]:
        if x==runs[-1][1]+1: runs[-1][1]=x
        else: runs.append([x,x])
    while len(runs)>n:
        gaps=[runs[i+1][0]-runs[i][1] for i in range(len(runs)-1)]; i=int(np.argmin(gaps)); runs[i][1]=runs[i+1][1]; del runs[i+1]
    bx=[]
    for x0,x1 in runs:
        ys=np.where((a[:,x0:x1+1,3]>40).any(1))[0]; bx.append((ys.min(),x0,ys.max()+1,x1+1))
    return bx
a=lumalpha('item_popflash'); bx=colsplit(a,5); log['fx_item_pop']=len(bx); save('fx','fx_item_pop',frames(a,bx,32,soft=True,center=True))
a=lumalpha('fx_flashlight_v2'); bx=colsplit(a,5); log['fx_flashlight_v2']=len(bx); del bx[2]
for nm in [k for k in list(allfr) if k=='fx_flashlight']: pass
readme[:]=[r_ for r_ in readme if r_[3]!='fx_flashlight']
import glob as _g
for p in _g.glob(f'{O}/fx/fx_flashlight_*.png'): os.remove(p)
save('fx','fx_flashlight',frames(a,bx,48,soft=True,center=True)); readme[-1]=readme[-1][:3]+('fx_flashlight (v2; source frame 3 upward beam dropped; last frame clipped at source edge)',)
a=lumalpha('fx_clash_v2'); cx=[f*a.shape[1]/800 for f in (75,270,500,710)]; ed=[0]+[int((cx[i]+cx[i+1])/2) for i in range(3)]+[a.shape[1]]; bx=[]
for i in range(4):
    mm=a[:,ed[i]:ed[i+1],3]>60; ys,xs=np.where(mm); bx.append((ys.min(),ed[i]+xs.min(),ys.max()+1,ed[i]+xs.max()+1))
log['fx_clash_v2']=len(bx)
readme[:]=[r_ for r_ in readme if r_[3]!='fx_clash']
for p in _g.glob(f'{O}/fx/fx_clash_*.png'): os.remove(p)
save('fx','fx_clash',frames(a,bx,48,soft=True,center=True))
bg_=Image.open(f'{R}/shelter_recycle_up_v2.png').convert('RGB').resize((180,320),Image.BOX).quantize(64).convert('RGB')
bg_.save(f'{O}/bg/shelter_recycle_up.png',optimize=True); bg_.resize((720,1280),Image.NEAREST).save(f'{O}/preview/shelter_recycle_up_4x.png',optimize=True); BGS['shelter_recycle_up']=bg_
for i,r_ in enumerate(readme):
    if r_[0]=='bg/shelter_recycle_up.png': readme[i]=(r_[0],r_[1],1,'shelter_recycle_up (v2: cot, no people; 64 colors)')
# contact sheet
from PIL import ImageDraw
S=4; items=[(k,v) for k,v in allfr.items() if k!='bg']
colW=max(v.width for k,v in items)*S+40
uiW=sum(v.width*S+20 for k,v in UI.items() if not k.startswith('card'))
bglist=[('loc_bg_compound',allfr['bg'].convert('RGB'))]+list(BGS.items())
Wd=max(colW, 1200)+40; H1=sum(v.height*S+30 for k,v in items)+20
sheet=Image.new('RGBA',(Wd+ 4*(180*2+20)+40, max(H1,4000)+3000),(48,48,48,255)); d=ImageDraw.Draw(sheet); y=20
for k,v in items:
    d.text((20,y),k,fill=(220,220,220)); y+=12; big=v.resize((v.width*S,v.height*S),Image.NEAREST); sheet.paste(big,(20,y),big); y+=v.height*S+18
x=20
uy=y+10; rowh=0
for k,v in UI.items():
    sc_=S if not k.startswith('card') else 1
    big=v.resize((v.width*sc_,v.height*sc_),Image.NEAREST)
    if x+big.width>Wd: x=20; uy+=rowh+30; rowh=0
    d.text((x,uy),k,fill=(220,220,220)); sheet.paste(big,(x,uy+12),big); x+=big.width+20; rowh=max(rowh,big.height+12)
endy=uy+rowh+20
# bgs at 2x in right columns
for i,(k,v) in enumerate(bglist):
    sc_=2 if k!='map_shenzhen' else 1
    cx=Wd+(i%4)*(380); cy=20+(i//4)*(680)
    d.text((cx,cy),k,fill=(220,220,220)); sheet.paste(v.resize((v.width*sc_,v.height*sc_),Image.NEAREST),(cx,cy+12))
sheet=sheet.crop((0,0,sheet.width,max(endy,20+((len(bglist)+3)//4)*680)))
sheet.convert('RGB').save('lingyuan_art_sheet.png',optimize=True)
with open(f'{O}/README.md','w') as f:
    f.write('# 0元深圳15天 像素素材（muse.ai 原图后处理）\n\nPNG only, transparent bg, ≤32 colors/sprite, nearest-neighbor previews 4x in preview/.\nFrames: bottom-aligned (1px pad), horizontally centered; strips are horizontal, left→right.\n\n| files | frame size | frames | anim |\n|---|---|---|---|\n')
    for r_ in readme: f.write('| %s | %s | %d | %s |\n'%r_)
    f.write('\n## map_shenzhen marker ring centers (px in 360x640, approx)\n'+'\n'.join(f'- ring {i+1}: x={c[0]}, y={c[1]}' for i,c in enumerate(sorted(log['map_rings'],key=lambda c:c[1]))))
    f.write('\n\n## 9-slice\nInsets measured to the first fill pixel; use as cap insets. ui/ assets are at native pixel scale (source /13). inv_grid_* are full 5x5 grid panels as drawn.\n')
print(json.dumps(log,default=int)); print('fallback',FALLBACK)
