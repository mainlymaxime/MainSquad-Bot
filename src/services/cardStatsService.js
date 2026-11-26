








import { logger } from '../utils/logger.js';
export const CARD_CHANNEL_ID = '1575335887343059166';
export const COMMUNITY_CHANNELS = new Set(['1225514970108923940','1257765402755203184','1532137707059544145','1500934706118524982','1467872818703106234','1246456986858422304','1225514970108923943','1547668790450462760','1539890074521706506','1225514970511315075','1475790153082605579','1446994430296064040']);
export const RESTRICTED_CHANNEL = '1225514970108923943';
const INTERVAL=30000;
const sessions=new Map();
let schemaPromise, timer;
let queue=Promise.resolve();
export async function poolFor(client) {
 const pool=client.db?.db?.pool;
 if(!pool) throw new Error('Identity requires PostgreSQL');
 if(!schemaPromise) schemaPromise=pool.query(`
 CREATE TABLE IF NOT EXISTS mainsquad_identity_stats (guild_id TEXT NOT NULL,user_id TEXT NOT NULL,messages BIGINT NOT NULL DEFAULT 0,voice_ms BIGINT NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,user_id));
 CREATE TABLE IF NOT EXISTS identity_v3_messages (guild_id TEXT NOT NULL,user_id TEXT NOT NULL,message_id TEXT PRIMARY KEY,channel_id TEXT NOT NULL,emojis JSONB NOT NULL);
 CREATE INDEX IF NOT EXISTS identity_v3_messages_user ON identity_v3_messages(guild_id,user_id);
 CREATE TABLE IF NOT EXISTS identity_v3_reactions (guild_id TEXT NOT NULL,user_id TEXT NOT NULL,message_id TEXT NOT NULL,emoji TEXT NOT NULL,PRIMARY KEY(message_id,user_id,emoji));
 CREATE INDEX IF NOT EXISTS identity_v3_reactions_user ON identity_v3_reactions(guild_id,user_id);
 CREATE TABLE IF NOT EXISTS identity_v3_voice (guild_id TEXT NOT NULL,user_id TEXT NOT NULL,end_id TEXT PRIMARY KEY,ms BIGINT NOT NULL);
 CREATE INDEX IF NOT EXISTS identity_v3_voice_user ON identity_v3_voice(guild_id,user_id);
 CREATE TABLE IF NOT EXISTS identity_v3_import (guild_id TEXT NOT NULL,source TEXT NOT NULL,PRIMARY KEY(guild_id,source));
 `).catch(e=>{schemaPromise=undefined;throw e;});
 await schemaPromise;return pool;
}
function targetGuild(guild){return guild?.channels.cache.has(CARD_CHANNEL_ID);}
export async function recordCardMessage(client,message){
 if(!targetGuild(message.guild)||!COMMUNITY_CHANNELS.has(message.channelId)||!message.author||message.author.bot||message.webhookId) return;
 const emojis=[];
 const plain=(message.content||'').replace(/<a?:[\w]+:(\d+)>/g,(_,id)=>{emojis.push(`custom:${id}`);return ' ';});
 for(const {segment} of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(plain)) if(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(segment)) emojis.push(segment);
 const pool=await poolFor(client);
 await pool.query(`INSERT INTO identity_v3_messages VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING`,[message.guild.id,message.author.id,message.id,message.channelId,JSON.stringify(emojis)]);
}
export async function recordCardReaction(client,reaction,user){
 const m=reaction.message;
 if(!targetGuild(m.guild)||!COMMUNITY_CHANNELS.has(m.channelId)||user.bot) return;
 const emoji=reaction.emoji.id?`custom:${reaction.emoji.id}`:reaction.emoji.name;
 if(!emoji)return;
 const pool=await poolFor(client);
 await pool.query(`INSERT INTO identity_v3_reactions VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[m.guild.id,user.id,m.id,emoji]);
}
function snapshot(client) {
  const active = new Map();
  for (const guild of client.guilds.cache.values()) {
    if (!targetGuild(guild) || !guild.available) continue;
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId || state.channelId === guild.afkChannelId || !state.member || state.member.user.bot) continue;
      active.set(`${guild.id}:${state.id}`, [guild.id,state.id]);
    }
  }
  return active;
}
export function syncCardVoice(client) {
  const now = Date.now();
  const active = snapshot(client);
  const increments = [];
  for (const [key, session] of sessions) {
    const elapsed = Math.max(0, Math.min(now-session.time, INTERVAL));
    if (elapsed) increments.push([...session.ids,elapsed]);
    if (!active.has(key)) sessions.delete(key);
  }
  for (const [key,ids] of active) sessions.set(key,{ids,time:now});
  queue = queue.catch(()=>{}).then(async()=>{
    if (!increments.length) return;
    const pool = await poolFor(client);
    for (const [guild,user,ms] of increments) await pool.query(`INSERT INTO mainsquad_identity_stats(guild_id,user_id,voice_ms) VALUES($1,$2,$3)
      ON CONFLICT(guild_id,user_id) DO UPDATE SET voice_ms=mainsquad_identity_stats.voice_ms+EXCLUDED.voice_ms`,[guild,user,ms]);
  });
  return queue;
}
export async function startCardStats(client) {
  await poolFor(client);
  if (timer) return;
  await syncCardVoice(client);
  timer = setInterval(()=>{
    syncCardVoice(client).catch(error=>logger.error('Identity voice tracking:',error));
  },INTERVAL);
  timer.unref?.();
}




