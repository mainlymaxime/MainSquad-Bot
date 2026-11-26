import { SlashCommandBuilder } from 'discord.js';
import { interactionPrivacy } from '../../services/interactionService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('interactionprivacy')
    .setDescription('Zet interacties voor jezelf aan of uit')
    .addBooleanOption(o => o
      .setName('toestaan')
      .setDescription('Interacties toestaan?')
      .setRequired(true)),
  execute: interactionPrivacy
};
