import { SlashCommandBuilder } from 'discord.js';
import { interactionStats } from '../../services/interactionService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('interactionstats')
    .setDescription('Bekijk jouw interactiestatistieken'),
  execute: interactionStats
};
