


// MainSquad Identity: deterministic activity-based abilities.
export function getCardAbility({ messages, voiceMs, emojiCount, distinctEmoji, channelCount, topChannelCount }) {
  const hours = voiceMs / 3600000;
  if (messages < 10 && hours < 1) return { title: 'The New Kid', description: 'Het MainSquad-avontuur is net begonnen.' };
  const choices = [
    { score: messages / 250, title: 'Certified Yapper', description: 'Maakt van ieder gesprek een compleet nieuw avontuur.' },
    { score: hours / 5, title: 'Voice Addict', description: 'De voicechat voelt inmiddels als een tweede thuis.' },
    { score: hours >= 25 ? hours / 4 : 0, title: 'Permanent Resident', description: 'Heeft bijna een eigen postcode in de voicechat.' },
    { score: emojiCount >= 15 ? emojiCount / 35 : 0, title: 'Emoji Enthusiast', description: 'Heeft voor iedere situatie een passende emote.' },
    { score: distinctEmoji >= 8 ? distinctEmoji / 8 : 0, title: 'Emote Collector', description: 'Verzamelt emotes alsof het zeldzame kaarten zijn.' },
    { score: channelCount >= 4 ? channelCount / 3 : 0, title: 'Social Butterfly', description: 'Fladdert gezellig van kanaal naar kanaal.' },
    { score: messages >= 30 && topChannelCount / messages >= .8 ? topChannelCount / 180 : 0, title: 'Loyal Yapper', description: 'Heeft een favoriete plek en blijft daar graag hangen.' },
  ];
  return choices.sort((a,b) => b.score-a.score)[0];
}




