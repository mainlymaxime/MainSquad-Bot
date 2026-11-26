


import { CARD_CHANNEL_ID, COMMUNITY_CHANNELS, poolFor, recordCardMessage, recordCardReaction } from './cardStatsService.js';
import { logger } from '../utils/logger.js';
const LOG='1460932149707411457';
// Conservative cutoff: first ready event, just before tracking-ready log.
const CUTOFF=Date.parse('2026-11-26T03:53:26Z');
async function* pages(channel){
 let before;
 while(true){
  const page=await channel.messages.fetch({limit:100,...(before?{before}:{})});
  if(!page.size)return;
  yield [...page.values()];
  before=[...page.keys()].reduce((a,b)=>BigInt(a)<BigInt(b)?a:b);
  if(page.size<100)return;
 }
}
async function once(pool,guild,source,work){
 if((await pool.query('SELECT 1 FROM identity_v3_import WHERE guild_id=$1 AND source=$2',[guild,source])).rowCount)return;
 logger.info(`Identity import starting: ${source}`);
 await work();
 await pool.query('INSERT INTO identity_v3_import VALUES($1,$2) ON CONFLICT DO NOTHING',[guild,source]);
 logger.info(`Identity import complete: ${source}`);
}
async function importText(client,channel){
 let scanned=0;
 for await(const page of pages(channel)){ for(const m of page){
  await recordCardMessage(client,m);
  for(const reaction of m.reactions.cache.values()){
   let after;
   while(true){
    const users=await reaction.users.fetch({limit:100,...(after?{after}:{})});
    for(const user of users.values())await recordCardReaction(client,reaction,user);
    if(users.size<100)break;
    after=[...users.keys()].reduce((a,b)=>BigInt(a)>BigInt(b)?a:b);
   }
  }
 }
 scanned+=page.length; logger.info(`Identity text ${channel.id}: ${scanned} scanned`);
 }
}
function parse(m,botId){
 if(m.author.id!==botId)return null;
 const e=m.embeds[0];if(!e)return null;
 const type=({'🔊 Voice Joined':'join','🔇 Voice Left':'leave','🔄 Voice Channel Changed':'move'})[e.title];
 const time=e.timestamp?Date.parse(e.timestamp):m.createdTimestamp;
 if(!type||!Number.isFinite(time)||time>=CUTOFF)return null;
 const d=e.description||'';
 const user=d.match(/<@!?(\d+)>/)?.[1];
 const channels=[...d.matchAll(/<#(\d+)>/g)].map(x=>x[1]);
 if(!user||!channels[0]||(type==='move'&&!channels[1]))return null;
 return {type,time,user,channels,id:m.id};
}
async function importVoice(client,guild,pool,channel){
 // Walk backwards, pairing each closing event with its immediately preceding opening event.
 const pending=new Map();
 let scanned=0, matched=0, paired=0;
 for await(const page of pages(channel)){
  page.sort((a,b)=>b.createdTimestamp-a.createdTimestamp || (BigInt(a.id)>BigInt(b.id)?-1:1));
  for(const m of page){
   const e=parse(m,client.user.id);if(!e)continue; matched++;
   const end=pending.get(e.user);
   const opened=e.type==='join'?e.channels[0]:e.type==='move'?e.channels[1]:null;
   if(end&&opened===end.channel&&opened!==guild.afkChannelId&&e.time<end.time){
    paired++;
    await pool.query('INSERT INTO identity_v3_voice VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[guild.id,e.user,end.id,end.time-e.time]);
   }
   if(e.type==='leave'||e.type==='move')pending.set(e.user,{channel:e.channels[0],time:e.time,id:e.id});
   else pending.delete(e.user);
  }
  scanned+=page.length; logger.info(`Identity voice: ${scanned} scanned, ${matched} matched, ${paired} paired`);
 }
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function runSource(client,guild,pool,id){
 for(let attempt=1;attempt<=5;attempt++){
  try{
   await once(pool,guild.id,id,async()=>{
    const channel=await guild.channels.fetch(id);
    if(!channel?.messages)throw new Error(`Not a message channel: ${id}`);
    if(!channel.permissionsFor(guild.members.me)?.has(['ViewChannel','ReadMessageHistory']))throw new Error(`Missing history permissions: ${id}`);
    if(id===LOG)await importVoice(client,guild,pool,channel);else await importText(client,channel);
   });
   return;
  }catch(e){
   logger.error(`Identity import ${id} attempt ${attempt}: ${e.message}`);
   if(attempt<5)await sleep(Math.min(60000,5000*2**(attempt-1)));
  }
 }
 logger.error(`Identity import ${id} incomplete after retries; restart to resume`);
}
export async function importCardHistory(client){
 const pool=await poolFor(client);
 for(const guild of client.guilds.cache.values()){
  if(!guild.channels.cache.has(CARD_CHANNEL_ID))continue;
  await Promise.all([
   runSource(client,guild,pool,LOG),
   (async()=>{for(const id of COMMUNITY_CHANNELS)await runSource(client,guild,pool,id);})()
  ]);
 }
}




