import { EmbedBuilder, MessageFlags } from 'discord.js';
import { setBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'welcome_birthday_modal',

  async execute(interaction, client) {
    try {
      // Meteen bevestigen aan Discord dat we de modal verwerken.
      // Zo krijgt de gebruiker geen "Er ging iets fout".
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      const day = Number.parseInt(
        interaction.fields.getTextInputValue('birthday_day'),
        10
      );

      const month = Number.parseInt(
        interaction.fields.getTextInputValue('birthday_month'),
        10
      );

      if (
        !Number.isInteger(day) ||
        !Number.isInteger(month) ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12
      ) {
        return await interaction.editReply({
          content:
            '❌ Vul een geldige verjaardag in.\n' +
            'Bijvoorbeeld: **dag 19** en **maand 12**.',
        });
      }

      const result = await setBirthday(
        client,
        interaction.guildId,
        interaction.user.id,
        month,
        day
      );

      const embed = new EmbedBuilder()
        .setColor(0xC27080)
        .setTitle('🎂 Verjaardag toegevoegd!')
        .setDescription(
          `Yay! Je verjaardag staat nu ingesteld op **${result.data.day} ${result.data.monthName}**! 🎉\n\n` +
          'De MainSquad weet nu wanneer het tijd is voor taart. 🎂💗'
        );

      return await interaction.editReply({
        content: null,
        embeds: [embed],
      });

    } catch (error) {
      logger.error('Error saving birthday from welcome modal:', {
        error,
        guildId: interaction.guildId,
        userId: interaction.user?.id,
      });

      const message =
        error?.userMessage ||
        error?.message ||
        'Je verjaardag kon niet worden opgeslagen. Probeer het nog eens.';

      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply({
          content: `❌ ${message}`,
          embeds: [],
        }).catch(() => {});
      }

      return await interaction.reply({
        content: `❌ ${message}`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  },
};
