import { EmbedBuilder, MessageFlags } from 'discord.js';
import { setBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'welcome_birthday_modal',

  async execute(interaction, client) {
    try {
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
        return await interaction.reply({
          content:
            '❌ Vul een geldige verjaardag in. Gebruik alleen cijfers.\n' +
            'Bijvoorbeeld: **dag 22** en **maand 11**.',
          flags: MessageFlags.Ephemeral,
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
          `Yay! Je verjaardag staat nu ingesteld op **${result.data.day} ${result.data.monthName}**. 🎉\n\n` +
          'De MainSquad weet nu wanneer het tijd is voor taart. 🎂💗'
        );

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });

    } catch (error) {
      logger.error('Error saving birthday from welcome modal:', error);

      const errorMessage =
        error?.userMessage ||
        error?.message ||
        'Dat lukte helaas niet. Probeer het opnieuw.';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: `❌ ${errorMessage}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: `❌ ${errorMessage}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};
