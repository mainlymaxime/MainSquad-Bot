import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default {
  name: 'welcome_birthday',

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('welcome_birthday_modal')
      .setTitle('🎂 Voeg je verjaardag toe');

    const dayInput = new TextInputBuilder()
      .setCustomId('birthday_day')
      .setLabel('Welke dag ben je jarig?')
      .setPlaceholder('Bijvoorbeeld: 22')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    const monthInput = new TextInputBuilder()
      .setCustomId('birthday_month')
      .setLabel('Welke maand ben je jarig?')
      .setPlaceholder('Bijvoorbeeld: 11')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(2);

    const dayRow = new ActionRowBuilder()
      .addComponents(dayInput);

    const monthRow = new ActionRowBuilder()
      .addComponents(monthInput);

    modal.addComponents(dayRow, monthRow);

    await interaction.showModal(modal);
  },
};
