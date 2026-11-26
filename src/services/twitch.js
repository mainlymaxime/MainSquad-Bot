


import { logger, startupLog } from "../utils/logger.js";
import { getFromDb } from "../utils/database.js";
import { pgDb } from "../utils/postgresDatabase.js";

let accessToken = null;
let initialized = false;
let running = false;
const COMMUNITY_CHANNEL_ID = "1261112174609432627";

async function getTwitchToken() {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, client_secret: process.env.TWITCH_CLIENT_SECRET, grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Twitch token HTTP ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Geen Twitch access token ontvangen");
  return data.access_token;
}

async function getStream(username) {
  if (!username) throw new Error("Twitch gebruikersnaam ontbreekt");
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!accessToken) accessToken = await getTwitchToken();
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(username)}`, {
      headers: { "Client-ID": process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 && attempt === 0) { accessToken = null; continue; }
    if (!response.ok) throw new Error(`Twitch streams HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.data)) throw new Error("Ongeldig Twitch antwoord");
    return data.data[0] || null;
  }
  throw new Error("Twitch authenticatie mislukt");
}

async function getPool() {
  const pool = pgDb.pool;
  if (!pool) throw new Error("Twitch meldingen vereisen PostgreSQL");
  await pool.query(`CREATE TABLE IF NOT EXISTS mainsquad_twitch_announcements (
    channel_id TEXT NOT NULL, stream_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, stream_id)
  )`);
  return pool;
}

// Recognize announcements made by the previous version during this stream.
async function alreadyInChannel(channel, stream, title, botId) {
  const start = Date.parse(stream.started_at);
  if (!Number.isFinite(start)) return false;
  let before;
  while (true) {
    const page = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!page.size) return false;
    for (const message of page.values()) {
      if (message.createdTimestamp >= start && message.author.id === botId && message.embeds.some(e => e.title?.toLowerCase() === title.toLowerCase())) return true;
    }
    const oldest = [...page.values()].reduce((a,b) => BigInt(a.id) < BigInt(b.id) ? a : b);
    if (oldest.createdTimestamp < start || page.size < 100) return false;
    before = oldest.id;
  }
}

async function announceOnce(client, pool, channel, stream, payload) {
  if (!stream.id) throw new Error("Twitch stream ID ontbreekt");
  const key = [channel.id, String(stream.id)];
  const claim = await pool.query(`INSERT INTO mainsquad_twitch_announcements (channel_id, stream_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING stream_id`, key);
  if (!claim.rowCount) return;
  try {
    if (await alreadyInChannel(channel, stream, payload.embeds[0].title, client.user.id)) return;
    await channel.send(payload);
  } catch (error) {
    await pool.query("DELETE FROM mainsquad_twitch_announcements WHERE channel_id=$1 AND stream_id=$2", key);
    throw error;
  }
  startupLog(`Twitch live melding verstuurd: ${stream.user_login || stream.id}`);
}

function button(username) {
  return [{ type: 1, components: [{ type: 2, style: 5, label: "🩷 Klik hier voor de stream", url: `https://twitch.tv/${username}` }] }];
}

async function checkMainly(client, pool, channel) {
  const stream = await getStream(process.env.TWITCH_USERNAME);
  if (!stream) return;
  await announceOnce(client, pool, channel, stream, {
    content: "🔴 @everyone",
    embeds: [{
      color: 0xc27080,
      title: "🔴 MainlyMaxime is LIVE! 🩷",
      description: "Hiya! ya gurl is nu Live 🩷\n\nKom je chillen en yappen? ✨\n\n*Wist jij dat je door te kijken punten verzameld? Deze zijn mega handig voor de opkomende give-aways!* 🎁",
      image: { url: "https://cdn.discordapp.com/attachments/1325895597458325536/1575539717368193126/Ya_gurl_is_live_1.png?ex=6b09a734&is=6b0855b4&hm=b02354375e43f5cdb899dbccf262739390f94e5439151c864b9b029623ffdb0f&" },
      footer: { text: "MainSquad 🩷 • MainlyMaxime" }, timestamp: new Date()
    }], components: button("mainlymaxime")
  });
}

async function checkCommunity(client, pool) {
  const channel = await client.channels.fetch(COMMUNITY_CHANNEL_ID);
  const seen = new Set();
  for (const guild of client.guilds.cache.values()) {
    const connections = await getFromDb(`twitch:connections:${guild.id}`, {});
    for (const connection of Object.values(connections || {})) {
      const twitchUser = connection?.twitchUsername?.trim();
      if (!twitchUser || seen.has(twitchUser.toLowerCase())) continue;
      seen.add(twitchUser.toLowerCase());
      try {
        const stream = await getStream(twitchUser);
        if (!stream) continue;
        await announceOnce(client, pool, channel, stream, {
          embeds: [{ color: 0xc27080, title: `🔴 ${twitchUser} is LIVE! 🩷`,
            description: `✨ Kom gezellig kijken!\n\n🎮 **Titel:** ${stream.title}\n🕹️ **Game:** ${stream.game_name || "Geen categorie"}`,
            image: { url: stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720") },
            footer: { text: "MainSquad 🩷" }, timestamp: new Date() }],
          components: button(twitchUser)
        });
      } catch (error) { logger.error(`Twitch community ${twitchUser}: ${error.message}`); }
    }
  }
}

export async function initTwitch(client) {
  if (initialized) return;
  initialized = true;
  startupLog("Twitch module gestart...");
  async function tick() {
    if (running) return;
    running = true;
    try {
      const pool = await getPool();
      try {
        const mainChannel = await client.channels.fetch(process.env.TWITCH_NOTIFY_CHANNEL_ID);
        if (mainChannel) await checkMainly(client, pool, mainChannel);
      } catch (error) { logger.error(`Twitch MainlyMaxime: ${error.message}`); }
      try { await checkCommunity(client, pool); }
      catch (error) { logger.error(`Twitch community: ${error.message}`); }
    } catch (error) { logger.error(`Twitch checker: ${error.message}`); }
    finally { running = false; }
  }
  startupLog("✅ Twitch checker actief (PostgreSQL anti-duplicate)");
  void tick();
  setInterval(tick, 60000);
}




