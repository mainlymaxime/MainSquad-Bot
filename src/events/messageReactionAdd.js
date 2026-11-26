import { Events } from 'discord.js';
import { recordCardReaction } from '../services/cardStatsService.js';
import { logger } from '../utils/logger.js';
export default {name:Events.MessageReactionAdd,async execute(reaction,user,client){
 try{if(reaction.partial)await reaction.fetch();if(reaction.message.partial)await reaction.message.fetch();if(user.partial)await user.fetch();await recordCardReaction(client || reaction.message.client,reaction,user);}
 catch(e){logger.error('Identity reaction tracking:',e);}
}};
