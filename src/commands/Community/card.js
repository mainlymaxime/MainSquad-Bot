





import { SlashCommandBuilder, AttachmentBuilder, MessageFlags } from 'discord.js';
import { createIdentityCard } from '../../services/cardService.js';

const CHANNEL_ID = '1575335887343059166';

export default {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Bekijk een MainSquad Identity Card')
    .addUserOption(option => option.setName('lid').setDescription('Bekijk de kaart van een ander lid').setRequired(false)),
  async execute(interaction, guildConfig, client) {
    if (!interaction.inGuild() || interaction.channelId !== CHANNEL_ID) {
      return interaction.reply({ content: `🩷 Gebruik /card in <#${CHANNEL_ID}>.`, flags: MessageFlags.Ephemeral });
    }
    const user = interaction.options.getUser('lid') || interaction.user;
    if (user.bot) return interaction.reply({ content: 'Bots hebben geen Identity Card.', flags: MessageFlags.Ephemeral });
    await interaction.deferReply();
    try {
      const member = await interaction.guild.members.fetch(user.id);
      const image = await createIdentityCard(client || interaction.client, member);
      await interaction.editReply({ files: [new AttachmentBuilder(image, { name: `identity-${member.id}.png` })], allowedMentions: { parse: [] } });
    } catch (error) {
      console.error('MainSquad Identity /card:', error);
      await interaction.editReply({ content: '🩷 Deze kaart kon niet worden gemaakt. Probeer het later opnieuw.' });
    }
  }
};




