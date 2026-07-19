import { SlashCommandBuilder } from 'discord.js';

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

        if (sub === 'connect') {

            const username = interaction.options.getString('username');

            await interaction.reply({
                content: `💗 Twitch account gekoppeld!\n\nJe account: **${username}**`,
                ephemeral: true
            });

        }

        if (sub === 'disconnect') {

            await interaction.reply({
                content: '💔 Twitch account ontkoppeld.',
                ephemeral: true
            });

        }

        if (sub === 'status') {

            await interaction.reply({
                content: '📺 Je Twitch koppeling komt hier straks.',
                ephemeral: true
            });

        }
    }
};
