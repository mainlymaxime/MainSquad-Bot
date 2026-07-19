import { logger, startupLog } from "../utils/logger.js";
import { getFromDb } from "../utils/database.js";

let accessToken = null;
let wasLive = false;

// Community live status
const communityLiveUsers = new Set();


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

  return data.data?.[0] || null;
}




// ===============================
// JOUW EIGEN MAINLYMAXIME MELDING
// ===============================

async function checkTwitch(channel) {

  try {

    const stream = await getStream(
      process.env.TWITCH_USERNAME
    );


    const live = !!stream;


    if (live && !wasLive) {

      wasLive = true;


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
              "https://cdn.discordapp.com/attachments/1325895597458325536/1528283922264231946/is_currently_offline_1.png?ex=6a5dbcd1&is=6a5c6b51&hm=d0eaf5300f2a6002689450aba1bc6d0c0d07acb05a2b640fe89129ffb7c152a3&",
            },


            footer: {
              text: "MainSquad 🩷 • MainlyMaxime",
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

                url: "https://twitch.tv/mainlymaxime",

              }

            ]

          }

        ]

      });


      startupLog("✅ MainlyMaxime live melding verstuurd!");

    }


    if (!live) {

      wasLive = false;

    }


  } catch(error) {

    logger.error(
      "MainlyMaxime Twitch check fout:",
      error
    );

  }

}





// ===============================
// COMMUNITY TWITCH MELDINGEN
// ===============================


async function checkCommunityTwitch(client) {

  try {


    const guild = client.guilds.cache.first();

    if (!guild) return;



    const connections = await getFromDb(
      `twitch:connections:${guild.id}`,
      {}
    );


    const channel = await client.channels.fetch(
      "1261112174609432627"
    );


    if (!channel) return;



    for (const userId in connections) {


      const username =
        connections[userId]?.twitchUsername;


      if (!username) continue;



      const stream = await getStream(username);



      if (stream) {


        if (communityLiveUsers.has(username)) {
          continue;
        }


        communityLiveUsers.add(username);



        await channel.send({

          content:
            `🔴 <@${userId}> is nu LIVE op Twitch!`,


          embeds: [

            {

              color: 0xc27080,


              title:
                `🔴 ${username} is LIVE! 🩷`,


              description:
                `Kom gezellig kijken en support je MainSquad member ✨\n\n` +
                `**${stream.title}**`,


              image: {

                url:
                  stream.thumbnail_url
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
                    `https://twitch.tv/${username}`

                }

              ]

            }

          ]

        });



        startupLog(
          `✅ Community Twitch melding verstuurd: ${username}`
        );


      } else {


        communityLiveUsers.delete(username);


      }

    }


  } catch(error) {


    logger.error(
      "Community Twitch check fout:",
      error
    );


  }

}






// ===============================
// START TWITCH MODULE
// ===============================


export async function initTwitch(client) {


  startupLog(
    "Twitch module gestart..."
  );


  const channelId =
    process.env.TWITCH_NOTIFY_CHANNEL_ID;



  if (!channelId) {

    startupLog(
      "⚠️ TWITCH_NOTIFY_CHANNEL_ID ontbreekt"
    );

    return;

  }



  const channel =
    await client.channels.fetch(channelId);



  if (!channel) {

    startupLog(
      "⚠️ Twitch Discord kanaal niet gevonden"
    );

    return;

  }



  startupLog(
    "✅ Twitch checker actief"
  );



  // eerste check

  checkTwitch(channel);

  checkCommunityTwitch(client);



  // elke minuut

  setInterval(() => {

    checkTwitch(channel);

    checkCommunityTwitch(client);


  }, 60000);


}
