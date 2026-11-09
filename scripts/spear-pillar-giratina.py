# Builds src/templates/places/spear-pillar-giratina{,-portal}-pt.png: Giratina's shadow cut from a 256x192 Platinum
# cutscene frame laid 1:1 on the Spear Pillar map rip. usage (needs scripts/png_io.py beside it):
#   python3 scripts/spear-pillar-giratina.py <Spear_Pillar_Giratina_Pt.png> out.png emerged
#   python3 scripts/spear-pillar-giratina.py <cutscene frame 2:58, 256x192> out.png portal <Spear_Pillar_Giratina_Pt.png>
# Cut Giratina's shadow (+ red eyes / wing spikes) out of a 256x192 cutscene frame as RGBA, and composite it 1:1
# (DS pixels both) onto the Spear Pillar map rip, the portal centre (cutscene 128,110) on the platform (map 174,278).
from png_io import read, write
import sys, struct, zlib
src, out_map, mode = sys.argv[1], sys.argv[2], sys.argv[3]
EYES = sys.argv[4] if len(sys.argv) > 4 else None  # portal: the lossless capture to take crisp eyes from
MAP='src/templates/places/spear-pillar-pt.png'
w,h,bpp,rows=read(src)
P=lambda x,y: rows[y][x*bpp:x*bpp+3]
L=lambda p: 0.3*p[0]+0.59*p[1]+0.11*p[2]
neutral=lambda p: max(p)-min(p) < 28
red=lambda p: p[0]>110 and p[1]<80 and p[2]<80 and p[0]-p[1]>60
# Boxes (cutscene px) that are not Giratina: Dialga, Palkia (their dark outlines / red marks), the player.
if mode=='emerged':
    boxes=[(52,0,104,62,'dialga'),(150,0,202,62,'palkia'),(116,132,142,182,'player')]
else:
    boxes=[(52,0,104,62,'dialga'),(150,0,202,62,'palkia'),(116,142,142,182,'player')]
inbox=lambda x,y: any(a<=x<b and c<=y<d for a,c,b,d,_ in boxes)
core=[[False]*w for _ in range(h)]
for y in range(h):
    for x in range(w):
        p=P(x,y)
        if inbox(x,y): 
            # inside Dialga/Palkia only pure black (a wing passing over them) counts
            core[y][x]= neutral(p) and L(p)<14 and not (mode=='portal')
        else:
            core[y][x]= neutral(p) and L(p)<42
# drop specks: connected components < 6 px
seen=[[False]*w for _ in range(h)]
comps=[]
for y in range(h):
    for x in range(w):
        if core[y][x] and not seen[y][x]:
            st=[(x,y)]; comp=[]; seen[y][x]=True
            while st:
                cx,cy=st.pop(); comp.append((cx,cy))
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=cx+dx,cy+dy
                    if 0<=nx<w and 0<=ny<h and core[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx]=True; st.append((nx,ny))
            comps.append(comp)
# keep Giratina: the biggest shadow, plus (Giratina out) the splatters on the floor below the wings
comps.sort(key=len, reverse=True)
keep=[comps[0]] + ([c for c in comps[1:] if len(c)>=8 and min(p[1] for p in c)>=90 and 30<=min(p[0] for p in c) and max(p[0] for p in c)<=225] if mode=='emerged' else [])
for y in range(h):
    for x in range(w): core[y][x]=False
for c in keep:
    for cx,cy in c: core[cy][cx]=True
if mode=='portal':
    # the player stands in front of the portal's near edge: fill the ellipse there (centre 129,112.5; 49 x 31.5)
    for y in range(h):
        for x in range(w):
            if ((x-129)/49)**2+((y-112.5)/31.5)**2<=0.97 and 116<=x<142 and y>=128: core[y][x]=True
# alpha: core 1; red (eyes, spikes) 1 with colour; 2px soft edge from darkness against the floor
A=[[0.0]*w for _ in range(h)]; C=[[None]*w for _ in range(h)]
near=lambda x,y,r: any(0<=x+dx<w and 0<=y+dy<h and core[y+dy][x+dx] for dx in range(-r,r+1) for dy in range(-r,r+1))
for y in range(h):
    for x in range(w):
        p=P(x,y)
        if x<3 or y<1 or x>=w-3 or y>=h-3: continue  # the capture's own edge lines
        if core[y][x]: A[y][x]=1; C[y][x]=tuple(p) if neutral(p) and 10<=L(p)<42 and not (mode=='portal' and y>=125) else (0,0,0)
        elif y<125 and (red(p) and near(x,y,3) or not neutral(p) and near(x,y,1)) and not inbox(x,y): A[y][x]=1; C[y][x]=tuple(p)  # eyes (red + glow), spikes
        elif near(x,y,2) and not inbox(x,y) and neutral(p) and L(p)<125:
            A[y][x]=max(0,min(1,(125-L(p))/105)); C[y][x]=(0,0,0)
# the wings run off the top of the DS screen: fade them out over the top 14 rows instead of a hard cut
for y in range(24):
    for x in range(w): A[y][x]*=y/24
# portal: the video frame's eyes are soft red blobs, so lay in the crisp eyes from the lossless capture (same eyes, same
# 18px spacing): its 9x9 patches around (119,53) and (137,53) onto the portal's eyes at (120,110) and (138,110)
if mode=='portal' and EYES:
    ew,eh,ebpp,erows=read(EYES)
    for ex in (119,137):
        for dy in range(-4,5):
            for dx in range(-4,5):
                q=erows[53+dy][(ex+dx)*ebpp:(ex+dx)*ebpp+3]
                A[110+dy][ex+1+dx]=1; C[110+dy][ex+1+dx]=tuple(q) if not neutral(q) else (0,0,0)
# composite
mw,mh,mbpp,mrows=read(MAP)
# Giratina out: the portal's centre on the platform below the emblem (map 174,278), as in the cutscene. Giratina in
# portal: moved up so his eyes land at y ~319 of the graphic (map y 214), in the gap between the score header and the
# first set; the portal then opens over the floor emblem.
DX,DY=(174-128, 214-110) if mode=='portal' else (174-128, 278-110)
outr=[]
for y in range(mh):
    line=bytearray()
    for x in range(mw):
        p=list(mrows[y][x*mbpp:x*mbpp+3])
        cx,cy=x-DX,y-DY
        if 0<=cx<w and 0<=cy<h and A[cy][cx]>0:
            a=A[cy][cx]; c=C[cy][cx]
            p=[int(round(v*(1-a)+c[i]*a)) for i,v in enumerate(p)]
        line+=bytes(p)
    outr.append(line)
write(out_map,mw,mh,outr)
