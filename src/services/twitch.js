import { logger } from "../utils/logger.js";

let accessToken = null;
let wasLive = false;

async function getTwitchToken() {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    }
  );

  const data = await response.json();
  return data.access_token;
}

async function checkTwitch(channel, client) {
  try {
    if (!accessToken) {
      accessToken = await getTwitchToken();
    }

    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${process.env.TWITCH_USERNAME}`,
      {
        headers: {
          "Client-ID": process.env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    const live = data.data && data.data.length > 0;

    if (live && !wasLive) {
      wasLive = true;

      await channel.send({
        content: "🔴 **MainlyMaxime is LIVE!**\nhttps://twitch.tv/mainlymaxime",
      });

      logger.info("Twitch live melding verstuurd!");
    }

    if (!live) {
      wasLive = false;
    }

  } catch (error) {
    logger.error("Twitch check fout:", error);
  }
}

export async function initTwitch(client) {
  const channelId = process.env.TWITCH_NOTIFY_CHANNEL_ID;

  if (!channelId) {
    logger.warn("TWITCH_NOTIFY_CHANNEL_ID ontbreekt");
    return;
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    logger.warn("Discord kanaal voor Twitch meldingen niet gevonden");
    return;
  }

  logger.info("Twitch checker gestart");

  checkTwitch(channel, client);

  setInterval(() => {
    checkTwitch(channel, client);
  }, 60000);
}
