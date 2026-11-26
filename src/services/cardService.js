


import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { getCardAbility } from './cardAbilityService.js';
import { syncCardVoice } from './cardStatsService.js';

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
  const pool=client.db?.db?.pool;
  if(!pool) throw new Error('Identity requires PostgreSQL');
  const {rows}=await pool.query(`SELECT s.messages,s.voice_ms,c.kind,c.value,c.amount FROM (SELECT $1::text AS guild_id,$2::text AS user_id) u LEFT JOIN mainsquad_identity_stats s USING(guild_id,user_id) LEFT JOIN mainsquad_identity_counts c USING(guild_id,user_id) ORDER BY c.amount DESC NULLS LAST,c.value ASC`,[guildId,userId]);
  const emojis=rows.filter(r=>r.kind==='emoji'), channels=rows.filter(r=>r.kind==='channel');
  return {messages:Number(rows[0]?.messages||0),voiceMs:Number(rows[0]?.voice_ms||0),emoji:emojis[0]?.value,channel:channels[0]?.value,emojiCount:emojis.reduce((a,r)=>a+Number(r.amount),0),distinctEmoji:emojis.length,channelCount:channels.length,topChannelCount:Number(channels[0]?.amount||0)};
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
  ctx.scale(template.width/1044,template.height/1472);
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
  text(member.user.username,522,glitter?532:540,53,720,'center','IdentityHiguen');
  const stars=Math.min(p.level+1,5);
  for(let i=0;i<stars;i++) {
    const x=522+(i-(stars-1)/2)*62, y=600;
    ctx.beginPath();
    for(let j=0;j<10;j++) {
      const a=-Math.PI/2+j*Math.PI/5, r=j%2?11:25;
      const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r;
      if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();
    const gradient=ctx.createLinearGradient(x-25,y-25,x+25,y+25);
    gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.45,'#e4d7dd');gradient.addColorStop(1,'#796772');
    ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.5;ctx.stroke();
  }
  const bars=glitter?[[112,780,827],[124,887,827],[124,1003,827]]:[[105,789,834],[118,897,834],[118,1014,834]];
  const minutes=Math.floor(stats.voiceMs/60000);
  const values=[fmt(stats.messages),`${Math.floor(minutes/60)} UUR EN ${minutes%60} MIN`,`LEVEL ${p.level}`];
  [p.m,p.v,p.reputation].forEach((fraction,i)=>{
    const [x,y,w]=bars[i];text(values[i],x+w,y-39,21,480,'right');
    const fill=(w-16)*fraction;if(fill>0){ctx.fillStyle='#fff';ctx.beginPath();ctx.roundRect(x+8,y+6,fill,20,Math.min(10,fill/2));ctx.fill();}
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
  const visible=channel?.permissionsFor(member)?.has('ViewChannel') && channel?.permissionsFor(member.guild.roles.everyone)?.has('ViewChannel');
  text((channel?(visible?`#${channel.name}`:'Privékanaal'):'Nog geen kanaal').toUpperCase(),795,ey,24,360);
  text(ability.title.toUpperCase(),522,glitter?1245:1258,32,790);
  text(ability.description.toUpperCase(),522,glitter?1295:1308,21,790,'center','IdentityPoppinsItalic');
  return canvas.toBuffer('image/png');
}




