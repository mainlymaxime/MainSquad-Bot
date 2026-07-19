import { logger, startupLog } from "../utils/logger.js";
import { getFromDb } from "../utils/database.js";

let accessToken = null;

// Houdt bij wie al een melding heeft gehad
const liveUsers = new Set();


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

    if (data.data && data.data.length > 0) {
        return data.data[0];
    }


    return null;
}




async function checkCommunityTwitch(client) {

    try {

        const guildId = client.guilds.cache.first()?.id;

        if (!guildId) return;


        const connections = await getFromDb(
            `twitch:connections:${guildId}`,
            {}
        );


        const channel = await client.channels.fetch(
            "1261112174609432627"
        );


        if (!channel) return;



        for (const userId in connections) {


            const twitchUser = connections[userId];


            if (!twitchUser?.twitchUsername) continue;


            const stream = await getStream(
                twitchUser.twitchUsername
            );


            if (stream) {


                if (liveUsers.has(twitchUser.twitchUsername)) {
                    continue;
                }


                liveUsers.add(twitchUser.twitchUsername);



                await channel.send({

                    content:
                        `🔴 <@${userId}> is nu LIVE op Twitch!`,

                    embeds: [

                        {
                            color: 0xc27080,


                            title:
                                `🔴 ${twitchUser.twitchUsername} is LIVE! 🩷`,


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
                                    `https://twitch.tv/${twitchUser.twitchUsername}`
                                }

                            ]
                        }

                    ]

                });


                startupLog(
                    `✅ Twitch melding gestuurd voor ${twitchUser.twitchUsername}`
                );

            } else {


                // reset zodat hij later opnieuw kan melden
                liveUsers.delete(
                    twitchUser.twitchUsername
                );

            }

        }


    } catch(error) {

        logger.error(
            "Community Twitch check fout:",
            error
        );

    }

}





export async function initTwitch(client) {


    startupLog(
        "Twitch module gestart..."
    );


    startupLog(
        "✅ Twitch checker actief"
    );


    checkCommunityTwitch(client);



    setInterval(() => {

        checkCommunityTwitch(client);

    }, 60000);

}
