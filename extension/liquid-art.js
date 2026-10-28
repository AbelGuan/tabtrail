// Local decorative artwork. One continuous colour field, masked to each icon.
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const blue=[32,66,166],purple=[143,125,213],coral=[240,112,125],sunset=[250,112,64],highlight=[205,216,255];

export function createLiquidRenderer(ctx,kind) {
 const folder=new Path2D('M36 60H120L144 96H252V240H36Z');
 const clock=new Path2D();clock.arc(144,144,108,0,Math.PI*2);
 const hands=new Path2D('M144 79V144L187 176');
 const history=new Path2D('M47 112A102 102 0 1 1 47 178 M40 44V112H108 M144 84V144L101 167');
 const spark=new Path2D('M144 24L180 108L264 144L180 180L144 264L108 180L24 144L108 108Z');
 const surface=document.createElement('canvas');surface.width=surface.height=180;
 const source=surface.getContext('2d');
 if(!source)return null;
 const pixels=source.createImageData(180,180);
 // Only shade pixels that can contribute to the final silhouette. Include a
 // three-pixel sampling guard so antialiasing and scaled edges stay identical.
 source.save();source.scale(180/288,180/288);source.lineCap='round';source.lineJoin='round';
 if(kind==='history'){source.lineWidth=28;source.stroke(history);}
 else source.fill(kind==='clock'?clock:kind==='spark'?spark:folder);
 source.restore();
 const mask=source.getImageData(0,0,180,180).data,needed=new Uint8Array(180*180);
 for(let y=0;y<180;y++)for(let x=0;x<180;x++)if(mask[(y*180+x)*4+3]){
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
   const xx=x+dx,yy=y+dy;if(xx>=0&&xx<180&&yy>=0&&yy<180)needed[yy*180+xx]=1;
  }
 }
 const samples=[];
 for(let y=0;y<180;y++)for(let x=0;x<180;x++)if(needed[y*180+x])samples.push({x:x/180,y:y/180,index:(y*180+x)*4});
 // Fixed-size corner cache avoids per-pixel string allocation. Coordinate tags
 // make collisions harmless and keep memory bounded on long-open dashboards.
 const cacheX=new Float64Array(1024).fill(NaN),cacheY=new Float64Array(1024),cacheValue=new Float64Array(1024);
 function hash(x,y){
  const key=(x&31)*32+(y&31);
  if(cacheX[key]===x&&cacheY[key]===y)return cacheValue[key];
  const n=Math.sin(x*127.1+y*311.7)*43758.5453,value=n-Math.floor(n);
  cacheX[key]=x;cacheY[key]=y;cacheValue[key]=value;return value;
 }
 function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);
 }
 function field(x,y,t){
  const qx=noise(x*1.5+t*.12,y*1.5-t*.09);
  const qy=noise(x*1.5+5-t*.08,y*1.5+t*.11);
  const u=x+1.15*(qx-.5),v=y+1.15*(qy-.5);
  return .76*noise(u*2.1+t*.13,v*2.1-t*.1)+.24*noise(u*4.2-t*.08,v*4.2+8);
 }
 return time=>{
  const data=pixels.data;
  for(const {x,y,index} of samples){
   const f=field(x,y,time);
   const warm=smooth(.48,.68,f),violet=smooth(.35,.55,f)*(1-warm);
   const light=(smooth(.24,.6,f)*.22+Math.pow(Math.max(0,1-Math.abs(f-.57)*12),4)*.1)*(1-.7*warm);
   for(let channel=0;channel<3;channel++){
    const ember=mix(coral[channel],sunset[channel],smooth(.3,.9,warm));
    const color=mix(mix(blue[channel],purple[channel],violet),ember,warm);
    data[index+channel]=mix(color,highlight[channel],light);
   }
   data[index+3]=255;
  }
  source.putImageData(pixels,0,0);
  const {width,height}=ctx.canvas;
  ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/288,height/288);
  ctx.drawImage(surface,0,0,288,288);
  ctx.globalCompositeOperation='destination-in';ctx.lineCap='round';ctx.lineJoin='round';
  if(kind==='history'){ctx.lineWidth=28;ctx.stroke(history);}
  else ctx.fill(kind==='clock'?clock:kind==='spark'?spark:folder);
  if(kind==='clock'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=15;ctx.stroke(hands);}
  ctx.restore();
 };
}
