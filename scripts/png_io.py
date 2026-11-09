import struct,zlib
def read(p):
    d=open(p,'rb').read(); i=8; idat=b''
    while i<len(d):
        l=struct.unpack('>I',d[i:i+4])[0]; t=d[i+4:i+8]; c=d[i+8:i+8+l]; i+=12+l
        if t==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',c[:10])
        if t==b'IDAT': idat+=c
    bpp={6:4,2:3}[ct]; raw=zlib.decompress(idat); st=w*bpp; out=[]; prev=bytearray(st); p=0
    for y in range(h):
        f=raw[p]; line=bytearray(raw[p+1:p+1+st]); p+=1+st
        for x in range(st):
            a=line[x-bpp] if x>=bpp else 0; b=prev[x]; c=prev[x-bpp] if x>=bpp else 0
            if f==1: line[x]=(line[x]+a)&255
            elif f==2: line[x]=(line[x]+b)&255
            elif f==3: line[x]=(line[x]+(a+b)//2)&255
            elif f==4:
                pp=a+b-c; pa,pb,pc=abs(pp-a),abs(pp-b),abs(pp-c)
                line[x]=(line[x]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
        out.append(line); prev=line
    return w,h,bpp,out
def write(path,w,h,rows):
    raw=b''.join(b'\x00'+bytes(r) for r in rows)
    def ch(t,b): return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw,9))+ch(b'IEND',b''))
