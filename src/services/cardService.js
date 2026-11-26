








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
const barPositions={pink:[[112,775,838,32],[120,882,838,32],[120,999,838,32]],bronze:[[105,789,834,32],[118,897,834,32],[118,1014,834,32]],silver:[[105,789,834,32],[118,897,834,32],[118,1014,834,32]],gold:[[105,789,834,32],[118,897,834,32],[118,1014,834,32]],glitter:[[112,780,827,32],[124,887,827,32],[124,1003,827,32]]};
function drawProgressBar(ctx,x,y,w,h,f,edition){
  const width=(w-12)*clamp(f);if(width<=0)return;
  x+=6;y+=6;h-=12;
  const colors={pink:['#f9c8d7','#c27080'],bronze:['#f4c9a6','#a86c48'],silver:['#e4eaf2','#8c9aa9'],gold:['#ffe5a4','#bc8d38'],glitter:['#e7d5ff','#a9dce8']};
  const [light,dark]=colors[edition];
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,width,h,Math.min(h/2,width/2));ctx.clip();
  const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'rgba(255,255,255,.72)');g.addColorStop(.25,light+'b8');g.addColorStop(.55,dark+'a0');g.addColorStop(1,light+'c0');ctx.fillStyle=g;ctx.fillRect(x,y,width,h);
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x,y+2,width,h*.22);ctx.restore();
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
  const bars=barPositions[p.edition];
  const minutes=Math.floor(stats.voiceMs/60000);
  const values=[fmt(stats.messages),`${Math.floor(minutes/60)} UUR EN ${minutes%60} MIN`,`LEVEL ${p.level}`];
  [p.m,p.v,p.reputation].forEach((fraction,i)=>{
    const [x,y,w,h]=bars[i];text(values[i],x+w-8,y-24,21,480,'right');
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
  text((channel?(visible?`#${channel.name}`:'Privékanaal'):'Nog geen kanaal').toUpperCase(),795,ey,24,360);
  text(ability.title.toUpperCase(),522,glitter?1245:1258,32,790);
  text(ability.description.toUpperCase(),522,glitter?1295:1308,21,790,'center','IdentityPoppinsItalic');
  return canvas.toBuffer('image/png');
}




