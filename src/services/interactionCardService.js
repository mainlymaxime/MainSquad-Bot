


import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
const asset = p => fileURLToPath(new URL('../assets/'+p, import.meta.url));
let fontsReady=false;
function fonts(){if(fontsReady)return;for(const [f,a] of [['Higuen Serif.otf','InteractionsHiguen'],['poppins.regular.ttf','InteractionsPoppins'],['poppins.semibold.ttf','InteractionsSemi']]){if(!GlobalFonts.registerFromPath(asset('fonts/'+f),a))throw new Error('Missing font '+f);}fontsReady=true;}
const keys=['hug','spank','hit','kiss','lick','yeet','highfive'];
const fmt=n=>Number(n).toLocaleString('nl-NL');
function pill(c,x,y,w,h){c.beginPath();c.roundRect(x,y,w,h,Math.min(w,h)/2);}
function bar(c,x,y,w,h,n,max){const p=Math.min(1,Math.max(0,n/max));c.save();pill(c,x,y,w,h);c.clip();const base=c.createLinearGradient(0,y,0,y+h);base.addColorStop(0,'#605b60');base.addColorStop(.5,'#93868e');base.addColorStop(1,'#6e626a');c.fillStyle=base;c.fillRect(x,y,w,h);const fw=(w-6)*p;if(fw>0){const g=c.createLinearGradient(0,y+3,0,y+h-3);g.addColorStop(0,'#fff0f5');g.addColorStop(.28,'#ffd3e2');g.addColorStop(.55,'#dc91a8');g.addColorStop(.82,'#b85d7b');g.addColorStop(1,'#edb0c3');pill(c,x+3,y+3,fw,h-6);c.fillStyle=g;c.fill();}c.restore();}
function badge(c,x,y,unlocked){c.save();const r=15;const g=c.createLinearGradient(x-r,y-r,x+r,y+r);g.addColorStop(0,unlocked?'#a95b79':'#777');g.addColorStop(.35,unlocked?'#fff0f5':'#f5f5f5');g.addColorStop(.65,unlocked?'#d18ba5':'#aaa');g.addColorStop(1,unlocked?'#a95b79':'#666');c.shadowColor='#75455855';c.shadowBlur=4;c.shadowOffsetY=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=g;c.fill();c.shadowColor='transparent';c.strokeStyle='#fff9';c.lineWidth=1.5;c.stroke();c.strokeStyle=unlocked?'#79334e':'#555';c.lineWidth=2.5;c.lineCap='round';c.lineJoin='round';if(unlocked){c.beginPath();c.moveTo(x-6,y);c.lineTo(x-1,y+5);c.lineTo(x+7,y-5);c.stroke();}else{c.beginPath();c.roundRect(x-6,y-1,12,9,2);c.stroke();c.beginPath();c.arc(x,y-1,4,Math.PI,0);c.stroke();}c.restore();}
function text(c,s,x,y,size=25,color='#a9536d',align='center',family='InteractionsSemi'){c.font=`${size}px "${family}"`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(s),x,y);}
export async function createInteractionCard(member,rows){fonts();const bg=await loadImage(asset('cards/interactions.png'));const canvas=createCanvas(bg.width,bg.height),c=canvas.getContext('2d');c.drawImage(bg,0,0);c.scale(bg.width/1649,bg.height/929);const avatar=await loadImage(member.displayAvatarURL({extension:'png',size:256,forceStatic:true}));c.save();c.beginPath();c.arc(162,147,104,0,Math.PI*2);c.clip();c.drawImage(avatar,58,43,208,208);c.restore();let name=member.displayName.normalize('NFKC').replace(/[\p{Cf}\p{Cc}]/gu,'').trim()||member.user.username;let size=54;c.font=`${size}px InteractionsHiguen`;while(c.measureText(name).width>1000&&size>18){size-=2;c.font=`${size}px InteractionsHiguen`;}text(c,name,300,146,size,'#a9536d','left','InteractionsHiguen');const stats=keys.map(k=>({given:Number(rows.get(k)?.given||0),received:Number(rows.get(k)?.received||0)}));const given=stats.reduce((a,b)=>a+b.given,0),received=stats.reduce((a,b)=>a+b.received,0),ach=stats.filter(s=>s.given>=50).length+Number(given>=500);text(c,fmt(given),215,350,34,'#fff');text(c,fmt(received),618,350,34,'#fff');text(c,`${ach} / 8`,1273,350,34,'#fff');const ys=[502,553,607,660,714,767,821];stats.forEach((s,i)=>{const y=ys[i];text(c,fmt(s.given),390,y);text(c,fmt(s.received),625,y);bar(c,865,y-10,447,21,s.given,50);text(c,`${Math.min(s.given,50)}/50`,1355,y,17);badge(c,1470,y,s.given>=50);});bar(c,410,858,1047,31,given,500);text(c,`${Math.min(given,500)}/500`,933,874,19,'#fff');return canvas.toBuffer('image/png');}




