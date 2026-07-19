import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('twitch')
        .setDescription('Twitch koppeling'),

    async execute(interaction) {
        await interaction.reply({
            content: '💗 Twitch command werkt!',
            ephemeral: true
        });
    }
};
