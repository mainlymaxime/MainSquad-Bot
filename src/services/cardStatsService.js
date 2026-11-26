
import { logger } from '../utils/logger.js';

export const CARD_CHANNEL_ID = '1575335887343059166';
const INTERVAL = 30000;
const recent = new Map();
const sessions = new Map();
let schemaPromise;
let timer;
let queue = Promise.resolve();

async function poolFor(client) {
  const pool = client.db?.db?.pool;
  if (!pool) throw new Error('Identity requires PostgreSQL');
  if (!schemaPromise) {
    schemaPromise = pool.query(`CREATE TABLE IF NOT EXISTS mainsquad_identity_stats (
      guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
      messages BIGINT NOT NULL DEFAULT 0, voice_ms BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    ); CREATE TABLE IF NOT EXISTS mainsquad_identity_counts (
      guild_id TEXT NOT NULL, user_id TEXT NOT NULL, kind TEXT NOT NULL,
      value TEXT NOT NULL, amount BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id, kind, value)
    );`).catch(error => { schemaPromise = undefined; throw error; });
  }
  await schemaPromise;
  return pool;
}
function targetGuild(guild) {
  return guild?.channels.cache.has(CARD_CHANNEL_ID);
}
export async function recordCardMessage(client, message) {
  if (!targetGuild(message.guild) || message.author.bot || message.channelId === CARD_CHANNEL_ID) return;
  const guild = message.guild.id, user = message.author.id;
  const key = `${guild}:${user}`;
  const now = Date.now();
  const previous = recent.get(key);
  if (previous && now - previous.time < 3000) return;
  recent.set(key, {time: now});
  const content = message.content || '';
  const counts = new Map();
  const add = (kind, value) => {
    const k = JSON.stringify([kind, value]);
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  add('channel', message.channelId);
  const plain = content.replace(/<a?:[\w]+:(\d+)>/g, (match, id) => { add('emoji', `custom:${id}`); return ' '; });
  for (const {segment} of new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(plain)) {
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(segment)) add('emoji', segment);
  }
  const pool = await poolFor(client);
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    await conn.query(`INSERT INTO mainsquad_identity_stats(guild_id,user_id,messages) VALUES($1,$2,1)
      ON CONFLICT(guild_id,user_id) DO UPDATE SET messages=mainsquad_identity_stats.messages+1`, [guild,user]);
    for (const [k, amount] of counts) {
      const [kind,value] = JSON.parse(k);
      await conn.query(`INSERT INTO mainsquad_identity_counts(guild_id,user_id,kind,value,amount) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(guild_id,user_id,kind,value) DO UPDATE SET amount=mainsquad_identity_counts.amount+EXCLUDED.amount`, [guild,user,kind,value,amount]);
    }
    await conn.query('COMMIT');
  } catch(error) { await conn.query('ROLLBACK'); throw error; }
  finally { conn.release(); }
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
    for (const [key,v] of recent) if (Date.now()-v.time>60000) recent.delete(key);
    syncCardVoice(client).catch(error=>logger.error('Identity voice tracking:',error));
  },INTERVAL);
  timer.unref?.();
}




