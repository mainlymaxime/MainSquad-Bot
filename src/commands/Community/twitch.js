import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getFromDb, setInDb } from '../../utils/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('twitch')
        .setDescription('Twitch koppeling')

        .addSubcommand(sub =>
            sub
                .setName('connect')
                .setDescription('Koppel je Twitch account')
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription('Je Twitch gebruikersnaam')
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName('disconnect')
                .setDescription('Ontkoppel je Twitch account')
        )

        .addSubcommand(sub =>
            sub
                .setName('status')
                .setDescription('Bekijk je Twitch koppeling')
        ),


    async execute(interaction) {

        const sub = interaction.options.getSubcommand();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const databaseKey = `twitch:connections:${guildId}`;

        const notifyChannelId = "1261112174609432627";


        // ==========================
        // CONNECT
        // ==========================

        if (sub === 'connect') {

            const username = interaction.options.getString('username');


            const connections = await getFromDb(databaseKey, {});


            connections[userId] = {
                discordUsername: interaction.user.username,
                twitchUsername: username,
                connectedAt: Date.now()
            };


            await setInDb(databaseKey, connections);



            await interaction.reply({
                content:
                    `💗 Twitch account gekoppeld!\n\n` +
                    `Discord: **${interaction.user.username}**\n` +
                    `Twitch: **${username}**`,
                ephemeral: true
            });



            // community melding sturen

            const channel = await interaction.guild.channels.fetch(notifyChannelId)
                .catch(() => null);


            if (channel) {

                const embed = new EmbedBuilder()

                    .setColor("#c27080")

                    .setTitle("💗 Nieuwe Twitch koppeling!")

                    .setDescription(
                        `✨ **${interaction.user.username}** heeft zijn/haar Twitch gekoppeld!\n\n` +
                        `📺 Twitch: **${username}**`
                    )

                    .setFooter({
                        text: "MainSquad 🩷"
                    })

                    .setTimestamp();


                await channel.send({
                    embeds: [embed]
                });

            }


            return;
        }



        // ==========================
        // DISCONNECT
        // ==========================

        if (sub === 'disconnect') {


            const connections = await getFromDb(databaseKey, {});


            if (!connections[userId]) {

                await interaction.reply({
                    content: "❌ Je hebt geen Twitch account gekoppeld.",
                    ephemeral: true
                });

                return;
            }


            delete connections[userId];


            await setInDb(databaseKey, connections);


            await interaction.reply({
                content: "💔 Twitch account ontkoppeld.",
                ephemeral: true
            });


            return;

        }



        // ==========================
        // STATUS
        // ==========================

        if (sub === 'status') {


            const connections = await getFromDb(databaseKey, {});


            const account = connections[userId];


            if (!account) {

                await interaction.reply({
                    content:
                        "❌ Je hebt nog geen Twitch account gekoppeld.\n\n" +
                        "Gebruik `/twitch connect`",
                    ephemeral: true
                });

                return;

            }


            await interaction.reply({

                content:
                    `📺 Jouw Twitch koppeling:\n\n` +
                    `Twitch: **${account.twitchUsername}**\n` +
                    `Gekoppeld: <t:${Math.floor(account.connectedAt / 1000)}:R>`,

                ephemeral: true

            });

        }

    }
};
