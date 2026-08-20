import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default {
  name: 'welcome_twitch',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('welcome_twitch_modal')
      .setTitle('💜 Koppel je Twitch');

    const usernameInput = new TextInputBuilder()
      .setCustomId('twitch_username')
      .setLabel('Wat is je Twitch gebruikersnaam?')
      .setPlaceholder('Bijvoorbeeld: mainlymaxime')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(25);

    const usernameRow = new ActionRowBuilder()
      .addComponents(usernameInput);

    modal.addComponents(usernameRow);

    await interaction.showModal(modal);
  },
};
