


import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { getCardAbility } from './cardAbilityService.js';
import { syncCardVoice, poolFor, COMMUNITY_CHANNELS, RESTRICTED_CHANNEL } from './cardStatsService.js';

for (const [file, alias] of [['Higuen Serif.otf','IdentityHiguen'],['poppins.regular.ttf','IdentityPoppins'],['poppins.semibold.ttf','IdentityPoppinsSemi'],['poppins.italic.ttf','IdentityPoppinsItalic']]) {
  if (!GlobalFonts.registerFromPath(fileURLToPath(new URL(`../assets/fonts/${file}`, import.meta.url)), alias)) {
    throw new Error(`Identity font registration failed: ${file}`);
  }
}

const tiers = [
  [0,0,'pink'], [250,5,'bronze'], [750,15,'silver'],
  [2000,35,'gold'], [3500,60,'gold'], [5000,100,'glitter']
];
const fmt = n => Number(n).toLocaleString('nl-NL');
const clamp = n => Math.max(0, Math.min(1,n));
export function cardProgress(messages, voiceMs) {
  const hours = voiceMs / 3600000;
  let level = 0;
  for (let i=1;i<tiers.length;i++) if(messages>=tiers[i][0] && hours>=tiers[i][1]) level=i;
  const next=tiers[Math.min(level+1,5)];
  const previous=tiers[level];
  const m=clamp(messages/next[0]), v=clamp(hours/next[1]);
  const reputation=level===5?1:Math.min(clamp((messages-previous[0])/(next[0]-previous[0])),clamp((hours-previous[1])/(next[1]-previous[1])));
  return {level, edition:previous[2], m,v,reputation};
}
async function readStats(client,guildId,userId) {
  await syncCardVoice(client);
  const pool=await poolFor(client);
  const {rows:[r]}=await pool.query(`WITH m AS (SELECT * FROM identity_v3_messages WHERE guild_id=$1 AND user_id=$2),
  rx AS (SELECT emoji FROM identity_v3_reactions WHERE guild_id=$1 AND user_id=$2),
  em AS (SELECT value AS emoji FROM m CROSS JOIN LATERAL jsonb_array_elements_text(m.emojis) UNION ALL SELECT emoji FROM rx),
  ec AS (SELECT emoji,count(*) AS n FROM em GROUP BY emoji),
  cc AS (SELECT channel_id,count(*) AS n FROM m GROUP BY channel_id)
  SELECT (SELECT count(*) FROM m) AS messages,
  COALESCE((SELECT voice_ms FROM mainsquad_identity_stats WHERE guild_id=$1 AND user_id=$2),0)+COALESCE((SELECT sum(ms) FROM identity_v3_voice WHERE guild_id=$1 AND user_id=$2),0) AS voice_ms,
  (SELECT emoji FROM ec ORDER BY n DESC,emoji LIMIT 1) AS emoji,
  (SELECT channel_id FROM cc ORDER BY n DESC,channel_id LIMIT 1) AS channel,
  (SELECT count(*) FROM em) AS emoji_count,(SELECT count(*) FROM ec) AS distinct_emoji,
  (SELECT count(*) FROM cc) AS channel_count,COALESCE((SELECT max(n) FROM cc),0) AS top_channel_count,
  (SELECT count(*) FROM rx) AS reactions`,[guildId,userId]);
  return {messages:Number(r.messages),voiceMs:Number(r.voice_ms),emoji:r.emoji,channel:r.channel,emojiCount:Number(r.emoji_count),distinctEmoji:Number(r.distinct_emoji),channelCount:Number(r.channel_count),topChannelCount:Number(r.top_channel_count),reactionCount:Number(r.reactions)};
}
// Detect the actual dark tracks in the loaded template, before drawing overlays.
function detectBars(ctx, width, height, edition) {
  const data=ctx.getImageData(0,0,width,height).data;
  const sx=width/1044, sy=height/1472;
  const lum=(x,y)=>{const i=(Math.round(y*sy)*width+Math.round(x*sx))*4;return .2126*data[i]+.7152*data[i+1]+.0722*data[i+2];};
  const mean=y=>{let sum=0;for(let x=250;x<=850;x+=10)sum+=lum(x,y);return sum/61;};
  const fallback=edition==='glitter'?[[112,780,827,32],[124,887,828,32],[124,1003,828,32]]:[[106,789,832,32],[118,897,832,32],[118,1014,832,32]];
  return [805,912,1030].map((center,i)=>{
    const start=center-48,end=center+48;
    const rows=Array.from({length:end-start+1},(_,j)=>mean(start+j));
    const min=Math.min(...rows), sorted=[...rows].sort((a,b)=>a-b), bg=sorted[Math.floor(sorted.length*.8)];
    if(bg-min<15)return fallback[i];
    const threshold=min+(bg-min)*.35;
    let mid=rows.indexOf(min), top=mid,bottom=mid;
    while(top>0&&rows[top-1]<threshold)top--;
    while(bottom<rows.length-1&&rows[bottom+1]<threshold)bottom++;
    const y=start+top,h=bottom-top+1;
    if(h<15||h>48)return fallback[i];
    const cy=y+Math.floor(h/2);
    const isTrack=x=>lum(x,cy)<threshold+12;
    let left=522,right=522;
    while(left>65&&isTrack(left-1))left--;
    while(right<990&&isTrack(right+1))right++;
    if(right-left<650||right-left>900)return fallback[i];
    return [left,y,right-left+1,h];
  });
}
function drawProgressBar(ctx,x,y,w,h,f,edition){
  const inset=3;
  x+=inset;y+=inset;w-=inset*2;h-=inset*2;
  const width=w*clamp(f);if(width<=0)return;
  const colors={pink:['#f9c8d7','#c27080'],bronze:['#f4c9a6','#a86c48'],silver:['#e4eaf2','#8c9aa9'],gold:['#ffe5a4','#bc8d38'],glitter:['#e7d5ff','#a9dce8']};
  const [light,dark]=colors[edition];
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,h/2);ctx.clip();
  ctx.beginPath();ctx.roundRect(x,y,width,h,Math.min(h/2,width/2));
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,light);g.addColorStop(.20,'#fff8ed');g.addColorStop(.40,light);g.addColorStop(.78,dark);g.addColorStop(1,light);
  ctx.fillStyle=g;ctx.fill();ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x,y+2,width,h*.22);ctx.restore();
}
const jewelColors={pink:['#fff1f6','#e6a8c0','#8c526b'],bronze:['#fff0d6','#d49a70','#75432e'],silver:['#f5fbff','#b3c9df','#566b85'],gold:['#fff8ce','#e9c16a','#96702e'],glitter:['#f9f0ff','#b7d9f4','#8070a5']};
function starPath(ctx,x,y,r){
  ctx.beginPath();
  for(let j=0;j<10;j++){
    const a=-Math.PI/2+j*Math.PI/5, d=j%2?r*.46:r;
    const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
    if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();
}
function drawGlassStar(ctx,x,y,edition){
  const [light,mid,dark]=jewelColors[edition];
  ctx.save();ctx.lineJoin='round';
  ctx.shadowColor='rgba(45,28,52,.38)';ctx.shadowBlur=6;ctx.shadowOffsetY=4;
  starPath(ctx,x,y,27);ctx.fillStyle=dark;ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  const rim=ctx.createLinearGradient(x-25,y-27,x+25,y+27);
  rim.addColorStop(0,'#ffffff');rim.addColorStop(.3,mid);rim.addColorStop(.55,dark);rim.addColorStop(.78,'#ffffff');rim.addColorStop(1,dark);
  starPath(ctx,x,y,27);ctx.fillStyle=rim;ctx.fill();
  starPath(ctx,x,y,22.5);
  const glass=ctx.createLinearGradient(x,y-23,x,y+23);
  glass.addColorStop(0,'#ffffff');glass.addColorStop(.32,light);glass.addColorStop(.52,mid);glass.addColorStop(.65,dark);glass.addColorStop(1,light);
  ctx.fillStyle=glass;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1;ctx.stroke();
  ctx.save();starPath(ctx,x,y,22.5);ctx.clip();
  for(let j=0;j<10;j++){
    const a=-Math.PI/2+j*Math.PI/5,b=a+Math.PI/5;
    const r=j%2?10.35:22.5,t=j%2?22.5:10.35;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.lineTo(x+Math.cos(b)*t,y+Math.sin(b)*t);ctx.closePath();
    ctx.fillStyle=j%3===0?'rgba(255,255,255,.32)':j%3===1?'rgba(45,30,70,.13)':'rgba(255,255,255,.06)';ctx.fill();
  }
  ctx.beginPath();ctx.ellipse(x-5,y-12,12,4,-.38,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.7)';ctx.fill();ctx.restore();
  ctx.restore();
}
function drawCardFinish(ctx,edition){
  ctx.save();
  const gloss=ctx.createLinearGradient(0,0,1044,850);
  gloss.addColorStop(0,'rgba(255,255,255,0)');gloss.addColorStop(.25,'rgba(255,255,255,0)');gloss.addColorStop(.34,'rgba(255,255,255,.15)');gloss.addColorStop(.40,'rgba(255,255,255,.035)');gloss.addColorStop(.48,'rgba(255,255,255,0)');gloss.addColorStop(.76,'rgba(255,255,255,0)');gloss.addColorStop(.81,edition==='glitter'?'rgba(210,240,255,.16)':'rgba(255,255,255,.09)');gloss.addColorStop(.88,'rgba(255,255,255,0)');gloss.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gloss;ctx.fillRect(0,0,1044,1472);
  const edge=ctx.createLinearGradient(0,0,1044,1472);
  edge.addColorStop(0,'rgba(255,255,255,.85)');edge.addColorStop(.45,'rgba(255,255,255,.18)');edge.addColorStop(1,'rgba(65,40,65,.32)');
  ctx.beginPath();ctx.roundRect(7,7,1030,1458,15);ctx.strokeStyle=edge;ctx.lineWidth=5;ctx.stroke();
  ctx.beginPath();ctx.roundRect(13,13,1018,1446,12);ctx.strokeStyle='rgba(255,255,255,.30)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
}
async function remoteImage(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error(`Image HTTP ${response.status}`);
  return loadImage(Buffer.from(await response.arrayBuffer()));
}
export async function createIdentityCard(client,member) {
  const stats=await readStats(client,member.guild.id,member.id);
  const p=cardProgress(stats.messages,stats.voiceMs), ability=getCardAbility(stats);
  const template=await loadImage(fileURLToPath(new URL(`../assets/cards/${p.edition}.png`,import.meta.url)));
  const canvas=createCanvas(template.width,template.height), ctx=canvas.getContext('2d');
  ctx.drawImage(template,0,0);
  const bars=detectBars(ctx,template.width,template.height,p.edition);
  ctx.scale(template.width/1044,template.height/1472);
  drawCardFinish(ctx,p.edition);
  const glitter=p.edition==='glitter';
  const ink='#51434c';
  function text(value,x,y,size,maxWidth,align='center',family='IdentityPoppinsSemi') {
    ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=ink;
    do {ctx.font=`${size}px "${family}"`;if(ctx.measureText(value).width<=maxWidth||size<=12)break;size--;}while(true);
    ctx.fillText(value,x,y,maxWidth);
  }
  const avatar=await remoteImage(member.displayAvatarURL({extension:'png',size:512,forceStatic:true}));
  ctx.save();ctx.beginPath();ctx.arc(522,316,160,0,Math.PI*2);ctx.clip();
  ctx.drawImage(avatar,362,156,320,320);ctx.restore();
  text(member.displayName || member.user.globalName || member.user.username,522,glitter?532:540,53,720,'center','IdentityHiguen');
  const stars=p.level;
  for(let i=0;i<stars;i++) {
    drawGlassStar(ctx,522+(i-(stars-1)/2)*62,600,p.edition);
  }
  const minutes=Math.floor(stats.voiceMs/60000);
  const values=[fmt(stats.messages),`${Math.floor(minutes/60)} UUR EN ${minutes%60} MIN`,`LEVEL ${p.level}`];
  [p.m,p.v,p.reputation].forEach((fraction,i)=>{
    const [x,y,w,h]=bars[i];text(values[i],x+w-8,y-16,21,480,'right');
    drawProgressBar(ctx,x,y,w,h,fraction,p.edition);
  });
  const ey=glitter?1155:1165;
  let emojiDrawn=false;
  if(stats.emoji){
    const custom=/^custom:(\d+)$/.exec(stats.emoji);
    const code=Array.from(stats.emoji).map(c=>c.codePointAt(0).toString(16)).join('-');
    const url=custom?`https://cdn.discordapp.com/emojis/${custom[1]}.png?size=128`:`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code.replace(/-fe0f/g,'')}.png`;
    try {const emote=await remoteImage(url);ctx.drawImage(emote,203,ey-30,60,60);emojiDrawn=true;}catch{}
  }
  if(!emojiDrawn) text(stats.emoji?'NIET BESCHIKBAAR':'NOG GEEN EMOTE',233,ey,23,300);
  const channel=stats.channel?member.guild.channels.cache.get(stats.channel):null;
  const visible=channel?.permissionsFor(member)?.has('ViewChannel') && COMMUNITY_CHANNELS.has(channel.id) && channel.id!==RESTRICTED_CHANNEL && !channel.nsfw;
  text((channel?(visible?`#${channel.name.replace(/[^\p{L}\p{N} _-]/gu, "").replace(/^[ _-]+|[ _-]+$/g, "") || "KANAAL"}`:'Privékanaal'):'Nog geen kanaal').toUpperCase(),795,ey,24,360);
  text(ability.title.toUpperCase(),522,glitter?1245:1258,32,790);
  text(ability.description.toUpperCase(),522,glitter?1295:1308,21,790,'center','IdentityPoppinsItalic');
  return canvas.toBuffer('image/png');
}




