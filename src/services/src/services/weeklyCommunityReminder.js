import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { logger } from '../utils/logger.js';

const REMINDER_CHANNEL_ID = '1225514970108923940';
const TIME_ZONE = 'Europe/Brussels';

let reminderTimer = null;

export function startWeeklyCommunityReminder(client) {
  if (reminderTimer) {
    return;
  }

  logger.info('Weekly MainSquad reminder scheduler started');

  // Iedere minuut controleren.
  // De database-key voorkomt dat hij op donderdag 09:00 meerdere keren post.
  reminderTimer = setInterval(async () => {
    try {
      await checkWeeklyReminder(client);
    } catch (error) {
      logger.error('Weekly community reminder failed:', error);
    }
  }, 60_000);

  if (typeof reminderTimer.unref === 'function') {
    reminderTimer.unref();
  }

  // Ook direct één keer controleren bij opstarten
  checkWeeklyReminder(client).catch((error) => {
    logger.error('Initial weekly reminder check failed:', error);
  });
}

async function checkWeeklyReminder(client) {
  const now = getBrusselsDateParts();

  // Donderdag = 4
  if (now.weekday !== 4) {
    return;
  }

  // Alleen tijdens 09:00
  if (now.hour !== 9) {
    return;
  }

  const dateKey =
    `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;

  const databaseKey =
    `weeklyCommunityReminder:${dateKey}`;

  const alreadySent =
    await client.db.get(databaseKey);

  if (alreadySent) {
    return;
  }

  const channel =
    await client.channels
      .fetch(REMINDER_CHANNEL_ID)
      .catch(() => null);

  if (!channel?.isTextBased()) {
    logger.warn(
      `Weekly reminder channel ${REMINDER_CHANNEL_ID} not found`
    );
    return;
  }

  const birthdayButton =
    new ButtonBuilder()
      .setCustomId('welcome_birthday')
      .setLabel('Verjaardag toevoegen')
      .setEmoji('🎂')
      .setStyle(ButtonStyle.Primary);

  const twitchButton =
    new ButtonBuilder()
      .setCustomId('welcome_twitch')
      .setLabel('Twitch koppelen')
      .setEmoji('💜')
      .setStyle(ButtonStyle.Primary);

  const buttons =
    new ActionRowBuilder()
      .addComponents(
        birthdayButton,
        twitchButton
      );

  await channel.send({
    content:
      '@everyone 💗 **Kleine MainSquad reminder!**\n\n' +
      '🎥 Stream je zelf? Vergeet dan niet je **Twitch te koppelen**! ' +
      'We zijn superbenieuwd naar jullie streams en vinden het leuk om te ontdekken wat jullie zelf spelen & maken. 👀💜\n\n' +
      '🎂 En voeg meteen even je **verjaardag** toe, zodat we je natuurlijk niet zomaar laten wegkomen zonder een felicitatie. 😂💗\n\n' +
      'Je regelt het heel makkelijk via de knopjes hieronder. ✨',
    components: [buttons],
    allowedMentions: {
      parse: ['everyone'],
    },
  });

  await client.db.set(databaseKey, {
    sentAt: Date.now(),
    channelId: REMINDER_CHANNEL_ID,
  });

  logger.info(
    `Weekly MainSquad reminder sent in ${REMINDER_CHANNEL_ID}`
  );
}

function getBrusselsDateParts() {
  const formatter =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
    });

  const parts = formatter.formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: weekdayMap[values.weekday],
  };
}
