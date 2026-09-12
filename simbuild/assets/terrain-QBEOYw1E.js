import{$ as e,At as t,B as n,F as r,Ft as i,G as a,I as o,It as s,J as c,M as l,Nt as u,O as d,P as f,Pt as p,Q as m,R as h,T as g,U as _,W as v,X as y,a as b,b as x,c as S,ct as C,d as w,f as T,ft as E,h as D,ht as O,it as k,j as A,jt as j,lt as M,m as N,n as P,pt as F,q as I,rt as L,st as R,t as ee,v as z,vt as te,w as ne,xt as re,y as B,z as ie}from"./index-B7_xuTgL.js";import{t as ae}from"./service-footprints-BsxZJmr5.js";var V=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],[.7071,.7071],[-.7071,.7071],[.7071,-.7071],[-.7071,-.7071]],oe=.5*(Math.sqrt(3)-1),H=(3-Math.sqrt(3))/6,U=class{constructor(e){let t=new Uint8Array(256);for(let e=0;e<256;e++)t[e]=e;for(let n=255;n>0;n--){let r=Math.floor(e.float()*(n+1)),i=t[n];t[n]=t[r],t[r]=i}this.perm=new Uint8Array(512),this.permMod=new Uint8Array(512);for(let e=0;e<512;e++)this.perm[e]=t[e&255],this.permMod[e]=this.perm[e]%12}noise(e,t){let n=this.perm,r=this.permMod,i=0,a=0,o=0,s=(e+t)*oe,c=Math.floor(e+s),l=Math.floor(t+s),u=(c+l)*H,d=e-(c-u),f=t-(l-u),p,m;d>f?(p=1,m=0):(p=0,m=1);let h=d-p+H,g=f-m+H,_=d-1+2*H,v=f-1+2*H,y=c&255,b=l&255,x=.5-d*d-f*f;if(x>=0){let e=V[r[y+n[b]]];x*=x,i=x*x*(e[0]*d+e[1]*f)}let S=.5-h*h-g*g;if(S>=0){let e=V[r[y+p+n[b+m]]];S*=S,a=S*S*(e[0]*h+e[1]*g)}let C=.5-_*_-v*v;if(C>=0){let e=V[r[y+1+n[b+1]]];C*=C,o=C*C*(e[0]*_+e[1]*v)}return 70*(i+a+o)}fbm(e,t,n=5,r=2,i=.5){let a=1,o=1,s=0,c=0;for(let l=0;l<n;l++)s+=a*this.noise(e*o,t*o),c+=a,a*=i,o*=r;return s/c}ridged(e,t,n=5,r=2.05,i=.5,a=2){let o=.5,s=1,c=0,l=1,u=0;for(let d=0;d<n;d++){let n=1-Math.abs(this.noise(e*s,t*s));n=n**+a*l,l=Math.min(1,Math.max(0,n*2)),c+=n*o,u+=o,o*=i,s*=r}return c/u}billow(e,t,n=4){let r=1,i=1,a=0,o=0;for(let s=0;s<n;s++)a+=r*Math.abs(this.noise(e*i,t*i)),o+=r,r*=.5,i*=2;return a/o}},W=(e,t,n)=>e<t?t:e>n?n:e,se=(e,t,n)=>e+(t-e)*n;function G(e,t,n){let r=W((n-e)/(t-e),0,1);return r*r*(3-2*r)}function ce(e,t={}){let n=t.res??513,r=t.size??2048,i=r/2,a=r/(n-1),o=n*n,s=new Float32Array(o),c=new U(e.fork(`base`)),l=new U(e.fork(`mount`)),u=new U(e.fork(`warp`)),d=new U(e.fork(`detail`)),f=new U(e.fork(`river`)),p=new U(e.fork(`coast`)),m=le(f,n,i,a),h=de(p,n,i,a),g={x:-900,z:190,r:110};for(let e=0;e<n;e++){let t=-i+e*a,r=h.xAt[e];for(let o=0;o<n;o++){let h=-i+o*a,_=h+110*u.fbm(h/640,t/640,3),v=t+110*u.fbm(h/640+5.3,t/640+2.1,3),y=16+6*c.fbm(_/460,v/460,3,2,.42)+.6*c.fbm(h/110+11,t/110,2,2,.5)+.12*d.fbm(h/24,t/24,2),b=Math.max(h,Math.abs(t)),x=G(-840,-430,h),S=G(540,920,b)*x,C=.32+.32*c.fbm(_/330+3,v/330-7,4,2,.45)+.36*l.ridged(_/240+4,v/240-2,5,2.05,.5,1.15);y+=52*C*S;let w=G(-520,-980,h)*G(120,520,Math.abs(t));y+=40*(.5+.5*c.fbm(_/300-9,v/300+4,4))*w;let T=G(560,1010,b)*x;T>0&&(y+=pe(l,_,v,T,0,0));{let e=m.distance(h,t,o);if(e<420){let n=e+18*f.fbm(h/120+3,t/120,3)+4*f.fbm(h/28,t/28,2),r=m.halfWidth[o],i=10+26*(.5+.5*f.fbm(h/210+5,t/210-3,2));y=Math.min(y,ue(n,r,f,h,t,i,o))}}{let e=h-r,n=12+40*(.5+.5*p.fbm(t/260+3,h/260,2));y=Math.min(y,fe(e,p,h,t,n))}let E=G(-720,-1010,h)*G(600,1010,Math.abs(t))*G(-1024,-930,h)*G(1024,940,Math.abs(t))*(.55+.45*(.5+.5*c.fbm(_/220+6,v/220-5,3)));if(E>0){let e=-12+E*(26+40*(.5+.5*c.fbm(_/210+6,v/210-5,4,2,.5)))+pe(l,_,v,E,2,1,.45)*.22;y=Math.max(y,e)}{let e=h-g.x,n=t-g.z,r=(e*.83+n*.56)/1.35,i=(-e*.56+n*.83)/.85,a=Math.sqrt(r*r+i*i)/g.r+.12*c.fbm(h/70+2,t/70,3);if(a<1.5){let e=(1-G(.12,1.4,a))**1.15,n=l.ridged(h/150+9,t/150+4,5,2.05,.5,1.25),r=-6+G(1.2,.5,a)*4.5+24*e*(.65+.35*n)+5*e*c.fbm(h/40,t/40,3);y=Math.max(y,r)}}s[e*n+o]=y}}let _=me(s,n,e.fork(`erosion`),{droplets:t.droplets??42e3,maxSteps:48,minSeedHeight:28});he(s,n);let v=1/0,y=-1/0;for(let e=0;e<o;e++){let t=s[e];t<v&&(v=t),t>y&&(y=t)}return{heights:s,flow:_,river:m,coast:h,island:g,minH:v,maxH:y,res:n,size:r,cell:a}}function le(e,t,n,r){let i=new Float32Array(t),a=new Float32Array(t),o=t=>-300+130*Math.sin(t/280+.5)+70*Math.sin(t/110+2)+45*e.fbm(t/160,.3,3);for(let s=0;s<t;s++){let t=-n+s*r;i[s]=o(t),a[s]=34+9*e.fbm(t/140+7,1.7,2)+70*G(-330,-640,t)-8*G(650,950,t)}let s=Math.ceil(420/r);return{zAt:i,halfWidth:a,zr:o,distance:(e,a,o)=>{let c=1/0,l=Math.max(0,o-s),u=Math.min(t-2,o+s);for(let t=l;t<=u;t++){let o=-n+t*r,s=i[t],l=o+r,u=i[t+1],d=l-o,f=u-s,p=((e-o)*d+(a-s)*f)/(d*d+f*f);p=p<0?0:p>1?1:p;let m=o+d*p-e,h=s+f*p-a,g=m*m+h*h;g<c&&(c=g)}return Math.sqrt(c)}}}function ue(e,t,n,r,i,a=22,o=0){if(e<t){let a=e/t;return-8+6*a*a+.6*n.fbm(r/30,i/30,2)}let s=e-t;if(s<a)return se(-2,2.6,s/a);let c=s-a,l=35+30*(.5+.5*n.fbm(r/300+1,i/300+8,2));if(c<l)return 2.6+c/l*2.4;let u=c-l;return 5+(.14+.08*(.5+.5*n.fbm(r/90+4,i/90+2,3)))*u+.0016*u*u}function de(e,t,n,r){let i=new Float32Array(t);for(let a=0;a<t;a++){let t=-n+a*r;i[a]=-640+70*Math.sin(t/310+1.2)+50*Math.sin(t/120+.4)+60*e.fbm(t/200,.7,3)}return{xAt:i}}function fe(e,t,n,r,i=26){if(e<0){let i=-1.5+.05*e+3e-4*e*e*(e>-200?0:-1);return Math.max(-60,i)+.8*t.fbm(n/45,r/45,2)}if(e<i)return-1.5+e/i*4.6;let a=e-i;return 3.1+.035*a+.0016*a*a}function pe(e,t,n,r,i,a,o=1){let s=e.ridged(t/(520*o)+i,n/(520*o)+a,7,2.05,.52,1.3),c=e.ridged(t/(210*o)+i+7,n/(210*o)+a-3,5,2.05,.5,1.2),l=r**1.3,u=270*((1-Math.exp(-2.2*s**1.35))/(1-Math.exp(-2.2))),d=70*c*(.35+.65*s),f=22*r*(1-l);return 45*r+(u+d)*l+f}function me(e,t,n,{droplets:r=3e4,maxSteps:i=40,minSeedHeight:a=30}={}){let o=t*t,s=new Float32Array(o);for(let t=0;t<o;t++)s[t]=e[t]/300;let c=new Float32Array(o),l=.05,u=[],d=[],f=[],p=0;for(let e=-2;e<=2;e++)for(let t=-2;t<=2;t++){let n=Math.sqrt(t*t+e*e);if(n<=2){let r=1-n/2;u.push(t),d.push(e),f.push(r),p+=r}}for(let e=0;e<f.length;e++)f[e]/=p;let m=a/300;for(let e=0;e<r;e++){let e=0,r=0,a=!1;for(let i=0;i<12;i++)if(e=1+n.float()*(t-3),r=1+n.float()*(t-3),s[Math.floor(r)*t+Math.floor(e)]>m){a=!0;break}if(!a)continue;let o=0,p=0,h=1,g=1,_=0;for(let a=0;a<i;a++){let i=Math.floor(e),a=Math.floor(r);if(i<1||a<1||i>=t-2||a>=t-2)break;let m=e-i,v=r-a,y=a*t+i,b=s[y],x=s[y+1],S=s[y+t],C=s[y+t+1],w=(x-b)*(1-v)+(C-S)*v,T=(S-b)*(1-m)+(C-x)*m,E=b*(1-m)*(1-v)+x*m*(1-v)+S*(1-m)*v+C*m*v;o=o*l-w*.95,p=p*l-T*.95;let D=Math.sqrt(o*o+p*p);if(D<1e-6){let e=n.float()*Math.PI*2;o=Math.cos(e),p=Math.sin(e),D=1}o/=D,p/=D;let O=e+o,k=r+p,A=Math.floor(O),j=Math.floor(k);if(A<1||j<1||A>=t-2||j>=t-2)break;let M=O-A,N=k-j,P=j*t+A,F=s[P]*(1-M)*(1-N)+s[P+1]*M*(1-N)+s[P+t]*(1-M)*N+s[P+t+1]*M*N-E,I=Math.max(-F,.01)*h*g*6,L=E*300,R=L<=24?0:L>=70?1:((L-24)/46)**2;if(R<=0)break;if(_>I||F>0){let e=(F>0?Math.min(F,_):(_-I)*.3)*R;_-=e,s[y]+=e*(1-m)*(1-v),s[y+1]+=e*m*(1-v),s[y+t]+=e*(1-m)*v,s[y+t+1]+=e*m*v,c[y]+=e*.5}else{let e=Math.min((I-_)*.35,-F)*R;for(let n=0;n<f.length;n++){let r=(a+d[n])*t+(i+u[n]),o=e*f[n],l=s[r],p=l<o?l:o;s[r]=l-p,_+=p,c[r]+=p}}h=Math.sqrt(Math.max(0,h*h+F*4)),g*=.985,e=O,r=k}}for(let t=0;t<o;t++)e[t]=s[t]*300;let h=0;for(let e=0;e<o;e++)c[e]>h&&(h=c[e]);let g=h>0?1/(h*.12):0;for(let e=0;e<o;e++)c[e]=1-Math.exp(-c[e]*g);return c}function he(e,t){let n=e.slice();for(let r=1;r<t-1;r++)for(let i=1;i<t-1;i++){let a=r*t+i,o=n[a],s=(n[a-1]+n[a+1]+n[a-t]+n[a+t])*.25,c=o-s;Math.abs(c)>2.5&&(e[a]=s+c*.4)}}var ge=new p,_e=class{constructor(t,n=0,r=16){this.res=t.res,this.size=t.size,this.half=t.size/2,this.cell=t.cell,this.heights=t.heights,this.flow=t.flow,this.seaLevel=n,this.chunks=r,this.cellsPerChunk=(this.res-1)/r,this.chunkSize=this.size/r,this.chunkMin=new Float32Array(r*r),this.chunkMax=new Float32Array(r*r),this.minH=0,this.maxH=0,this.heightTex=new g(this.heights,this.res,this.res,E,l),this.heightTex.magFilter=this.heightTex.minFilter=e,this.heightTex.generateMipmaps=!1,this.heightTex.wrapS=this.heightTex.wrapT=B,this.heightTex.needsUpdate=!0,this.normalData=new Uint8Array(this.res*this.res*4),this.normalTex=new g(this.normalData,this.res,this.res,M,j),this.normalTex.magFilter=this.normalTex.minFilter=_,this.normalTex.generateMipmaps=!1,this.normalTex.wrapS=this.normalTex.wrapT=B,this._blurS=new Float32Array(this.res*this.res),this._blurL=new Float32Array(this.res*this.res),this.rebuildDerived(0,0,this.res-1,this.res-1),this.rebuildAllChunkBounds(),this.version=0}getHeight(e,t){let n=this.res,r=this.heights,i=(e+this.half)/this.cell,a=(t+this.half)/this.cell;i<0?i=0:i>n-1.0001&&(i=n-1.0001),a<0?a=0:a>n-1.0001&&(a=n-1.0001);let o=i|0,s=a|0,c=i-o,l=a-s,u=s*n+o,d=r[u],f=r[u+1],p=r[u+n],m=r[u+n+1];return(d*(1-c)+f*c)*(1-l)+(p*(1-c)+m*c)*l}getNormal(e,t,n){n||=new p;let r=this.cell*.5,i=this.getHeight(e+r,t)-this.getHeight(e-r,t),a=this.getHeight(e,t+r)-this.getHeight(e,t-r);return n.set(-i,2*r,-a).normalize()}getSlope(e,t){let n=this.getNormal(e,t,ge);return Math.acos(Math.min(1,Math.max(-1,n.y)))}isWater(e,t){return this.getHeight(e,t)<this.seaLevel}raycast(e){let t=e.origin,n=e.direction,r=0,i=2e4,a=this.half,o=(e,t,n,a)=>{if(Math.abs(t)<1e-9){(e<n||e>a)&&(i=-1);return}let o=(n-e)/t,s=(a-e)/t;if(o>s){let e=o;o=s,s=e}o>r&&(r=o),s<i&&(i=s)};if(o(t.x,n.x,-a,a),o(t.z,n.z,-a,a),o(t.y,n.y,this.minH-1,this.maxH+1),i<r)return null;let s=r,c=r,l=t.y+n.y*s-this.getHeight(t.x+n.x*s,t.z+n.z*s);if(l<0){let e=new p(t.x+n.x*s,t.y+n.y*s,t.z+n.z*s);return{point:e,normal:this.getNormal(e.x,e.z)}}let u=this.cell*.35;for(let e=0;e<4e3&&s<i;e++){let e=l/3.5;e<u&&(e=u),e>64&&(e=64),s+=e,s>i&&(s=i);let r=t.x+n.x*s,a=t.z+n.z*s,o=t.y+n.y*s-this.getHeight(r,a);if(o<=0){let e=c,r=s;for(let i=0;i<10;i++){let i=(e+r)*.5,a=t.x+n.x*i,o=t.z+n.z*i;t.y+n.y*i-this.getHeight(a,o)>0?e=i:r=i}let i=(e+r)*.5,a=new p(t.x+n.x*i,0,t.z+n.z*i);return a.y=this.getHeight(a.x,a.z),{point:a,normal:this.getNormal(a.x,a.z)}}c=s,l=o}return null}modify(e){let{x:t,z:n,radius:r=20}=e,i=e.strength??1,a=e.mode||`raise`,o=this.res,s=this.heights,c=(t+this.half)/this.cell,l=(n+this.half)/this.cell,u=r/this.cell,d=Math.max(0,Math.floor(c-u)),f=Math.min(o-1,Math.ceil(c+u)),p=Math.max(0,Math.floor(l-u)),m=Math.min(o-1,Math.ceil(l+u));if(f<d||m<p)return null;let h=a===`flatten`?e.target??this.getHeight(t,n):0,g=null;a===`smooth`&&(g=s.slice());for(let e=p;e<=m;e++)for(let t=d;t<=f;t++){let n=(t-c)/u,r=(e-l)/u,d=Math.sqrt(n*n+r*r);if(d>=1)continue;let f=1-d*d*(3-2*d),p=e*o+t;switch(a){case`raise`:s[p]+=i*f;break;case`lower`:s[p]-=i*f;break;case`flatten`:s[p]+=(h-s[p])*Math.min(1,f*i);break;case`smooth`:{let n=0,r=0;for(let i=-2;i<=2;i++)for(let a=-2;a<=2;a++){let s=t+a,c=e+i;s<0||c<0||s>=o||c>=o||(n+=g[c*o+s],r++)}s[p]+=(n/r-s[p])*Math.min(1,f*i);break}}}this.rebuildDerived(Math.max(0,d-10),Math.max(0,p-10),Math.min(o-1,f+10),Math.min(o-1,m+10)),this.heightTex.needsUpdate=!0,this.normalTex.needsUpdate=!0;let _=Math.floor(d/this.cellsPerChunk),v=Math.min(this.chunks-1,Math.floor(f/this.cellsPerChunk)),y=Math.floor(p/this.cellsPerChunk),b=Math.min(this.chunks-1,Math.floor(m/this.cellsPerChunk));for(let e=y;e<=b;e++)for(let t=_;t<=v;t++)this.rebuildChunkBounds(t,e);return this.version++,{ix0:d,iz0:p,ix1:f,iz1:m}}setHeights(e,t,n,r,i){if(![e,t,n,r].every(Number.isInteger)||e<0||t<0||n>=this.res||r>=this.res||n<e||r<t)return!1;let a=n-e+1,o=a*(r-t+1);if(!i||i.length!==o)return!1;for(let e=0;e<o;e++)if(!Number.isFinite(i[e])||Math.abs(i[e])>34028234663852886e22)return!1;for(let n=t;n<=r;n++){let r=(n-t)*a;for(let t=0;t<a;t++)this.heights[n*this.res+e+t]=i[r+t]}return this.rebuildDerived(Math.max(0,e-10),Math.max(0,t-10),Math.min(this.res-1,n+10),Math.min(this.res-1,r+10)),this.heightTex.needsUpdate=!0,this.rebuildAllChunkBounds(),this.version++,!0}rebuildAllChunkBounds(){let e=1/0,t=-1/0;for(let n=0;n<this.chunks;n++)for(let r=0;r<this.chunks;r++){this.rebuildChunkBounds(r,n);let i=n*this.chunks+r;this.chunkMin[i]<e&&(e=this.chunkMin[i]),this.chunkMax[i]>t&&(t=this.chunkMax[i])}this.minH=e,this.maxH=t}rebuildChunkBounds(e,t){let n=this.res,r=this.cellsPerChunk,i=1/0,a=-1/0;for(let o=t*r;o<=t*r+r;o++){let t=o*n;for(let n=e*r;n<=e*r+r;n++){let e=this.heights[t+n];e<i&&(i=e),e>a&&(a=e)}}let o=t*this.chunks+e;this.chunkMin[o]=i,this.chunkMax[o]=a,i<this.minH&&(this.minH=i),a>this.maxH&&(this.maxH=a)}rebuildDerived(e,t,n,r){let i=this.res,a=this.heights,o=this.cell,s=this.normalData,c=Math.max(0,e-8),l=Math.min(i-1,n+8),u=Math.max(0,t-8),d=Math.min(i-1,r+8),f=(e,t)=>{let n=this._tmpRow||=new Float32Array(i*i);for(let e=u;e<=d;e++){let r=e*i;for(let e=c;e<=l;e++){let o=0,s=0;for(let n=-t;n<=t;n++){let t=e+n;t>=0&&t<i&&(o+=a[r+t],s++)}n[r+e]=o/s}}for(let r=u;r<=d;r++)for(let a=c;a<=l;a++){let o=0,s=0;for(let e=-t;e<=t;e++){let t=r+e;t>=0&&t<i&&(o+=n[t*i+a],s++)}e[r*i+a]=o/s}};f(this._blurS,2),f(this._blurL,8);for(let c=t;c<=r;c++)for(let t=e;t<=n;t++){let e=c*i+t,n=a[c*i+(t>0?t-1:t)],r=a[c*i+(t<i-1?t+1:t)],l=a[(c>0?c-1:c)*i+t],u=a[(c<i-1?c+1:c)*i+t],d=t>0&&t<i-1?2*o:o,f=c>0&&c<i-1?2*o:o,p=(n-r)/d,m=(l-u)/f,h=1,g=Math.sqrt(p*p+h*h+m*m);p/=g,h/=g,m/=g;let _=this._blurS[e]-a[e],v=this._blurL[e]-a[e],y=1-Math.min(.5,Math.max(0,_)*.3)-Math.min(.4,Math.max(0,v)*.05);y=Math.min(1,y+Math.max(0,-_)*.04+Math.max(0,-v)*.01);let b=e*4;s[b]=Math.round((p*.5+.5)*255),s[b+1]=Math.round((m*.5+.5)*255),s[b+2]=Math.round(Math.max(.3,Math.min(1,y))*255),s[b+3]=Math.round(Math.min(1,Math.max(0,this.flow[e]))*255)}this.normalTex.needsUpdate=!0}dispose(){this.heightTex.dispose(),this.normalTex.dispose()}},K=[32,16,8];function ve(e,t=!0){let n=e+1,r=n*n+(t?4*n:0),i=new Float32Array(r*3),a=0;for(let t=0;t<n;t++)for(let r=0;r<n;r++)i[a++]=r/e,i[a++]=0,i[a++]=t/e;let o=n*n,s=[];for(let r=0;r<(t?4:0);r++){let t=o+r*n;s.push(t);for(let t=0;t<n;t++){let n=t/e,o,s;r===0?(o=n,s=0):r===1?(o=n,s=1):r===2?(o=0,s=n):(o=1,s=n),i[a++]=o,i[a++]=1,i[a++]=s}}let c=[],l=(e,t)=>t*n+e;for(let t=0;t<e;t++)for(let n=0;n<e;n++){let e=l(n,t),r=l(n+1,t),i=l(n,t+1),a=l(n+1,t+1);c.push(e,i,r,r,i,a)}for(let n=0;n<(t?e:0);n++){let t=l(n,0),r=l(n+1,0),i=s[0]+n,a=s[0]+n+1;c.push(t,r,i,r,a,i),t=l(n,e),r=l(n+1,e),i=s[1]+n,a=s[1]+n+1,c.push(t,i,r,r,i,a),t=l(0,n),r=l(0,n+1),i=s[2]+n,a=s[2]+n+1,c.push(t,i,r,r,i,a),t=l(e,n),r=l(e,n+1),i=s[3]+n,a=s[3]+n+1,c.push(t,r,i,r,a,i)}return{position:new N(i,3),index:new N(new Uint16Array(c),1),triangles:c.length/3}}var ye=class{constructor(e,t,n,{lodScale:i=1,layer:a=1,proxyMaterial:o=null}={}){this.reflectionPass=!1,this.data=e,this.chunks=e.chunks,this.chunkSize=e.chunkSize,this.lodScale=i,this.group=new r,this.group.name=`terrain-chunks`,this.meshes=[],this.attrs=[],this.nbrAttrs=[],this.proxyNbrAttrs=[];let s=this.chunks*this.chunks;for(let r=0;r<K.length;r++){let i=ve(K[r]),o=new ie;o.setAttribute(`position`,i.position),o.setIndex(i.index);let l=new Float32Array(s*4),u=new h(l,4);u.setUsage(d),o.setAttribute(`aChunk`,u);let f=new h(new Float32Array(s*4),4);f.setUsage(d),o.setAttribute(`aNbr`,f),o.instanceCount=0,o.boundingSphere=new re(new p(0,0,0),e.size*2),o.boundingBox=new T(new p(-e.size,-1e3,-e.size),new p(e.size,1e3,e.size));let m=new c(o,t);m.name=`terrain-lod${r}`,m.customDepthMaterial=n,m.frustumCulled=!1,m.castShadow=!0,m.receiveShadow=!0,m.layers.enable(a),m.raycast=()=>{},m.matrixAutoUpdate=!1,m.onBeforeRender=()=>{this.reflectionPass&&(m.geometry._savedCount=m.geometry.instanceCount,m.geometry.instanceCount=0)},m.onAfterRender=()=>{this.reflectionPass&&(m.geometry.instanceCount=m.geometry._savedCount)},this.group.add(m),this.meshes.push(m),this.attrs.push(u),this.nbrAttrs.push(f)}this.proxies=[],this.proxyAttrs=[];for(let r=1;r<K.length;r++){let i=ve(K[r],!1),l=new ie;l.setAttribute(`position`,i.position),l.setIndex(i.index);let u=new h(new Float32Array(s*4),4);u.setUsage(d),l.setAttribute(`aChunk`,u);let f=new h(new Float32Array(s*4),4);f.setUsage(d),l.setAttribute(`aNbr`,f),l.instanceCount=0,l.boundingSphere=new re(new p(0,0,0),e.size*2);let m=new c(l,o||t);m.name=`terrain-proxy-lod${r}`,m.customDepthMaterial=n,m.frustumCulled=!1,m.castShadow=!1,m.receiveShadow=!0,m.layers.enable(a),m.raycast=()=>{},m.matrixAutoUpdate=!1,m.onBeforeRender=()=>{this.reflectionPass||(l._savedCount=l.instanceCount,l.instanceCount=0)},m.onAfterRender=()=>{this.reflectionPass||(l.instanceCount=l._savedCount)},this.group.add(m),this.proxies.push(m),this.proxyAttrs.push(u),this.proxyNbrAttrs.push(f)}this.boxes=[],this.centers=[];for(let t=0;t<this.chunks;t++)for(let n=0;n<this.chunks;n++)this.boxes.push(new T),this.centers.push(new u((n+.5)*this.chunkSize-e.half,(t+.5)*this.chunkSize-e.half));this.refreshBounds(),this._frustum=new f,this._pv=new I,this._lastCam=new I,this._lastProj=new I,this._counts=[0,0,0],this._lodAll=new Int8Array(this.chunks*this.chunks),this._plodAll=new Int8Array(this.chunks*this.chunks),this._dirty=!0,this.stats={visible:0,lod:[0,0,0]}}refreshBounds(){let e=this.data;for(let t=0;t<this.chunks;t++)for(let n=0;n<this.chunks;n++){let r=t*this.chunks+n,i=n*this.chunkSize-e.half,a=t*this.chunkSize-e.half;this.boxes[r].min.set(i-110,e.chunkMin[r]-45,a-110),this.boxes[r].max.set(i+this.chunkSize+110,e.chunkMax[r]+5,a+this.chunkSize+110)}this._dirty=!0}update(e){if(!this._dirty&&this._lastCam.equals(e.matrixWorld)&&this._lastProj.equals(e.projectionMatrix))return;this._lastCam.copy(e.matrixWorld),this._lastProj.copy(e.projectionMatrix),this._dirty=!1,this._pv.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(this._pv);let t=e.position,n=300*this.lodScale,r=820*this.lodScale,i=this._counts;i[0]=i[1]=i[2]=0;let a=this._pcounts||=[0,0];a[0]=a[1]=0;let o=420*this.lodScale,s=this.chunkSize*.5,c=this.chunks,l=this._lodAll,u=this._plodAll;for(let e=0;e<this.boxes.length;e++){let i=this.centers[e],a=Math.max(0,Math.abs(t.x-i.x)-s),c=Math.max(0,Math.abs(t.z-i.y)-s),d=Math.max(0,t.y-this.data.chunkMax[e]),f=Math.sqrt(a*a+c*c+d*d*.5);l[e]=f<n?0:f<r?1:2,u[e]=f<o?1:2}for(let e=0;e<this.boxes.length;e++){if(!this._frustum.intersectsBox(this.boxes[e]))continue;let t=this.centers[e],n=e%c,r=e/c|0,o=l[e],d=this.attrs[o].array,f=this.nbrAttrs[o].array,p=i[o]++*4;d[p]=t.x-s,d[p+1]=t.y-s,d[p+2]=this.chunkSize,d[p+3]=o,f[p]=n>0?l[e-1]:o,f[p+1]=n<c-1?l[e+1]:o,f[p+2]=r>0?l[e-c]:o,f[p+3]=r<c-1?l[e+c]:o;let m=u[e]-1,h=this.proxyAttrs[m].array,g=this.proxyNbrAttrs[m].array,_=a[m]++*4;h[_]=t.x-s,h[_+1]=t.y-s,h[_+2]=this.chunkSize,h[_+3]=m+1,g[_]=n>0?u[e-1]:m+1,g[_+1]=n<c-1?u[e+1]:m+1,g[_+2]=r>0?u[e-c]:m+1,g[_+3]=r<c-1?u[e+c]:m+1}for(let e=0;e<2;e++){let t=this.proxyAttrs[e],n=this.proxyNbrAttrs[e];t.clearUpdateRanges(),t.addUpdateRange(0,a[e]*4),t.needsUpdate=!0,n.clearUpdateRanges(),n.addUpdateRange(0,a[e]*4),n.needsUpdate=!0,this.proxies[e].geometry.instanceCount=a[e],this.proxies[e].visible=a[e]>0}let d=0;for(let e=0;e<3;e++){let t=this.attrs[e],n=this.nbrAttrs[e];t.clearUpdateRanges(),t.addUpdateRange(0,i[e]*4),t.needsUpdate=!0,n.clearUpdateRanges(),n.addUpdateRange(0,i[e]*4),n.needsUpdate=!0,this.meshes[e].geometry.instanceCount=i[e],this.meshes[e].visible=i[e]>0,this.stats.lod[e]=i[e],d+=i[e]}this.stats.visible=d}setMaterial(e){for(let t of this.meshes)t.material=e}dispose(){for(let e of this.meshes)e.geometry.dispose();for(let e of this.proxies)e.geometry.dispose()}},q=175;function be(e,t,n,r){let i=Math.floor(e/q),a=Math.floor(t/q),o=1e9,s=1e9,c=0,l=0;for(let r=-1;r<=1;r++)for(let u=-1;u<=1;u++){let d=i+u,f=a+r,p=(d+.15+.7*P(d,f,n))*q,m=(f+.15+.7*P(d,f,n+1))*q,h=p-e,g=m-t,_=P(d,f,n+2)*Math.PI,v=Math.cos(_),y=Math.sin(_),b=h*v+g*y,x=-h*y+g*v,S=Math.sqrt(b*b*.55+x*x*1.6);S<o?(s=o,o=S,c=d,l=f):S<s&&(s=S)}return r.f1=o,r.f2=s,r.idx=c,r.idz=l,r}function xe(e,t,n=512){let{heights:r,res:i,cell:a,flow:o}=t,s=t.size,c=s/2,l=new Uint8Array(n*n*4),u=new U(e.fork(`patch`)),d=new U(e.fork(`dry`)),f=new U(e.fork(`lush`)),p=new U(e.fork(`fine`)),m=new U(e.fork(`track`)),h={f1:0,f2:0,idx:0,idz:0},g=(e,t)=>{let n=(e+c)/a,o=(t+c)/a;n=W(n,0,i-1.001),o=W(o,0,i-1.001);let s=n|0,l=o|0,u=n-s,d=o-l,f=l*i+s;return(r[f]*(1-u)+r[f+1]*u)*(1-d)+(r[f+i]*(1-u)+r[f+i+1]*u)*d},_=s/n;for(let e=0;e<n;e++){let r=-c+(e+.5)*_;for(let s=0;s<n;s++){let v=-c+(s+.5)*_,y=g(v,r),b=g(v+6,r)-g(v-6,r),x=g(v,r+6)-g(v,r-6),S=Math.sqrt(b*b+x*x)/12,C=W(((g(v+40,r)+g(v-40,r)+g(v,r+40)+g(v,r-40))*.25-y)/6,-1,1),w=W(-x/12*6,0,1),T=G(2.4,6.5,y),E=T*(1-G(.1,.22,S))*(1-G(60,140,y)),D=1e9;if(t.river){let e=W(Math.round((v+c)/a),0,i-1);Math.abs(r-t.river.zAt[e])<200&&(D=t.river.distance(v,r,e))}let O=o?o[W(Math.round((r+c)/a),0,i-1)*i+W(Math.round((v+c)/a),0,i-1)]:0;be(v,r,101,h);let k=P(h.idx,h.idz,7),A=P(h.idx,h.idz,9),j=h.f2-h.f1,M=(.5+.5*d.fbm(v/520+3,r/520-1,3,2,.5))*.38+(k-.5)*.75*E+.22*(.5+.5*d.fbm(v/95,r/95,3))-.06;M+=G(80,220,y)*.5,M-=.15*G(420,150,Math.hypot(v,r)),M+=G(.08,.2,S)*.2,M=W(M,0,1);let N=G(.52,.72,.5+.5*f.fbm(v/150+8,r/150+2,4,2.1,.5)+.12*f.fbm(v/35,r/35,2)),F=.55*Math.max(0,C)+.35*w*G(.03,.12,S)+.7*N+.4*G(140,40,D)*T;F*=T*(1-G(120,220,y)),F=W(F*(1-M*.5),0,1);let I=G(.7,.81,.5+.5*u.fbm(v/80+1,r/80+5,4,2,.5)+.15*u.fbm(v/18,r/18,2))*.75*E,L=G(.968,.99,1-Math.abs(m.fbm(v/260+2,r/260+4,2,2,.5)))*E*(1-G(.06,.12,S)),R=+(A>.45)*(1-G(2,6,j))*E*.6;I=Math.max(I,L*.7,R*(.45+.4*A)),I=Math.max(I,G(.25,.8,O)*.6),I=Math.max(I,G(.75,1,F)*.35*(.5+.5*u.fbm(v/30,r/30,2))),I=W(I,0,1);let ee=W(.5+.5*(.6*p.fbm(v/22,r/22,3,2,.5)+.4*p.fbm(v/7+3,r/7,2)),0,1),z=(e*n+s)*4;l[z]=Math.round(I*255),l[z+1]=Math.round(M*255),l[z+2]=Math.round(F*255),l[z+3]=Math.round(ee*255)}}return{data:l,size:n}}var J=`
attribute vec4 aChunk;   // originX, originZ, size, lod
attribute vec4 aNbr;     // lod of the -x, +x, -z, +z neighbour chunks (edge stitching)
uniform highp sampler2D uHeightTex;
uniform sampler2D uNormalTex;
uniform float uWorldMin;
uniform float uCell;
uniform float uLodDrop;   // metres the surface is lowered (shadow pass: hides coarse-vs-fine acne)
uniform float uSkirt;     // skirt depth scale (0 in the shadow pass: skirt walls of coarse chunks must not cast lines)
varying vec3 vWPos;
`,Y=`
vec2 tWxz = aChunk.xy + position.xz * aChunk.z;
ivec2 tOi = ivec2((aChunk.xy - uWorldMin) / uCell + 0.5);   // chunk origin texel
vec2 tRel = position.xz * 32.0;                              // texel offset inside the chunk (chunk = 32 cells)
float tH;
// edge vertices that face a coarser neighbour are snapped onto that neighbour's (linear) edge: crack-free seams
float tNb = -1.0;
bool tEx = position.x < 0.001 || position.x > 0.999;
bool tEz = position.z < 0.001 || position.z > 0.999;
if (tEx) tNb = position.x < 0.5 ? aNbr.x : aNbr.y;
else if (tEz) tNb = position.z < 0.5 ? aNbr.z : aNbr.w;
if (tNb > aChunk.w + 0.5) {
  float tS = exp2(tNb);                                      // texels per coarse cell
  float tA = tEx ? tRel.y : tRel.x;
  float t0 = floor(tA / tS + 1e-4) * tS;
  float tF = clamp((tA - t0) / tS, 0.0, 1.0);
  float t1 = min(t0 + tS, 32.0);
  ivec2 i0 = tEx ? ivec2(int(tRel.x + 0.5), int(t0 + 0.5)) : ivec2(int(t0 + 0.5), int(tRel.y + 0.5));
  ivec2 i1 = tEx ? ivec2(int(tRel.x + 0.5), int(t1 + 0.5)) : ivec2(int(t1 + 0.5), int(tRel.y + 0.5));
  tH = mix(texelFetch(uHeightTex, tOi + i0, 0).r, texelFetch(uHeightTex, tOi + i1, 0).r, tF);
} else {
  tH = texelFetch(uHeightTex, tOi + ivec2(tRel + 0.5), 0).r;
}
tH -= position.y * 0.8 * uSkirt + uLodDrop;   // token skirt (seams are stitched); constant drop = no caster step at LOD seams
vec3 transformed = vec3(tWxz.x, tH, tWxz.y);
vWPos = transformed;
`,Se=`
#ifdef T_NO_VNORMAL
vec3 objectNormal = vec3(0.0, 1.0, 0.0);
#else
vec2 nWxz = aChunk.xy + position.xz * aChunk.z;
ivec2 nGi = ivec2((nWxz - uWorldMin) / uCell + 0.5);
vec4 nTex = texelFetch(uNormalTex, nGi, 0);
vec3 objectNormal = vec3(nTex.r * 2.0 - 1.0, 0.0, nTex.g * 2.0 - 1.0);
objectNormal.y = sqrt(max(0.0, 1.0 - dot(objectNormal.xz, objectNormal.xz)));
#endif
`,Ce=`
vec3 terrainGrassTint(vec4 land, vec4 mac2, vec4 mac3, float alt) {
  float dry = clamp(land.g + (mac2.a - 0.5) * 0.18 + alt * 0.8, 0.0, 1.0);
  float lush = land.b;
  vec3 tint = mix(vec3(0.038, 0.090, 0.018), vec3(0.235, 0.200, 0.082), dry);   // meadow green -> straw
  tint = mix(tint, vec3(0.011, 0.028, 0.006), lush * 0.9);                       // forest floor / lush hollows
  tint *= 0.74 + 0.52 * land.a;                                                  // 8-25 m grain
  tint *= 0.90 + 0.20 * mac3.g;
  return tint;
}
`,we=`
uniform sampler2D uNormalTex;
uniform sampler2D uMacro;
uniform sampler2D uLandTex;





uniform float uWorldMin;
uniform float uWorldSize;
uniform float uCell;
uniform float uRes;
uniform float uSeaLevel;
uniform float uNormalFlip;
varying vec3 vWPos;
const vec3 LUMW = vec3(0.30, 0.55, 0.15);
uniform highp sampler2DArray uAlbedoLayers;
vec4 tColor(float layer, vec2 uv) { return texture(uAlbedoLayers, vec3(uv, layer)); }
uniform highp sampler2DArray uDetailNormals;
vec3 tNor(float layer, vec2 uv) { return texture(uDetailNormals, vec3(uv, layer)).xyz * 2.0 - 1.0; }
${Ce}
`,Te=`
vec2 wp = vWPos.xz;
vec2 nuv = ((wp - uWorldMin) / uCell + 0.5) / uRes;
vec4 ntex = texture2D(uNormalTex, nuv);
vec3 gN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
gN.y = sqrt(max(0.0, 1.0 - dot(gN.xz, gN.xz)));
float cavAO = ntex.b;
float flow = ntex.a;
float th = vWPos.y - uSeaLevel;
float camD = distance(cameraPosition, vWPos);
float far = smoothstep(80.0, 700.0, camD);
float veryFar = smoothstep(600.0, 2200.0, camD);

vec4 land = texture2D(uLandTex, (wp - uWorldMin) / uWorldSize);
vec4 mac  = texture2D(uMacro, wp / 760.0);
const mat2 rotC0 = mat2(0.809, -0.588, 0.588, 0.809);
#ifdef T_NO_MACRO
vec4 mac2 = vec4(0.5), mac3 = vec4(0.5);
#else
vec4 mac2 = texture2D(uMacro, wp / 170.0 + 0.37);
vec4 mac3 = texture2D(uMacro, wp / 41.0 + 0.71);
#endif
vec4 macF = texture2D(uMacro, rotC0 * wp / 11.0 + 0.19);
float fine = clamp(land.a + (macF.r - 0.5) * 0.7, 0.0, 1.0);
// land-cover edges: re-threshold the 4 m/texel map with the fine noise so patch borders are organic, not blocky
float landDirt = smoothstep(0.22, 0.78, land.r + (macF.g - 0.5) * 0.55 + (mac3.r - 0.5) * 0.25);
float landLush = smoothstep(0.15, 0.85, land.b + (macF.b - 0.5) * 0.4);
land.r = landDirt; land.b = landLush;

float slope = 1.0 - gN.y;
float alt = smoothstep(140.0, 330.0, th);
// rock -> scree -> grass over a wide, noisy band (30-60 m on the hillsides), never a hard skirt line
float slopeN = slope + (mac2.g - 0.5) * 0.12 + (mac3.b - 0.5) * 0.07 + (fine - 0.5) * 0.03 + alt * 0.05;
float wRock = smoothstep(0.11, 0.27, slopeN);
float wScree = smoothstep(0.055, 0.13, slopeN) * (1.0 - wRock);
float wDirt = smoothstep(0.035, 0.10, slope + (mac3.r - 0.5) * 0.04) * 0.5;
wDirt = max(wDirt, land.r);
wDirt = max(wDirt, smoothstep(0.15, 0.7, flow) * 0.8);
wDirt = max(wDirt, alt * 0.35);
// shore: sand where the ground is low and gentle (width follows slope + noise); some banks are mud/reeds instead
float sandLim = 1.5 + (mac2.b - 0.5) * 1.4 + (fine - 0.5) * 0.5 - slope * 9.0;
float beachy = smoothstep(0.30, 0.55, mac.b * 0.7 + mac2.a * 0.3);
float wSand = smoothstep(sandLim + 0.5, sandLim - 0.5, th) * beachy;
float wMud = smoothstep(2.4, 0.3, th) * (1.0 - beachy) * 0.8;
wDirt = max(wDirt, wMud);
wDirt *= (1.0 - wRock) * (1.0 - wSand);
wScree *= (1.0 - wSand) * (1.0 - wDirt * 0.6);
wSand *= (1.0 - wRock);
float wGrass = max(0.0, 1.0 - wRock - wScree - wDirt - wSand);

// tiling: a fine layer near the camera (fades out by ~450 m) over two rotated coarse layers (aperiodic blend)
float nearK = 1.0 - smoothstep(250.0, 480.0, camD);
mat2 rotC = mat2(0.809, -0.588, 0.588, 0.809);         // 36 deg
mat2 rotD = mat2(0.559, 0.829, -0.829, 0.559);         // -56 deg
vec2 wpR = rotC * wp;
vec3 albedo = vec3(0.0);
vec3 pert = vec3(0.0);       // world-space normal perturbation (xz tilt)
float rough = 0.0;
float detAO = 0.0;
float nStr = nearK * 0.9;

if (wGrass > 0.02) {
  // the photo texture only supplies luminance detail (its olive hue is replaced by the palette)
  vec2 uvB = (wpR + (mac.rg - 0.5) * 9.0) / 61.0;
  vec2 uvC = (rotD * wp + (mac.ba - 0.5) * 11.0) / 47.0;
  float lB = dot(tColor(0.0, uvB).rgb, LUMW), lC = dot(tColor(0.0, uvC).rgb, LUMW);
  float lum = min(1.7, mix(lB, lC, smoothstep(0.3, 0.7, mac2.g)) / 0.125);
  float det = mix(1.0, lum, 0.55 - 0.15 * far);
  // aerial grain: a third, unwarped coarse sample at 23 m keeps 0.5-3 m texture alive where the fine layer is gone
  float lD = dot(tColor(0.0, (rotD * wpR) / 23.0 + 0.41).rgb, LUMW) / 0.125;
  det *= mix(1.0, 0.7 + 0.3 * lD, (1.0 - nearK) * 0.8 + 0.2);
  float grassAO = 1.0;
  vec3 hue = vec3(1.0);
  #ifndef T_NO_FINE
  if (nearK > 0.001) {
    // fine ground-level layer (leafy grass, 4 m repeat): luminance detail + normals
    vec2 uvA = wp / 4.0;
    vec3 cf = tColor(1.0, uvA).rgb;
    float lf = dot(cf, LUMW) / 0.24;
    det *= mix(1.0, 0.22 + 0.9 * lf, nearK * 0.9);
    hue = mix(hue, normalize(cf + 0.02) * 1.55, nearK * 0.45);         // leaf-litter / blade hue variation
    vec3 n2 = tNor(0.0, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wGrass * 0.9;
    grassAO = mix(1.0, 0.6 + 0.45 * lf, nearK * 0.75);
    // micro layer (< 140 m): 1.7 m repeat, rotated; blade-level grain at street level
    float microK = 1.0 - smoothstep(60.0, 140.0, camD);
    if (microK > 0.001) {
      vec2 uvM = (rotC * wp) / 1.7 + 0.13;
      vec3 cm = tColor(1.0, uvM).rgb;
      det *= mix(1.0, 0.4 + 0.65 * dot(cm, LUMW) / 0.24, microK * 0.65);
      vec3 n3 = tNor(0.0, uvM);
      pert += vec3(n3.x, 0.0, n3.y * uNormalFlip) * wGrass * 0.6 * microK;
    }
  }
  #endif
  vec3 tint = terrainGrassTint(land, mac2, mac3, alt);
  // dry blades bleach the highlights, lush grass keeps them saturated
  vec3 c = tint * det * hue;
  c = mix(c, c * vec3(1.06, 1.0, 0.9), land.g * 0.5);
  albedo += c * wGrass;
  rough += 0.92 * wGrass;
  detAO += grassAO * wGrass;
}
if (wDirt > 0.02) {
  vec2 uvB = (wpR + (mac.ba - 0.5) * 14.0) / 38.0;
  vec3 cd = tColor(2.0, uvB).rgb;
  float dl = dot(cd, LUMW) / 0.09;
  vec3 c = mix(vec3(0.092, 0.082, 0.062), vec3(0.185, 0.165, 0.125), mac2.b) * mix(1.0, dl, 0.45 - 0.15 * far) * (0.85 + 0.3 * fine);
  if (nearK > 0.001) {
    vec2 uvA = wp / 6.0;
    vec3 cn = tColor(2.0, uvA).rgb;
    c = mix(c, c * normalize(cn + 0.02) * 1.6 * (0.5 + 0.5 * dot(cn, LUMW) / 0.09), nearK * 0.3);
    vec3 n2 = tNor(1.0, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wDirt * 0.8;
  }
  c = mix(c, c * vec3(0.55, 0.5, 0.42), wMud * 0.7);      // wet mud is darker
  albedo += c * wDirt;
  rough += 0.93 * wDirt;
  detAO += (0.85 + 0.15 * mac3.r) * wDirt;
}
if (wSand > 0.02) {
  vec2 uvB = wpR / 30.0;
  vec3 c = tColor(4.0, uvB).rgb;
  if (nearK > 0.001) {
    vec2 uvA = wp / 5.0;
    c = mix(c, tColor(4.0, uvA).rgb, nearK * 0.6);
    vec3 n2 = tNor(3.0, uvA);
    pert += vec3(n2.x, 0.0, n2.y * uNormalFlip) * wSand * 0.5;
  }
  // grey-tan shingle/sand instead of the pink source; darker pebbly patches from the fine channel
  c *= vec3(0.74, 0.74, 0.66) * (0.8 + 0.35 * fine);
  c = mix(c, c * vec3(0.7, 0.7, 0.68), smoothstep(0.6, 0.85, mac3.r) * 0.5);
  albedo += c * wSand;
  rough += 0.82 * wSand;
  detAO += 0.95 * wSand;
}
if (wScree > 0.02) {
  vec3 c = tColor(5.0, (rotD * wp) / 14.0).rgb * 0.5;
  c *= mix(vec3(0.82, 0.8, 0.76), vec3(1.0, 0.94, 0.84), mac3.a) * (0.8 + 0.4 * fine);
  c = mix(c, c * vec3(0.85, 1.0, 0.7), smoothstep(0.3, 0.8, land.b) * 0.4);   // moss between the stones
  albedo += c * wScree;
  rough += 0.9 * wScree;
  detAO += (0.75 + 0.25 * mac3.b) * wScree;
}
#ifndef T_NO_ROCK
if (wRock > 0.05) {
  vec3 bw = abs(gN); bw = bw * bw * bw * bw; bw /= (bw.x + bw.y + bw.z);
  float s = mix(12.0, 58.0, 0.35 + 0.65 * far);
  vec2 uvx = vWPos.zy / s, uvy = vWPos.xz / s, uvz = vWPos.xy / s;
  vec3 c = tColor(3.0, uvx).rgb * bw.x + tColor(3.0, uvy).rgb * bw.y + tColor(3.0, uvz).rgb * bw.z;
  c *= mix(vec3(0.62, 0.68, 0.74), vec3(0.95, 0.9, 0.84), mac2.r) * (0.8 + 0.4 * mac3.b);
  c = mix(c, vec3(dot(c, vec3(0.33))), 0.65);   // grey, not orange
  // lichen / moss tint on gentler rock, pale at altitude, strata banding
  c = mix(c, c * vec3(0.8, 0.95, 0.6), smoothstep(0.35, 0.12, slope) * (1.0 - alt) * 0.5);
  c = mix(c, c * vec3(1.2, 1.18, 1.15), alt * 0.5);
  c *= 0.9 + 0.2 * smoothstep(0.4, 0.6, fract(vWPos.y / 23.0 + mac3.g * 0.4));
  // mid-scale erosion relief from the macro noise via screen-space derivatives (no extra samples); fades out
  // with distance so far rock never sparkles
  float bumpK = 1.0 - smoothstep(250.0, 1000.0, camD);
  if (bumpK > 0.01) {
    float hb = mac3.b * 8.0 * bumpK;
    vec2 dH = vec2(dFdx(hb), dFdy(hb));
    vec3 vSigmaX = dFdx(vWPos), vSigmaY = dFdy(vWPos);
    vec3 R1 = cross(vSigmaY, gN), R2 = cross(gN, vSigmaX);
    float fDet = dot(vSigmaX, R1);
    vec3 vGrad = sign(fDet) * (dH.x * R1 + dH.y * R2);
    float gl = length(vGrad);
    if (gl > 1e-5) pert += (vGrad / max(abs(fDet), 1e-5)) * (wRock / max(1.0, gl * 0.35));
  }
  {
    vec3 tnx = tNor(2.0, uvx), tnz = tNor(2.0, uvz);
    vec3 rp = vec3(0.0, tnx.y, tnx.x) * bw.x + vec3(tnz.x, tnz.y, 0.0) * bw.z;
    if (bw.y > 0.2) { vec3 tny = tNor(2.0, uvy); rp += vec3(tny.x, 0.0, tny.y * uNormalFlip) * bw.y; }
    pert += rp * wRock * mix(1.1, 0.8, far) / max(nStr, 0.12) * mix(nStr, 0.6, far) ;
  }
  albedo += c * wRock;
  rough += 0.88 * wRock;
  detAO += (0.8 + 0.2 * mac3.a) * wRock;
}
#endif
// renormalise for skipped faint layers
float wsum = max(1e-3, (wGrass > 0.02 ? wGrass : 0.0) + (wDirt > 0.02 ? wDirt : 0.0) + (wSand > 0.02 ? wSand : 0.0) + (wScree > 0.02 ? wScree : 0.0) + (wRock > 0.05 ? wRock : 0.0));
albedo /= wsum; rough /= wsum; detAO /= wsum;

// shore: wet band just above the water line (edge broken by the fine channel), darker + glossier;
// underwater darkening + blue-green tint
float wet = smoothstep(0.9 + (fine - 0.5) * 0.6, 0.1, th);
albedo *= mix(1.0, 0.68, wet);
rough = mix(rough, 0.35, wet * 0.8);
float under = smoothstep(0.2, -6.0, th);
albedo = mix(albedo, albedo * vec3(0.45, 0.62, 0.62), under);

// far distance: fade detail normals (aerial perspective is added by the environment's fog)
vec3 splatN = normalize(gN + pert * max(nStr, 0.12));
float splatAO = cavAO * mix(1.0, detAO, 0.7 * (1.0 - far));
vec3 splatAlbedo = albedo * (0.82 + 0.18 * cavAO);
float splatRough = clamp(rough + (0.5 - mac3.a) * 0.1, 0.25, 1.0);
diffuseColor.rgb *= splatAlbedo;
`;function Ee(e,t=``){let n=Math.max(...e.map(e=>e.image.width)),r=document.createElement(`canvas`);r.width=r.height=n;let i=r.getContext(`2d`,{willReadFrequently:!0}),a=new Uint8Array(n*n*4*e.length);e.forEach((e,t)=>{i.setTransform(1,0,0,1,0,0),i.clearRect(0,0,n,n),e.flipY&&i.setTransform(1,0,0,-1,0,n),i.drawImage(e.image,0,0,n,n),a.set(i.getImageData(0,0,n,n).data,t*n*n*4)});let o=new ne(a,n,n,e.length);return o.colorSpace=t,o.wrapS=o.wrapT=F,o.magFilter=_,o.minFilter=v,o.generateMipmaps=!0,o.anisotropy=Math.min(...e.map(e=>e.anisotropy)),o.needsUpdate=!0,o}function De(e,t,n={}){let r=Ee([t.grassFine.normalMap,t.dirt.normalMap,t.rock.normalMap,t.sand.normalMap]),i=Ee([t.grass.map,t.grassFine.map,t.dirt.map,t.rock.map,t.sand.map,t.scree.map],O),a={uHeightTex:{value:e.heightTex},uNormalTex:{value:e.normalTex},uMacro:{value:t.macro},uLandTex:{value:t.land},uDetailNormals:{value:r},uAlbedoLayers:{value:i},uWorldMin:{value:-e.half},uWorldSize:{value:e.size},uCell:{value:e.cell},uRes:{value:e.res},uSeaLevel:{value:e.seaLevel},uNormalFlip:{value:n.normalFlip??1},uLodDrop:{value:0},uSkirt:{value:1}},o=new m({color:16777215,roughness:1,metalness:0,side:0});return o.name=`terrain-splat`,o.addEventListener(`dispose`,()=>{r.dispose(),i.dispose()}),o.onBeforeCompile=e=>{Object.assign(e.uniforms,a),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
`+J).replace(`#include <beginnormal_vertex>`,Se).replace(`#include <begin_vertex>`,Y),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
`+we).replace(`#include <map_fragment>`,Te).replace(`#include <roughnessmap_fragment>`,`float roughnessFactor = splatRough;`).replace(`#include <normal_fragment_begin>`,`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
vec3 normal = normalize((viewMatrix * vec4(splatN, 0.0)).xyz);
vec3 nonPerturbedNormal = normal;`).replace(`#include <normal_fragment_maps>`,``).replace(`#include <aomap_fragment>`,`reflectedLight.indirectDiffuse *= splatAO;
reflectedLight.directDiffuse *= mix(1.0, splatAO, 0.5);
reflectedLight.indirectSpecular *= splatAO;`),o.userData.shader=e},o.customProgramCacheKey=()=>`terrain-splat-v4:`+Object.keys(o.defines||{}).join(`,`),o.userData.uniforms=a,o}function Oe(e,t,n){let r={uHeightTex:{value:e.heightTex},uNormalTex:{value:e.normalTex},uMacro:{value:t},uLandTex:{value:n},uWorldMin:{value:-e.half},uWorldSize:{value:e.size},uCell:{value:e.cell},uRes:{value:e.res},uSeaLevel:{value:e.seaLevel},uLodDrop:{value:0},uSkirt:{value:1}},i=new m({color:16777215,roughness:1,metalness:0});return i.name=`terrain-lite`,i.onBeforeCompile=e=>{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
`+J).replace(`#include <beginnormal_vertex>`,Se).replace(`#include <begin_vertex>`,Y),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform sampler2D uNormalTex; uniform sampler2D uMacro; uniform sampler2D uLandTex; uniform float uWorldMin; uniform float uWorldSize; uniform float uCell; uniform float uRes; uniform float uSeaLevel; varying vec3 vWPos;
`+Ce).replace(`#include <map_fragment>`,`
vec2 wp = vWPos.xz;
vec4 ntex = texture2D(uNormalTex, ((wp - uWorldMin) / uCell + 0.5) / uRes);
vec3 gN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
gN.y = sqrt(max(0.0, 1.0 - dot(gN.xz, gN.xz)));
vec4 land = texture2D(uLandTex, (wp - uWorldMin) / uWorldSize);
vec4 mac2 = texture2D(uMacro, wp / 170.0 + 0.37);
float th = vWPos.y - uSeaLevel;
float slope = 1.0 - gN.y;
float alt = smoothstep(140.0, 330.0, th);
vec3 grass = terrainGrassTint(land, mac2, vec4(0.5), alt);
vec3 rock = mix(vec3(0.10, 0.095, 0.09), vec3(0.16, 0.15, 0.14), alt) * (0.85 + 0.3 * mac2.b);
vec3 dirt = vec3(0.13, 0.095, 0.05);
vec3 sand = vec3(0.21, 0.18, 0.14);
float wRock = smoothstep(0.11, 0.27, slope + (mac2.g - 0.5) * 0.12);
vec3 c = mix(grass, dirt, land.r * (1.0 - wRock));
c = mix(c, rock, wRock);
c = mix(c, sand, smoothstep(1.7, 0.5, th) * (1.0 - wRock));
c *= 0.82 + 0.18 * ntex.b;
diffuseColor.rgb *= c;
vec3 splatN = gN;`).replace(`#include <normal_fragment_begin>`,`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
vec3 normal = normalize((viewMatrix * vec4(splatN, 0.0)).xyz);
vec3 nonPerturbedNormal = normal;`).replace(`#include <normal_fragment_maps>`,``)},i.customProgramCacheKey=()=>`terrain-lite-v3`,i.userData.uniforms=r,i}function ke(e){let t={uHeightTex:{value:e.heightTex},uNormalTex:{value:e.normalTex},uWorldMin:{value:-e.half},uCell:{value:e.cell},uLodDrop:{value:.3},uSkirt:{value:0}},n=new y({depthPacking:C});return n.onBeforeCompile=e=>{Object.assign(e.uniforms,t),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
`+J).replace(`#include <begin_vertex>`,Y)},n.customProgramCacheKey=()=>`terrain-depth-v3`,n}function Ae(e,t=256){let n=new Uint8Array(t*t*4),r=[3,5,4,7];for(let i=0;i<4;i++){let a=e[i],o=r[i];for(let e=0;e<t;e++)for(let r=0;r<t;r++){let s=r/t,c=e/t,l=.5+.5*a.fbm(s*o,c*o,5),u=.5+.5*a.fbm((s+1)*o,(c+1)*o,5),d=Math.min(1-Math.abs(s*2-1),1-Math.abs(c*2-1)),f=d*d*(3-2*d),p=l*f+u*(1-f);p=Math.min(1,Math.max(0,(p-.5)*1.6+.5)),n[(e*t+r)*4+i]=Math.round(p*255)}}let i=new g(n,t,t,M,j);return i.wrapS=i.wrapT=F,i.magFilter=_,i.minFilter=v,i.generateMipmaps=!0,i.needsUpdate=!0,i}function je(e){let t=new g(e.data,e.size,e.size,M,j);return t.wrapS=t.wrapT=B,t.magFilter=_,t.minFilter=v,t.generateMipmaps=!0,t.needsUpdate=!0,t}var Me=`
uniform mat4 uTexMat;
varying vec4 vRefUv;
varying vec3 vWPos;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vRefUv = uTexMat * wp;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,Ne=`
uniform sampler2D tReflect;
uniform sampler2D uRipple;
uniform sampler2D uMacro;
uniform highp sampler2D uHeightTex;
uniform float uTime;
uniform float uWorldMin;
uniform float uCell;
uniform float uRes;
uniform float uSeaLevel;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform sampler2D uSeaMask;
uniform vec3 uSkyColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform float uReflStrength;
uniform float uDay;
varying vec4 vRefUv;
varying vec3 vWPos;
#include <common>
#include <fog_pars_fragment>
#ifndef ENV_WORLDPOS
uniform sampler2D uEnvSky;
#endif
uniform float uHasEnvSky;
uniform vec2 uEdgeFade;

float terrainH(vec2 p) {
  // outside the map the sea continues: fade the (clamped) edge column to deep water over 80 m
  float worldMax = uWorldMin + uCell * (uRes - 1.0);
  float outside = max(max(uWorldMin - p.x, p.x - worldMax), max(uWorldMin - p.y, p.y - worldMax));
  float outK = smoothstep(0.0, 80.0, outside);
  vec2 g = (p - uWorldMin) / uCell;
  g = clamp(g, vec2(0.0), vec2(uRes - 1.001));
  ivec2 i = ivec2(floor(g));
  vec2 f = g - vec2(i);
  float h00 = texelFetch(uHeightTex, i, 0).r;
  float h10 = texelFetch(uHeightTex, i + ivec2(1, 0), 0).r;
  float h01 = texelFetch(uHeightTex, i + ivec2(0, 1), 0).r;
  float h11 = texelFetch(uHeightTex, i + ivec2(1, 1), 0).r;
  return mix(mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y), -45.0, outK);
}

// Match the visible sky dome's camera-only exposure while leaving the shared LUT physically bright
// for PMREM and direct lighting. Direction matters at low sun; night remains a uniform exposure scale.
float skyDisplayGain(vec3 dir) {
  float lowSunDisplay = (1.0 - smoothstep(0.12, 0.32, uSunDir.y)) * smoothstep(-0.02, 0.05, uSunDir.y);
  float sunwardDisplay = smoothstep(0.0, 0.80, max(dot(dir, uSunDir), 0.0));
  return (1.0 - 0.96 * lowSunDisplay * sunwardDisplay) * mix(1.0, 0.25, uEnvNight);
}

void main() {
  vec3 toCam = cameraPosition - vWPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 1e-3);
  vec2 p = vWPos.xz;
  float depth = uSeaLevel - terrainH(p);
  if (depth < -0.05) discard;
  // The open sea can carry a broad sky mirror. Inland water needs more body colour so an
  // aerial river still reads as water contained by banks instead of a cut-out in the ground.
  float sea = texture2D(uSeaMask, (p - uWorldMin) / (uCell * (uRes - 1.0))).r;
  float inland = 1.0 - sea;

  // ripples: three scrolling layers, damped with distance and in the shallows
  vec3 n1 = texture2D(uRipple, p / 21.0 + uTime * vec2(0.020, 0.012)).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(uRipple, p / 7.7 - uTime * vec2(0.018, 0.027) + 0.3).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(uRipple, p / 90.0 + uTime * vec2(0.005, -0.004)).xyz * 2.0 - 1.0;
  float att = 1.0 / (1.0 + dist / 180.0);
  float farW = smoothstep(150.0, 1200.0, dist);
  vec2 tilt = mix(n1.xy * 0.55 + n2.xy * 0.35 + n3.xy * 0.7, n3.xy * 0.5, farW) * 0.22 * att;
  tilt *= 0.45 + 0.55 * smoothstep(0.0, 3.0, depth);
  vec3 N = normalize(vec3(tilt.x, 1.0, tilt.y));

  // planar reflection (geometry, alpha-masked) over the sky radiance LUT (equirect) or a flat sky colour
  vec4 ruv = vRefUv;
  ruv.xy += tilt * 0.35 * ruv.w;   // small: a large offset scatters the reflected bank into confetti
  vec4 rt = texture2DProj(tReflect, ruv);
  vec3 Nsky = normalize(vec3(tilt.x * 2.5, 1.0, tilt.y * 2.5));   // facets reflect higher (bluer) sky than the mean plane
  vec3 R = reflect(-V, Nsky);
  R.y = max(R.y, 0.03);
  R = normalize(R);
  vec2 suv = vec2(atan(R.z, R.x) * 0.15915494309 + 0.5, asin(clamp(R.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
  vec3 skyRefl = uHasEnvSky > 0.5 ? texture2D(uEnvSky, suv).rgb * skyDisplayGain(R) : uSkyColor * (0.9 + 0.6 * (1.0 - R.y));
  vec3 refl = mix(skyRefl, rt.rgb, clamp(rt.a, 0.0, 1.0)) * uReflStrength * mix(0.48, 1.0, sea);

  // body colour: absorption with depth, lit by sky + sun
  float absorb = 1.0 - exp(-depth * 0.22);
  vec3 body = mix(uShallowColor, uDeepColor, absorb);
  vec3 light = uSkyColor * 0.85 + uSunColor * 0.35 * max(0.0, uSunDir.y);
  body *= light;

  float NdV = max(0.0, dot(N, V));
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  float reflectionMix = clamp(F * mix(0.72, 0.9, sea) + mix(0.10, 0.24, sea), 0.0, 0.93);
  vec3 col = mix(body, refl, reflectionMix);

  // sun / moon glints (the environment's current light: sun by day, moon at night)
  vec3 H = normalize(uLightDir + V);
  float NdH = max(0.0, dot(N, H));
  // glints: tight near the camera, a broad soft glitter path further out (no per-pixel confetti at 100-400 m)
  float midW = smoothstep(40.0, 320.0, dist);
  float spec = pow(NdH, mix(420.0, 70.0, max(midW, farW))) * mix(2.2, 0.4, max(midW, farW)) + pow(NdH, 24.0) * 0.05;
  col += uLightColor * spec * smoothstep(-0.02, 0.15, uLightDir.y);

  // shore foam + waterline
  float fn = texture2D(uMacro, p / 26.0 + uTime * vec2(0.012, 0.004)).r * 0.6
           + texture2D(uMacro, p / 8.5 - uTime * vec2(0.02, 0.011)).g * 0.4;
  float band = smoothstep(2.4, 0.0, depth) * (0.25 + 0.75 * sea);
  float wave = 0.5 + 0.5 * sin(depth * 3.2 - uTime * 1.3 + fn * 4.0);
  float foam = band * smoothstep(0.45, 0.75, fn * 0.7 + wave * 0.3 + band * 0.15);
  float edge = smoothstep(0.3, 0.0, depth) * smoothstep(0.35, 0.65, fn) * (0.3 + 0.7 * sea);
  vec3 foamCol = vec3(0.85, 0.88, 0.88) * (uSkyColor * 0.5 + uSunColor * 0.4 * max(0.0, uSunDir.y) + 0.01);
  float foamK = clamp(foam * 0.6 + edge * 0.18, 0.0, 1.0);
  col = mix(col, foamCol, foamK);

  // A restrained downstream tonal ripple survives the high aerial view where fine normals vanish.
  // It follows the generated river's east-west course and is suppressed for the sea and shoreline.
  float flowCue = inland * smoothstep(0.8, 4.5, depth) * (1.0 - farW)
                * (0.5 + 0.5 * sin(p.x * 0.055 - uTime * 0.65 + fn * 5.0));
  col *= mix(vec3(1.0), vec3(0.84, 0.94, 0.91), flowCue * 0.08);

  // horizon: blend into the sky so the plane edge / far clip never shows
  vec3 hd = -V; hd.y = 0.012; hd = normalize(hd);
  vec2 huv = vec2(atan(hd.z, hd.x) * 0.15915494309 + 0.5, asin(hd.y) * 0.31830988618 + 0.5);
  vec3 horizonCol = (uHasEnvSky > 0.5 ? texture2D(uEnvSky, huv).rgb * skyDisplayGain(hd) : uSkyColor) * 0.9;   // matches the displayed sky dome just below the horizon
  col = mix(col, horizonCol, smoothstep(1500.0, 4200.0, dist));

  float alpha = clamp(depth * 0.75 + 0.15, 0.0, 1.0);
  alpha = mix(alpha, 1.0, F);
  alpha = max(alpha, foamK * 0.9);
  alpha = mix(alpha, 1.0, smoothstep(uEdgeFade.x, uEdgeFade.y, dist));   // far: fully opaque (colour already converged to the sky)
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`,Pe=class{constructor(e,{ripple:n,macro:r,seaMask:a=null,size:l=1024,mainCamera:d,seaLevel:f=0,extent:m=11e3,onReflection:h=null}){this.onReflection=h,this.data=e,this.mainCamera=d,this.rt=new s(l,Math.round(l/2),{type:o,samples:0,depthBuffer:!0}),this.rt.texture.minFilter=_,this.rt.texture.magFilter=_,this.rt.texture.generateMipmaps=!1,this.texMat=new I,this.uniforms=t.merge([w.fog,{tReflect:{value:null},uRipple:{value:n},uMacro:{value:r},uHeightTex:{value:e.heightTex},uTexMat:{value:this.texMat},uTime:{value:0},uWorldMin:{value:-e.half},uCell:{value:e.cell},uRes:{value:e.res},uSeaLevel:{value:f},uSunDir:{value:new p(0,1,0)},uSunColor:{value:new x(1,.95,.85)},uLightDir:{value:new p(0,1,0)},uLightColor:{value:new x(1,.95,.85)},uSeaMask:{value:null},uSkyColor:{value:new x(.55,.7,.9)},uDeepColor:{value:new x(.014,.05,.085)},uShallowColor:{value:new x(.09,.23,.245)},uReflStrength:{value:1},uDay:{value:1},uHasEnvSky:{value:0},uEdgeFade:{value:new u(2300,4400)}}]),this.uniforms.tReflect.value=this.rt.texture,this.uniforms.uSeaMask.value=a,this.uniforms.uHeightTex.value=e.heightTex,this.uniforms.uTexMat.value=this.texMat,this.material=new te({uniforms:this.uniforms,vertexShader:Me,fragmentShader:Ne,transparent:!0,depthWrite:!0,fog:!0,side:0}),this.material.name=`terrain-water`,this.radius=m*.5;let g=new z(this.radius,96);g.rotateX(-Math.PI/2),this.mesh=new c(g,this.material),this.mesh.name=`water`,this.mesh.position.y=f,this.mesh.renderOrder=S.WATER,this.mesh.layers.enable(b.WATER),this.mesh.frustumCulled=!1,this.mesh.castShadow=!1,this.mesh.receiveShadow=!1,this.mesh.updateMatrixWorld(),this.mesh.raycast=()=>{},this.reflCam=new L,this.reflCam.layers.mask=4294967295,this.reflCam.layers.disable(b.WATER),this.reflCam.layers.disable(b.HELPERS),this._plane=new k,this._normal=new p(0,1,0),this._v=new p,this._t=new p,this._look=new p,this._camPos=new p,this._rot=new I,this._clip=new i,this._q=new i,this._clearCol=new x,this._lastCamM=new I,this._lastProjM=new I,this._dirty=!0,this._animDirty=!1,this._frame=0,this.enabled=!0,this.mesh.onBeforeRender=(e,t,n)=>this._renderReflection(e,t,n)}setSun(e,t,n,r,i=e,a=t){this.uniforms.uSunDir.value.copy(e),this.uniforms.uSunColor.value.copy(t),this.uniforms.uLightDir.value.copy(i),this.uniforms.uLightColor.value.copy(a),this.uniforms.uSkyColor.value.copy(n),this.uniforms.uDay.value=r}update(e){e>0&&(this.uniforms.uTime.value+=e,this._animDirty=!0)}follow(e){let t=e.position;(Math.abs(this.mesh.position.x-t.x)>4||Math.abs(this.mesh.position.z-t.z)>4)&&(this.mesh.position.x=t.x,this.mesh.position.z=t.z,this.mesh.updateMatrixWorld())}invalidate(){this._dirty=!0}refreshSky(){let e=this.uniforms.uEnvSky;this.uniforms.uHasEnvSky.value=e&&e.value&&e.value.isTexture?1:0}_renderReflection(e,t,n){if(!this.enabled||n!==this.mainCamera)return;let r=this.mesh.position.y;if(this._camPos.setFromMatrixPosition(n.matrixWorld),this._camPos.y<=r+.5)return;this._frame=(this._frame||0)+1;let i=this._lastCamM.equals(n.matrixWorld)&&this._lastProjM.equals(n.projectionMatrix),a=this._animDirty?4:8;if(i&&!this._dirty&&this._frame%a!==0)return;this._lastCamM.copy(n.matrixWorld),this._lastProjM.copy(n.projectionMatrix),this._dirty=!1,this._animDirty=!1;let o=this.reflCam;this._v.copy(this._camPos),this._v.y=2*r-this._v.y,this._rot.extractRotation(n.matrixWorld),this._look.set(0,0,-1).applyMatrix4(this._rot).add(this._camPos),this._look.y=2*r-this._look.y,o.position.copy(this._v),o.up.set(0,1,0).applyMatrix4(this._rot),o.up.y=-o.up.y,o.lookAt(this._look),o.near=n.near,o.far=n.far,o.updateMatrixWorld(),o.projectionMatrix.copy(n.projectionMatrix),o.projectionMatrixInverse.copy(n.projectionMatrixInverse),this.texMat.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.texMat.multiply(o.projectionMatrix).multiply(o.matrixWorldInverse),this._plane.setFromNormalAndCoplanarPoint(this._normal,this.mesh.position).applyMatrix4(o.matrixWorldInverse);let s=this._clip.set(this._plane.normal.x,this._plane.normal.y,this._plane.normal.z,this._plane.constant),c=o.projectionMatrix,l=this._q;l.x=(Math.sign(s.x)+c.elements[8])/c.elements[0],l.y=(Math.sign(s.y)+c.elements[9])/c.elements[5],l.z=-1,l.w=(1+c.elements[10])/c.elements[14],s.multiplyScalar(2/s.dot(l)),c.elements[2]=s.x,c.elements[6]=s.y,c.elements[10]=s.z+1-.002,c.elements[14]=s.w,this.mesh.visible=!1,this.onReflection&&this.onReflection(!0);let u=e.getRenderTarget(),d=e.xr.enabled,f=e.shadowMap.autoUpdate;e.xr.enabled=!1,e.shadowMap.autoUpdate=!1,e.setRenderTarget(this.rt),e.state.buffers.depth.setMask(!0),e.getClearColor(this._clearCol);let p=e.getClearAlpha();e.setClearColor(0,0),e.clear(),e.render(t,o),e.setClearColor(this._clearCol,p),e.xr.enabled=d,e.shadowMap.autoUpdate=f,e.setRenderTarget(u);let m=n.viewport;m!==void 0&&e.state.viewport(m),this.onReflection&&this.onReflection(!1),this.mesh.visible=!0}dispose(){this.rt.dispose(),this.material.dispose(),this.mesh.geometry.dispose()}};function Fe(e,t=64){let n=new Uint8Array(t*t),r=e.res,i=e.cell,a=e.size/2;for(let o=0;o<t;o++)for(let s=0;s<t;s++){let c=-a+(s+.5)*(e.size/t),l=-a+(o+.5)*(e.size/t),u=Math.max(0,Math.min(r-1,Math.round((l+a)/i))),d=Math.max(0,Math.min(r-1,Math.round((c+a)/i))),f=+(c<(e.coast?e.coast.xAt[u]:-1e9)+40);!f&&e.river&&c<-420&&(f=Math.abs(l-e.river.zAt[d])<e.river.halfWidth[d]+60?Math.max(0,Math.min(1,(-420-c)/200)):0),n[o*t+s]=Math.round(f*255)}let o=new g(n,t,t,E,j);return o.wrapS=o.wrapT=B,o.magFilter=o.minFilter=_,o.generateMipmaps=!1,o.needsUpdate=!0,o}function Ie(e,t=256,n=1.6){let r=new Float32Array(t*t);for(let n=0;n<t;n++)for(let i=0;i<t;i++){let a=i/t,o=n/t,s=e.fbm(a*6,o*6*1.7,4,2.2,.55),c=e.fbm((a+1)*6,(o+1)*6*1.7,4,2.2,.55),l=Math.min(1-Math.abs(a*2-1),1-Math.abs(o*2-1)),u=l*l*(3-2*l);r[n*t+i]=s*u+c*(1-u)}let i=new Uint8Array(t*t*4);for(let e=0;e<t;e++)for(let a=0;a<t;a++){let o=r[e*t+(a-1+t)%t],s=r[e*t+(a+1)%t],c=r[(e-1+t)%t*t+a],l=r[(e+1)%t*t+a],u=(o-s)*n,d=(c-l)*n,f=Math.hypot(u,d,1),p=(e*t+a)*4;i[p]=(u/f*.5+.5)*255,i[p+1]=(d/f*.5+.5)*255,i[p+2]=(1/f*.5+.5)*255,i[p+3]=255}let a=new g(i,t,t,M,j);return a.wrapS=a.wrapT=F,a.magFilter=_,a.minFilter=v,a.generateMipmaps=!0,a.needsUpdate=!0,a}var X=64,Le=(e,t)=>e*65536+t,Re=class{constructor(e,t){this.world=e,this.modules=t,this.version=-1,this.bins=new Map,this.services=new ae(e,t)}sync(){let e=this.world?.buildings?.version??0,t=this.services.sync();if(e===this.version&&!t)return!1;this.version=e,this.bins.clear();for(let e of this.world?.buildings?.items?.values()||[]){let t=this.modules?.buildings?.lotSurface?.(e.id);if(t){this.add(t);for(let e of t.paved||[])this.add(e)}e.footprint&&this.add({x:e.x,z:e.z,heading:e.heading,...e.footprint})}for(let e of this.services.rects)this.add({...e,heading:-e.heading});return!0}add(e){let{x:t,z:n,w:r,d:i}=e;if(![t,n,r,i].every(Number.isFinite)||r<=0||i<=0)return;let a=Math.cos(e.heading||0),o=Math.sin(e.heading||0),s=r/2+.3,c=i/2+.3,l=Math.abs(a)*s+Math.abs(o)*c,u=Math.abs(o)*s+Math.abs(a)*c,d={x:t,z:n,hw:s,hd:c,c:a,s:o};for(let e=Math.floor((t-l)/X);e<=Math.floor((t+l)/X);e++)for(let t=Math.floor((n-u)/X);t<=Math.floor((n+u)/X);t++){let n=Le(e,t),r=this.bins.get(n);r||this.bins.set(n,r=[]),r.push(d)}}contains(e,t){let n=this.bins.get(Le(Math.floor(e/X),Math.floor(t/X)));if(!n)return!1;for(let r=0;r<n.length;r++){let i=n[r],a=e-i.x,o=t-i.z;if(Math.abs(i.c*a+i.s*o)<=i.hw&&Math.abs(i.s*a-i.c*o)<=i.hd)return!0}return!1}},Z={max:14e3,spacing:.55,radius:26,fade:[17,30]},Q={max:9e3,spacing:2.3,inner:16,radius:140,fade:[100,138]};function ze(e,t=5,n=1){let r=[],i=[],a=[];for(let o=0;o<t;o++){let s=o/t*Math.PI*2+e.float()*.8,c=.2+e.float()*.6,l=.22+e.float()*.26,u=(.04+e.float()*.035)*n,d=Math.cos(s),f=Math.sin(s),p=.09*(e.float()-.5),m=.09*(e.float()-.5),h=r.length/3;for(let e=0;e<4;e++){let t=e/3,n=l*t*(1-.18*t*t),a=c*l*t*t,o=u*(1-.8*t*t),s=p+d*a,h=m+f*a;r.push(s-f*o,n,h+d*o,s+f*o,n,h-d*o),i.push(0,t,1,t)}for(let e=0;e<3;e++){let t=h+e*2;a.push(t,t+1,t+3,t,t+3,t+2)}}let o=new D;return o.setAttribute(`position`,new A(r,3)),o.setAttribute(`uv`,new A(i,2)),o.setIndex(a),o}function Be(e,{name:t,fade:n,sway:r,rootDark:i=.35}){let a=new m({side:2,roughness:.8,metalness:0});a.name=t;let o={...e,uFade:{value:new u(n[0],n[1])},uSway:{value:r},uDryMul:{value:.7},uRootDark:{value:i}};return a.onBeforeCompile=e=>{Object.assign(e.uniforms,o),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
uniform float uTime; uniform vec2 uFade; uniform float uSway; uniform float uDryMul; uniform float uRootDark;
uniform sampler2D uLandTex; uniform sampler2D uMacro; uniform sampler2D uNormalTex;
uniform float uWorldMin; uniform float uWorldSize; uniform float uCell; uniform float uRes; uniform float uSeaLevel;
varying vec3 vTint; varying vec3 vGN; varying float vRoot; varying float vAcross; varying float vDry;
${Ce}`).replace(`#include <beginnormal_vertex>`,`
vec3 objectNormal = vec3(0.0, 1.0, 0.0);
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace(`#include <begin_vertex>`,`
vec3 transformed = vec3(position);
vec3 wpos0 = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
// palette + ground normal at the root (same maps as the terrain surface)
vec2 lp = (wpos0.xz - uWorldMin) / uWorldSize;
vec4 land = texture2D(uLandTex, lp);
vec4 mac2 = texture2D(uMacro, wpos0.xz / 170.0 + 0.37);
vec4 mac3 = texture2D(uMacro, wpos0.xz / 41.0 + 0.71);
float alt = smoothstep(140.0, 330.0, wpos0.y - uSeaLevel);
vTint = terrainGrassTint(vec4(land.r, land.g * uDryMul, land.b, land.a), mac2, mac3, alt);
vec4 ntex = texture2D(uNormalTex, ((wpos0.xz - uWorldMin) / uCell + 0.5) / uRes);
vGN = vec3(ntex.r * 2.0 - 1.0, 0.0, ntex.g * 2.0 - 1.0);
vGN.y = sqrt(max(0.0, 1.0 - dot(vGN.xz, vGN.xz)));
vTint *= 0.82 + 0.18 * ntex.b;
// per-clump variation: some clumps yellow-green and brighter, some blue-green and darker (never uniform)
float hsh = fract(sin(dot(floor(wpos0.xz * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
float hsh2 = fract(sin(dot(floor(wpos0.xz * 5.0) + 7.0, vec2(39.3467, 11.135))) * 24634.6345);
vTint *= mix(vec3(0.78, 0.92, 0.78), vec3(1.22, 1.08, 0.72), hsh2) * (0.85 + 0.35 * hsh);
vDry = clamp(land.g * uDryMul + (mac3.a - 0.5) * 0.3 + (hsh2 - 0.5) * 0.3, 0.0, 1.0);
// dithered distance fade: shrink into the ground (no alpha pop, no pale blobs at the edge)
float d = distance(cameraPosition, wpos0);
float k = 1.0 - smoothstep(uFade.x, uFade.y, d + (hsh - 0.5) * (uFade.y - uFade.x) * 0.9);
// wind: tips sway, roots stay
float sw = sin(uTime * 1.7 + wpos0.x * 0.35 + wpos0.z * 0.27) * 0.08 + sin(uTime * 2.9 + wpos0.z * 0.8 + wpos0.x * 0.4) * 0.035;
float vv = uv.y * uv.y;
transformed.x += sw * uSway * vv;
transformed.z += sw * 0.6 * uSway * vv;
transformed *= k;
vRoot = uv.y; vAcross = uv.x;`),e.fragmentShader=e.fragmentShader.replace(`#include <common>`,`#include <common>
uniform float uRootDark; varying vec3 vTint; varying vec3 vGN; varying float vRoot; varying float vAcross; varying float vDry;`).replace(`#include <normal_fragment_begin>`,`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
vec3 normal = normalize((viewMatrix * vec4(vGN, 0.0)).xyz);
vec3 nonPerturbedNormal = normal;`).replace(`#include <map_fragment>`,`
// root shadow -> lighter tips; dry blades bleach toward straw at the tip; blade edges a touch brighter
vec3 bc = vTint * vec3(0.88, 1.0, 0.9) * (uRootDark + (1.0 - uRootDark + 0.15) * vRoot) * (0.9 + 0.2 * abs(vAcross - 0.5) * 2.0);
bc = mix(bc, bc * vec3(1.35, 1.2, 0.75), vDry * vRoot * 0.7);
diffuseColor.rgb *= bc;`)},a.customProgramCacheKey=()=>`terrain-clutter-v4`,a.userData.uniforms=o,a}var Ve=class{constructor(e,t,r,i){this.opts=i,this.mesh=new n(e,t,r),this.mesh.name=t.name,this.mesh.count=0,this.mesh.frustumCulled=!1,this.mesh.castShadow=!1,this.mesh.receiveShadow=!0,this.mesh.raycast=()=>{},this.mesh.instanceMatrix.setUsage(d),this.max=r}},He=class{constructor(e,t,{seaLevel:n=0,layer:i=1,macro:a=null,land:o=null,world:s=null,modules:c=null}={}){this.data=e,this.seaLevel=n;let l={uTime:{value:0},uLandTex:{value:o},uMacro:{value:a},uNormalTex:{value:e.normalTex},uWorldMin:{value:-e.half},uWorldSize:{value:e.size},uCell:{value:e.cell},uRes:{value:e.res},uSeaLevel:{value:n}};this.uTime=l.uTime,this.bladeMat=Be(l,{name:`terrain-grass-blades`,fade:Z.fade,sway:1,rootDark:.32}),this.tuftMat=Be(l,{name:`terrain-grass-tufts`,fade:Q.fade,sway:.7,rootDark:.55}),this.blades=new Ve(ze(t.fork(`blade`),7),this.bladeMat,Z.max,Z),this.tufts=new Ve(ze(t.fork(`clump`),5,1.6),this.tuftMat,Q.max,Q),this.world=s,this.lotMask=new Re(s,c),this._coverageVersion=-1,this.group=new r,this.group.name=`grass-clutter`;for(let e of[this.blades,this.tufts])e.mesh.layers.enable(i),this.group.add(e.mesh);this.materials=[this.bladeMat,this.tuftMat],this._m=new I,this._q=new R,this._p=new p,this._s=new p,this._axis=new p(0,1,0),this._lastX=1e9,this._lastZ=1e9,this._version=-1,this.enabled=!0}invalidate(){this._lastX=1e9}update(e,t,n){if(t>0&&(this.uTime.value+=t),!this.enabled){this.blades.mesh.count=0,this.tufts.mesh.count=0;return}this.lotMask.sync()&&this.invalidate();let r=e.position.x,i=e.position.z,a=this.world?.roads?.coverage,o=a?a.version:-1;if(Math.abs(r-this._lastX)<4&&Math.abs(i-this._lastZ)<4&&n===this._version&&o===this._coverageVersion)return;this._lastX=r,this._lastZ=i,this._version=n,this._coverageVersion=o,this._isRoad=a&&typeof this.world.roads.isRoad==`function`?this.world.roads.isRoad:null;let s=e.position.y-this.data.getHeight(r,i);s<Z.fade[1]+10?this._fill(this.blades,r,i,0,Z.radius,Z.spacing,1):this.blades.mesh.count=0,s<Q.fade[1]+20?this._fill(this.tufts,r,i,Q.inner,Q.radius,Q.spacing,2):this.tufts.mesh.count=0}_fill(e,t,n,r,i,a,o){let s=this.data,c=e.mesh,l=e.max,u=Math.floor((t-i)/a),d=Math.ceil((t+i)/a),f=Math.floor((n-i)/a),p=Math.ceil((n+i)/a),m=i*i,h=r*r,g=0;for(let e=f;e<=p&&g<l;e++)for(let r=u;r<=d&&g<l;r++){let i=P(r,e,11+o),l=P(r,e,23+o),u=P(r,e,37+o),d=P(r,e,51+o),f=(r+i)*a,p=(e+l)*a,_=f-t,v=p-n,y=_*_+v*v;if(y>m||y<h||f<-s.half+8||f>s.half-8||p<-s.half+8||p>s.half-8)continue;let b=s.getHeight(f,p);if(b<this.seaLevel+1.8||this.lotMask.contains(f,p)||this._isRoad&&this._isRoad(f,p)||s.getNormal(f,p,this._p).y<.88)continue;let x=P(r>>3,e>>3,77),S=o===1?.8+x*.25:.45+x*.4;if(o===2&&y<1600&&(S*=(y-h)/(1600-h)),u>S)continue;let C=o===1?.6+d*d*.7:.9+d*.6;this._q.setFromAxisAngle(this._axis,u*Math.PI*2),this._s.set(C,C*(o===1?.75+.55*i:.55+.4*i),C),this._m.compose(this._p.set(f,b-.03,p),this._q,this._s),c.setMatrixAt(g,this._m),g++}c.count=g,c.instanceMatrix.needsUpdate=!0}dispose(){for(let e of[this.blades,this.tufts])e.mesh.geometry.dispose();this.bladeMat.dispose(),this.tuftMat.dispose()}};function Ue(e){return{description:`Eroded heightfield: rolling buildable plains around the origin, a meandering river valley to the north, an estuary and beach coast to the west with an island, ridged mountains east/north/south; PBR splat, planar-reflective water with shore foam.`,cameras:{valley:{position:[400,30,-80],target:[20,4,-200]},coast:{position:[-230,95,40],target:[-720,0,-250]}},async setup(t){let n=e.data,r=e.gen;if(!n||!r)return;let i=n.cell,a=n.half,o=e=>r.river.zAt[Math.max(0,Math.min(n.res-1,Math.round((e+a)/i)))];{let e=o(20),r=o(400)+135,i=Math.max(n.getHeight(400,r)+14,22);t.camera.registerPreset(`valley`,{position:[400,i,r],target:[20,n.getHeight(20,e)+4,e]})}{let e=r.coast.xAt[Math.round((o(-560)+a)/i)]-140,s=o(-560),c=-170,l=o(-170)+260,u=Math.max(n.getHeight(c,l)+70,95);t.camera.registerPreset(`coast`,{position:[c,u,l],target:[e,0,s]})}t.log.info(`showcase staged: height range ${n.minH.toFixed(0)}..${n.maxH.toFixed(0)} m, river z(0)=${o(0).toFixed(0)}, coast x(0)=${r.coast.xAt[Math.round(a/i)].toFixed(0)}`)}}}var $={ctx:null,data:null,gen:null,mesh:null,water:null,grass:null,material:null,depthMaterial:null,liteMaterial:null,macro:null,land:null,seaMask:null,ripple:null,sets:null,sunColor:new x,skyColor:new x,lightColor:new x,moonTint:new x(.62,.72,.95),warm:new x(1,.55,.28),white:new x(1,.97,.92),lastVersion:-1,lastSun:new p,displaySurface:null},We={low:512,medium:640,high:640,ultra:1280},Ge={low:.5,medium:.65,high:.65,ultra:1.3};function Ke(e,t,n){e.features={river:{zAt:e=>t.river.zAt[Math.max(0,Math.min(n.res-1,Math.round((e+n.half)/n.cell)))],halfWidthAt:e=>t.river.halfWidth[Math.max(0,Math.min(n.res-1,Math.round((e+n.half)/n.cell)))]},coast:{xAt:e=>t.coast.xAt[Math.max(0,Math.min(n.res-1,Math.round((e+n.half)/n.cell)))]},island:{...t.island}}}function qe(e){if(!Number.isInteger(e)||e<0||!$.ctx||!$.data)return!1;let t=new ee(e,`root`).fork(`terrain`),n=ce(t.fork(`heightmap`),{res:$.data.res,size:$.data.size});if($.data.flow.set(n.flow),!$.ctx.world.terrain.setHeights(0,0,$.data.res-1,$.data.res-1,n.heights,{restore:!0}))return!1;$.gen=n,Ke($.ctx.world.terrain,n,$.data);let r=t.fork(`macro`),i=Ae([new U(r.fork(`a`)),new U(r.fork(`b`)),new U(r.fork(`c`)),new U(r.fork(`d`))],256),a=Ie(new U(t.fork(`ripple`)),256,1.4),o=je(xe(t.fork(`landcover`),n,$.ctx.quality===`low`?512:1024)),s=Fe(n,64);for(let e of[$.material,$.liteMaterial]){let t=e?.userData?.uniforms;t?.uMacro&&(t.uMacro.value=i),t?.uLandTex&&(t.uLandTex.value=o)}for(let e of $.grass?.materials||[]){let t=e.userData?.uniforms;t?.uMacro&&(t.uMacro.value=i),t?.uLandTex&&(t.uLandTex.value=o)}$.water&&($.water.uniforms.uMacro.value=i,$.water.uniforms.uRipple.value=a,$.water.uniforms.uSeaMask.value=s,$.water.invalidate());let c=[$.macro,$.ripple,$.land,$.seaMask];$.macro=i,$.ripple=a,$.land=o,$.seaMask=s;for(let e of c)e?.dispose();return $.mesh?.refreshBounds(),$.grass?.invalidate(),!0}var Je={name:`terrain`,dependencies:[`environment`],budget:{drawCalls:20,triangles:13e5},async init(e){$.ctx=e;let{world:t,events:n,assets:r,log:i}=e,a=t.terrain,o=performance.now(),s=ce(e.rng.fork(`heightmap`),{res:a.resolution||513,size:t.size}),c=new _e(s,a.seaLevel??0,16);$.gen=s,$.data=c,i.info(`heightfield ${c.res}² generated in ${(performance.now()-o).toFixed(0)} ms, range ${c.minH.toFixed(1)}..${c.maxH.toFixed(1)} m`),a.heights=c.heights,a.resolution=c.res,a.cellSize=c.cell,a.getHeight=(e,t)=>c.getHeight(e,t),a.getNormal=(e,t,n)=>c.getNormal(e,t,n),a.getSlope=(e,t)=>c.getSlope(e,t),a.isWater=(e,t)=>c.isWater(e,t),a.raycast=e=>c.raycast(e),a.modify=e=>c.modify(e)?(a.version=c.version,$.mesh&&$.mesh.refreshBounds(),$.water&&$.water.invalidate(),n.emit(`terrain:changed`,{x:e.x,z:e.z,radius:e.radius??20}),!0):!1,a.setHeights=(e,t,r,i,o,s={})=>c.setHeights(e,t,r,i,o)?(a.version=c.version,a.minHeight=c.minH,a.maxHeight=c.maxH,$.mesh?.refreshBounds(),$.water?.invalidate(),n.emit(`terrain:changed`,{x:(e+r)*c.cell/2-c.half,z:(t+i)*c.cell/2-c.half,radius:Math.hypot(r-e,i-t)*c.cell/2+c.cell,restore:s.restore===!0}),!0):!1,a.minHeight=c.minH,a.maxHeight=c.maxH,Ke(a,s,c);let[l,u,d,f,p,m]=await Promise.all([r.pbr(`aerial_grass_rock`),r.pbr(`leafy_grass`),r.pbr(`brown_mud_leaves_01`),r.pbr(`rock_face`),r.pbr(`aerial_beach_01`),r.pbr(`gravel_floor_02`)]);$.sets={grass:l,grassFine:u,dirt:d,rock:f,sand:p,scree:m};for(let e of[l,u,d,f,p,m])for(let t of[`map`,`normalMap`,`armMap`,`roughnessMap`]){let n=e[t];n&&(n.wrapS=n.wrapT=F,n.anisotropy=Math.min(t===`map`?4:2,r.anisotropy),n.needsUpdate=!0)}let h=e.rng.fork(`macro`);$.macro=Ae([new U(h.fork(`a`)),new U(h.fork(`b`)),new U(h.fork(`c`)),new U(h.fork(`d`))],256),$.ripple=Ie(new U(e.rng.fork(`ripple`)),256,1.4);let g=performance.now();$.land=je(xe(e.rng.fork(`landcover`),s,e.quality===`low`?512:1024)),$.seaMask=Fe(s,64),i.info(`land-cover map ${e.quality===`low`?512:1024}² in ${(performance.now()-g).toFixed(0)} ms`),$.material=De(c,{grass:l,grassFine:u,dirt:d,rock:f,sand:p,scree:m,macro:$.macro,land:$.land}),$.depthMaterial=ke(c),$.liteMaterial=Oe(c,$.macro,$.land),$.mesh=new ye(c,$.material,$.depthMaterial,{lodScale:Ge[e.quality]??1,layer:b.TERRAIN,proxyMaterial:$.liteMaterial}),e.group.add($.mesh.group),$.water=new Pe(c,{ripple:$.ripple,macro:$.macro,seaMask:$.seaMask,size:We[e.quality]??1024,mainCamera:e.camera.camera,seaLevel:c.seaLevel,onReflection:e=>{$.mesh.reflectionPass=e,$.grass&&($.grass.group.visible=!e),n.emit(`water:reflection`,{active:e})}}),e.group.add($.water.mesh),n.on(`infoview:changed`,()=>$.water?.invalidate(),`terrain`),$.grass=new He(c,e.rng.fork(`grass`),{seaLevel:c.seaLevel,layer:b.TERRAIN,macro:$.macro,land:$.land,world:t,modules:e.modules}),n.on(`roads:changed`,()=>{$.grass&&$.grass.invalidate()},`terrain`),e.group.add($.grass.group);let _=e.modules.environment;if(_&&typeof _.setupMaterial==`function`)for(let e of[$.material,$.liteMaterial,$.water.material,...$.grass.materials])try{_.setupMaterial(e)}catch(e){i.warn(`environment.setupMaterial failed`,e)}e.camera.updateCamera(),$.mesh.update(e.camera.camera),this.update(0,e),i.info(`ready in ${(performance.now()-o).toFixed(0)} ms; chunks visible ${$.mesh.stats.visible} (lod ${$.mesh.stats.lod.join(`/`)})`)},update(e,t){if(!$.mesh)return;let n=t.camera.camera,r=t.world.time,i=!r.paused&&r.speed>0;$.mesh.update(n),$.water.follow(n),$.grass.update(n,i?e:0,$.data.version);let o=t.world.weather;i&&$.water.update(e),$.water.refreshSky();let s=o.sunDir.y,c=a.smoothstep(s,-.05,.3);$.sunColor.copy($.warm).lerp($.white,a.smoothstep(s,0,.4)).multiplyScalar(Math.max(0,o.sunIntensity??3)/3.2),t.scene.fog?$.skyColor.copy(t.scene.fog.color):$.skyColor.copy(o.skyLight||$.white),$.skyColor.multiplyScalar(.35+.65*c),$.lastSun.equals(o.sunDir)||($.lastSun.copy(o.sunDir),i||$.water.invalidate());let l=o.lightDir||o.sunDir;l!==o.sunDir&&l.dot(o.sunDir)<.99?$.lightColor.copy($.moonTint).multiplyScalar(Math.min(1,(o.lightIntensity??.05)*6)):$.lightColor.copy($.sunColor),$.water.setSun(o.sunDir,$.sunColor,$.skyColor,c,l,$.lightColor)},dispose(e){$.mesh&&(e.group.remove($.mesh.group),$.mesh.dispose()),$.water&&(e.group.remove($.water.mesh),$.water.dispose()),$.grass&&=(e.group.remove($.grass.group),$.grass.dispose(),null),$.material?.dispose(),$.depthMaterial?.dispose(),$.liteMaterial?.dispose(),$.macro?.dispose(),$.land?.dispose(),$.seaMask?.dispose(),$.ripple?.dispose(),$.data?.dispose(),$.mesh=$.water=$.material=$.depthMaterial=$.data=$.gen=$.displaySurface=null},api:{serialize(){if(!$.data)return null;let e=new Uint8Array($.data.heights.length*4),t=new DataView(e.buffer);for(let e=0;e<$.data.heights.length;e++)t.setFloat32(e*4,$.data.heights[e],!0);let n=``;for(let t=0;t<e.length;t+=32768)n+=String.fromCharCode(...e.subarray(t,t+32768));return{version:1,resolution:$.data.res,encoding:`float32-le-base64`,heights:btoa(n)}},deserialize(e){if(!e||!$.data||e.resolution!==$.data.res||e.encoding!==`float32-le-base64`)throw Error(`incompatible terrain save`);let t=atob(e.heights),n=$.data.res*$.data.res;if(t.length!==n*4)throw Error(`invalid terrain save length`);let r=Uint8Array.from(t,e=>e.charCodeAt(0)),i=new DataView(r.buffer),a=new Float32Array(n);for(let e=0;e<n;e++)a[e]=i.getFloat32(e*4,!0);if(!$.ctx.world.terrain.setHeights(0,0,$.data.res-1,$.data.res-1,a,{restore:!0}))throw Error(`invalid terrain heights`)},displaySurface(){if(!$.mesh||!$.material)return null;if(!$.displaySurface){let e=$.mesh,t=$.material.userData.uniforms,n={};for(let e of[`uHeightTex`,`uNormalTex`,`uWorldMin`,`uCell`,`uLodDrop`,`uSkirt`])n[e]=t[e];$.displaySurface=Object.freeze({version:1,vertexPars:J,vertexBegin:Y,uniforms:Object.freeze(n),patches:Object.freeze($.mesh.meshes.map((t,n)=>Object.freeze({lod:n,geometry:t.geometry,get visible(){return $.mesh===e&&e.group.visible&&t.visible}}))),reflectionActive:()=>$.mesh===e&&e.reflectionPass})}return $.displaySurface},data:()=>$.data,stats:()=>$.mesh?{...$.mesh.stats}:null,setReflection(e){$.water&&($.water.enabled=!!e)},setGrassTufts(e){$.grass&&($.grass.enabled=!!e)},regenerate(e){return qe(e)},material:()=>$.material,debug:{setAnisotropy(e){if($.sets)for(let t of Object.values($.sets))for(let n of[`map`,`normalMap`,`armMap`])t[n]&&(t[n].anisotropy=e,t[n].needsUpdate=!0)},setWater(e){$.water&&($.water.mesh.visible=!!e)},setTerrain(e){$.mesh&&($.mesh.group.visible=!!e)},setLite(e){$.mesh&&$.mesh.setMaterial(e?$.liteMaterial:$.material)},waterRT(){return $.water?$.water.rt:null},setCastShadow(e){if($.mesh)for(let t of $.mesh.meshes)t.castShadow=!!e},setReceiveShadow(e){if($.mesh)for(let t of $.mesh.meshes)t.receiveShadow=!!e,t.material.needsUpdate=!0},setLodScale(e){$.mesh&&($.mesh.lodScale=e,$.mesh._dirty=!0)},setPlain(){if(!$.mesh)return;let e=new m({color:5601075,roughness:1});e.onBeforeCompile=e=>{Object.assign(e.uniforms,$.material.userData.uniforms),e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
`+J).replace(`#include <begin_vertex>`,Y)},e.customProgramCacheKey=()=>`plain-dbg`,$.mesh.setMaterial(e)},setDefines(e){$.material&&($.material.defines=e,$.material.needsUpdate=!0)}}},showcase:Ue($)};export{Je as default};