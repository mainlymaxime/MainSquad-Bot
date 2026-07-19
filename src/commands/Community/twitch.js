console.log("TWITCH COMMAND FILE GELADEN");

import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('testtwitch')
        .setDescription('Test Twitch command'),

    async execute(interaction) {
        await interaction.reply({
            content: '💗 Test werkt!',
            ephemeral: true
        });
    }
};
