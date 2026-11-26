


import { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags, AttachmentBuilder } from 'discord.js';
import { createTegeltje } from '../../services/tegeltjeService.js';

const CHANNEL_ID = '1575324227303772221';
const OWNER_ID = '1225514969270059064';
const STAFF_ROLES = ['1226517937687629854', '1225514969270059063'];

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Maak een tegeltje')
    .setType(ApplicationCommandType.Message)
    .setDMPermission(false),

  async execute(interaction) {
    const roles = interaction.member?.roles;
    const allowed = interaction.user.id === OWNER_ID || STAFF_ROLES.some(id =>
      Array.isArray(roles) ? roles.includes(id) : roles?.cache?.has(id)
    );

    if (!interaction.inGuild() || !allowed) {
      return interaction.reply({ content: '🌸 Alleen MainSquad staff kan tegeltjes maken.', flags: MessageFlags.Ephemeral });
    }

    const message = interaction.targetMessage;
    if (!message?.content?.trim()) {
      return interaction.reply({ content: 'Dit bericht bevat geen tekst voor een tegeltje.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const channel = await interaction.guild.channels.fetch(CHANNEL_ID);
      if (!channel?.isTextBased() || typeof channel.send !== 'function') {
        throw new Error('Tegeltjeskanaal niet beschikbaar');
      }
      const authorMember = message.member ?? await interaction.guild.members.fetch(message.author.id).catch(() => null);
      const image = await createTegeltje({
        quote: message.cleanContent || message.content,
        username: authorMember?.displayName || message.author.globalName || message.author.username,
        avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 256 })
      });
      await channel.send({
        files: [new AttachmentBuilder(image, { name: `tegeltje-${message.id}.png` })],
        allowedMentions: { parse: [] }
      });
      await interaction.editReply({ content: `🩷 Tegeltje geplaatst in <#${CHANNEL_ID}>!` });
    } catch (error) {
      console.error('MainSquad tegeltje:', error);
      await interaction.editReply({ content: 'Het tegeltje kon niet worden gemaakt. Controleer de Railway logs.' });
    }
  }
};




