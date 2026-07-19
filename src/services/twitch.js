import { logger, startupLog } from "../utils/logger.js";

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

  if (!data.access_token) {
    throw new Error("Geen Twitch access token ontvangen");
  }

  return data.access_token;
}

async function checkTwitch(channel) {
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

      const stream = data.data[0];

      const thumbnail = stream.thumbnail_url
        ? stream.thumbnail_url
            .replace("{width}", "1280")
            .replace("{height}", "720")
        : "https://cdn.discordapp.com/attachments/1325895597458325536/1528283922264231946/is_currently_offline_1.png?ex=6a5dbcd1&is=6a5c6b51&hm=d0eaf5300f2a6002689450aba1bc6d0c0d07acb05a2b640fe89129ffb7c152a3&";

      await channel.send({
        content: "🔴 @everyone MainlyMaxime is LIVE! 🩷",

        embeds: [
          {
            color: 0xc27080,

            title: "🔴 MainlyMaxime is LIVE!",
            url: "https://twitch.tv/mainlymaxime",

            description:
              "✨ **Kom gezellig kijken bij de MainSquad!**\n\n" +
              `📝 **${stream.title}**`,

            fields: [
              {
                name: "🎮 Game",
                value: stream.game_name || "Geen categorie",
                inline: true,
              },
              {
                name: "👀 Kijkers",
                value: `${stream.viewer_count}`,
                inline: true,
              },
            ],

            image: {
              url: thumbnail,
            },

            footer: {
              text: "MainlyMaxime • MainSquad 🩷",
            },

            timestamp: new Date(),
          },
        ],
      });

      startupLog("✅ Twitch live melding verstuurd!");
    }

    if (!live) {
      wasLive = false;
    }

  } catch (error) {
    logger.error("Twitch check fout:", error);
  }
}


export async function initTwitch(client) {
  startupLog("Twitch module gestart...");

  const channelId = process.env.TWITCH_NOTIFY_CHANNEL_ID;

  if (!channelId) {
    startupLog("⚠️ TWITCH_NOTIFY_CHANNEL_ID ontbreekt");
    return;
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    startupLog("⚠️ Twitch Discord kanaal niet gevonden");
    return;
  }

  startupLog("✅ Twitch checker actief");

  checkTwitch(channel);

  setInterval(() => {
    checkTwitch(channel);
  }, 60000);
}
