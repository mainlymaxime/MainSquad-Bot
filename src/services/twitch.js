import { logger, startupLog } from "../utils/logger.js";
import { getFromDb } from "../utils/database.js";

let accessToken = null;

let mainlyWasLive = false;
const communityWasLive = new Map();


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



async function getStream(username) {

  if (!accessToken) {
    accessToken = await getTwitchToken();
  }


  const response = await fetch(
    `https://api.twitch.tv/helix/streams?user_login=${username}`,
    {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );


  const data = await response.json();


  if (!data.data || data.data.length === 0) {
    return null;
  }


  return data.data[0];

}




// ================================
// MAINLYMAXIME CHECK
// ================================

async function checkMainly(channel) {

  const stream = await getStream(
    process.env.TWITCH_USERNAME
  );


  const live = !!stream;


  if (live && !mainlyWasLive) {

    mainlyWasLive = true;


    await channel.send({

      content: "🔴 @everyone",

      embeds: [
        {

          color: 0xc27080,

          title: "🔴 MainlyMaxime is LIVE! 🩷",

          description:
            "Hiya! ya gurl is nu Live 🩷\n\n" +
            "Kom je chillen en yappen? ✨\n\n" +
            "*Wist jij dat je door te kijken punten verzameld? " +
            "Deze zijn mega handig voor de opkomende give-aways!* 🎁",

          image: {
            url:
            "https://cdn.discordapp.com/attachments/1325895597458325536/1528283922264231946/is_currently_offline_1.png"
          },


          footer: {
            text:
            "MainSquad 🩷 • MainlyMaxime"
          },


          timestamp: new Date(),

        }
      ],


      components: [
        {
          type: 1,

          components: [
            {
              type: 2,
              style: 5,
              label: "🩷 Klik hier voor de stream",
              url: "https://twitch.tv/mainlymaxime"
            }
          ]
        }
      ]

    });


    startupLog("✅ MainlyMaxime live melding verstuurd");

  }


  if (!live) {
    mainlyWasLive = false;
  }

}





// ================================
// COMMUNITY CHECK
// ================================

async function checkCommunity(client) {


  const channel = await client.channels.fetch(
    "1261112174609432627"
  ).catch(() => null);


  if (!channel) return;



  const guilds = client.guilds.cache;



  for (const guild of guilds.values()) {


    const connections = await getFromDb(
      `twitch:connections:${guild.id}`,
      {}
    );



    for (const userId in connections) {


      const twitchUser =
        connections[userId].twitchUsername;



      const stream =
        await getStream(twitchUser);



      const live = !!stream;



      const oldState =
        communityWasLive.get(twitchUser);



      if (live && !oldState) {


        communityWasLive.set(
          twitchUser,
          true
        );



        await channel.send({

          embeds: [

            {

              color: 0xc27080,


              title:
              `🔴 ${twitchUser} is LIVE! 🩷`,


              description:

              `✨ Kom gezellig kijken!\n\n` +

              `🎮 **Titel:** ${stream.title}\n` +

              `🕹️ **Game:** ${stream.game_name || "Geen categorie"}`,



              image: {
                url: stream.thumbnail_url
                  .replace("{width}", "1280")
                  .replace("{height}", "720")
              },


              footer: {
                text:
                "MainSquad 🩷"
              },


              timestamp:
              new Date()

            }

          ],



          components: [

            {

              type: 1,

              components: [

                {

                  type: 2,

                  style: 5,

                  label:
                  "🩷 Klik hier voor de stream",

                  url:
                  `https://twitch.tv/${twitchUser}`

                }

              ]

            }

          ]

        });


      }



      if (!live) {

        communityWasLive.set(
          twitchUser,
          false
        );

      }


    }

  }


}





export async function initTwitch(client) {


  startupLog(
    "Twitch module gestart..."
  );


  const channelId =
    process.env.TWITCH_NOTIFY_CHANNEL_ID;



  const mainChannel =
    await client.channels.fetch(channelId)
    .catch(() => null);



  if (!mainChannel) {

    startupLog(
      "⚠️ Twitch kanaal niet gevonden"
    );

    return;

  }



  startupLog(
    "✅ Twitch checker actief"
  );



  checkMainly(mainChannel);

  checkCommunity(client);



  setInterval(() => {

    checkMainly(mainChannel);

    checkCommunity(client);

  }, 60000);


}
