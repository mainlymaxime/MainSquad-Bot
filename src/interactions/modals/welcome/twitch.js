import {
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';

import {
  getFromDb,
  setInDb,
} from '../../../utils/database.js';

import { logger } from '../../../utils/logger.js';

const TWITCH_NOTIFY_CHANNEL_ID = '1261112174609432627';

export default {
  name: 'welcome_twitch_modal',

  async execute(interaction, client) {
    try {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      const username = interaction.fields
        .getTextInputValue('twitch_username')
        .trim();

      if (!username) {
        return await interaction.editReply({
          content: '❌ Vul een geldige Twitch gebruikersnaam in.',
        });
      }

      const guildId = interaction.guildId;
      const userId = interaction.user.id;

      const databaseKey =
        `twitch:connections:${guildId}`;

      const connections =
        await getFromDb(databaseKey, {});

      connections[userId] = {
        discordUsername: interaction.user.username,
        twitchUsername: username,
        connectedAt: Date.now(),
      };

      const saved = await setInDb(
        databaseKey,
        connections
      );

      if (saved === false) {
        throw new Error(
          'Twitch connection could not be saved.'
        );
      }

      const successEmbed = new EmbedBuilder()
        .setColor('#c27080')
        .setTitle('💜 Twitch gekoppeld!')
        .setDescription(
          `Je Twitch-account is succesvol gekoppeld!\n\n` +
          `**Discord:** ${interaction.user.username}\n` +
          `**Twitch:** ${username}`
        )
        .setFooter({
          text: 'MainSquad 🩷',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });

      // Communitymelding, hetzelfde als /twitch connect
      const channel = await interaction.guild.channels
        .fetch(TWITCH_NOTIFY_CHANNEL_ID)
        .catch(() => null);

      if (channel?.isTextBased()) {
        const communityEmbed = new EmbedBuilder()
          .setColor('#c27080')
          .setTitle('💗 Nieuwe Twitch koppeling!')
          .setDescription(
            `✨ **${interaction.user.username}** heeft zijn/haar Twitch gekoppeld!\n\n` +
            `📺 Twitch: **${username}**`
          )
          .setFooter({
            text: 'MainSquad 🩷',
          })
          .setTimestamp();

        await channel.send({
          embeds: [communityEmbed],
        }).catch((error) => {
          logger.warn(
            'Could not send Twitch connection notification:',
            error
          );
        });
      }

    } catch (error) {
      logger.error(
        'Error saving Twitch connection from welcome modal:',
        error
      );

      const message =
        'Je Twitch-account kon niet worden gekoppeld. Probeer het opnieuw.';

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `❌ ${message}`,
          embeds: [],
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: `❌ ${message}`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};
