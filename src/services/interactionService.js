



import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { pgDb } from '../utils/postgresDatabase.js';
const actions = {
  "hug": {
    "emoji": "🧸",
    "role": "Certified Cuddler",
    "lines": [
      "{actor} geeft {target} een knuffel. Emotionele schade tijdelijk gerepareerd.",
      "{actor} heeft {target} geknuffeld. Gratis therapie!",
      "{actor} knuffelt {target} alsof de huur ervan afhangt.",
      "{actor} heeft {target} officieel geclaimd als knuffelbeer.",
      "{actor} geeft {target} een knuffel. Social battery +10%.",
      "{actor} knuffelt {target}. Even geen mentale aftakeling.",
      "{actor} heeft {target} gevangen in een liefdevolle houdgreep.",
      "{actor} geeft {target} een knuffel. Terugknuffelen is optioneel, maar gewaardeerd.",
      "{actor} heeft {target} voorzien van een dagelijkse dosis liefde.",
      "{actor} knuffelt {target}. Alles komt goed. Waarschijnlijk."
    ]
  },
  "spank": {
    "emoji": "🍑",
    "role": "Professional Spanker",
    "lines": [
      "{actor} heeft {target} spanked. De echo was hoorbaar in Maastricht.",
      "{actor} heeft {target} spanked. Emotional damage!",
      "{actor} heeft {target} spanked. De mods kijken even de andere kant op.",
      "{actor} heeft {target} spanked. Critical booty damage!",
      "{actor} heeft {target} spanked. Achievement unlocked: Booty Hunter.",
      "{actor} heeft {target} spanked. Dat stond niet in de algemene voorwaarden.",
      "{actor} heeft {target} spanked. De hele Discord was getuige.",
      "{actor} heeft {target} spanked. Geen restitutie mogelijk.",
      "{actor} heeft {target} spanked. 10/10 voor de geluidseffecten.",
      "{actor} heeft {target} spanked. Weer een normale dag in de MainSquad."
    ]
  },
  "hit": {
    "emoji": "🥊",
    "role": "Walking Red Flag",
    "lines": [
      "{actor} heeft {target} gemept. De vriendschap hangt aan een zijden draadje.",
      "{actor} mept {target}. Communicatie is ook niet voor iedereen.",
      "{actor} heeft {target} een tik gegeven. Critical hit!",
      "{actor} mept {target}. Een diplomatieke oplossing bleek niet mogelijk.",
      "{actor} heeft {target} gemept. De gezamenlijke hersencel is zoek.",
      "{actor} geeft {target} een virtuele mep. Skill issue.",
      "{actor} mept {target}. Vriendschap -5 XP.",
      "{actor} heeft {target} geraakt. De respawn begint over drie seconden.",
      "{actor} mept {target}. De groepsapp blijft voorlopig stil.",
      "{actor} heeft {target} gemept. Dit had ook een e-mail kunnen zijn."
    ]
  },
  "kiss": {
    "emoji": "💋",
    "role": "Serial Kisser",
    "lines": [
      "{actor} geeft {target} een kusje. GET A ROOM.",
      "{actor} heeft {target} gekust. De fanfiction schrijft zichzelf.",
      "{actor} geeft {target} een kusje. Romance isn’t dead.",
      "{actor} kust {target}. De MainSquad kijkt geïnteresseerd mee.",
      "{actor} geeft {target} een kusje. Nieuwe ship unlocked!",
      "{actor} heeft {target} gekust. De roddelpers is onderweg.",
      "{actor} geeft {target} een kusje. Iemand is aanhankelijk vandaag.",
      "{actor} kust {target}. Friendship premium unlocked.",
      "{actor} heeft {target} een kusje gegeven. Schattig. Misselijkmakend, maar schattig.",
      "{actor} kust {target}. De trouwlocatie is nog niet geboekt."
    ]
  },
  "lick": {
    "emoji": "👅",
    "role": "Certified Weirdo",
    "lines": [
      "{actor} heeft {target} gelikt. We luisteren en we oordelen niet.",
      "{actor} likt {target}. Waarom? Niemand weet het.",
      "{actor} heeft {target} gelikt. Smaakt naar slechte beslissingen.",
      "{actor} likt {target}. De beschaving gaat achteruit.",
      "{actor} heeft {target} gelikt. Eigendomsrecht niet gegarandeerd.",
      "{actor} likt {target}. Een normale begroeting was ook een optie.",
      "{actor} heeft {target} gelikt. Desinfectiemiddel staat klaar.",
      "{actor} likt {target}. De laatste hersencel heeft ontslag genomen.",
      "{actor} heeft {target} gelikt. Absoluut niemand heeft hierom gevraagd.",
      "{actor} likt {target}. Tijd om het internet uit te zetten."
    ]
  },
  "yeet": {
    "emoji": "🚀",
    "role": "Human Catapult",
    "lines": [
      "{actor} heeft {target} ge-yeet. Vlieg hoog, kameraad.",
      "{actor} lanceert {target} richting de maan. Enkele reis.",
      "{actor} heeft {target} weggegooid. Retourneren is niet mogelijk.",
      "{actor} lanceert {target}. NASA is geïnteresseerd.",
      "{actor} heeft {target} naar een andere dimensie gestuurd.",
      "{actor} yeet {target}. Gratis vakantie zonder terugvlucht.",
      "{actor} lanceert {target}. De zwaartekracht heeft verloren.",
      "{actor} heeft {target} verwijderd uit de directe omgeving.",
      "{actor} yeet {target}. Verwachte landing: ergens volgende week.",
      "{actor} lanceert {target}. Ryanair vraagt hiervoor normaal €49,95."
    ]
  },
  "highfive": {
    "emoji": "🙌",
    "role": "Professional Hypeperson",
    "lines": [
      "{actor} geeft {target} een high five. Samen één hersencel.",
      "{actor} en {target} geven elkaar een high five. Teamwork makes the dream work.",
      "{actor} geeft {target} een high five. Competentie tijdelijk vastgesteld.",
      "{actor} en {target} vieren iets. Niemand weet precies wat.",
      "{actor} geeft {target} een high five. Friendship +10 XP.",
      "{actor} en {target} hebben zojuist geschiedenis geschreven. Min of meer.",
      "{actor} geeft {target} een high five. Absolute legends.",
      "{actor} en {target} synchroniseren hun laatste hersencellen.",
      "{actor} geeft {target} een high five. Missie geslaagd!",
      "{actor} en {target} geven elkaar een high five. Main character energy."
    ]
  }
};
let schema, schemaPool;
async function poolFor() {
  const pool = pgDb.pool;
  if (!pool) throw new Error('PostgreSQL unavailable');
  if (schemaPool !== pool) { schemaPool = pool; schema = undefined; }
  if (!schema) schema = pool.query(`
    CREATE TABLE IF NOT EXISTS mainly_interaction_events (
      id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, actor TEXT NOT NULL,
      target TEXT NOT NULL, action TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS mainly_interaction_actor ON mainly_interaction_events(guild_id,actor,created_at);
    CREATE INDEX IF NOT EXISTS mainly_interaction_target ON mainly_interaction_events(guild_id,target);
    CREATE TABLE IF NOT EXISTS mainly_interaction_optout (guild_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(guild_id,user_id));
  `).catch(e => { schema = undefined; throw e; });
  await schema; return pool;
}
const privateReply = (i,content) => i.reply({content,flags:MessageFlags.Ephemeral});
async function award(member, roleName) {
  const role = member.guild.roles.cache.find(r => r.name === roleName || r.name.endsWith(' '+roleName));
  if (!role || member.roles.cache.has(role.id) || !role.editable || role.managed) return null;
  try { await member.roles.add(role); return role.name; } catch(e) { console.error('Interaction role:',e); return null; }
}
export function makeInteractionCommand(action) {
  return {data:new SlashCommandBuilder().setName(action).setDescription('Mainly Interactions: '+action)
    .addUserOption(o=>o.setName('username').setDescription('Kies een lid').setRequired(true)),
    async execute(i) {
      if (!i.inGuild()) return privateReply(i,'Gebruik dit in de server.');
      const target=i.options.getUser('username',true), actor=i.user;
      if(target.bot || target.id===actor.id) return privateReply(i,'Kies een ander lid, geen bot.');
      await i.deferReply();
      let db;
      try {
        const pool=await poolFor(); db=await pool.connect();
        await db.query('BEGIN');
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[i.guildId+':'+actor.id]);
        const blocked=await db.query('SELECT 1 FROM mainly_interaction_optout WHERE guild_id=$1 AND user_id IN ($2,$3)',[i.guildId,actor.id,target.id]);
        const recent=await db.query("SELECT 1 FROM mainly_interaction_events WHERE guild_id=$1 AND actor=$2 AND created_at > now()-interval '30 seconds' LIMIT 1",[i.guildId,actor.id]);
        if(blocked.rowCount || recent.rowCount){await db.query('ROLLBACK'); return await i.editReply({content:blocked.rowCount?'Deze interactie is niet beschikbaar door de privacy-instellingen.':'Even 30 seconden wachten! 🩷'});}
        const inserted=await db.query('INSERT INTO mainly_interaction_events(id,guild_id,actor,target,action) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',[i.id,i.guildId,actor.id,target.id,action]);
        const counts=await db.query('SELECT count(*) AS total,count(*) FILTER(WHERE action=$3) AS specific FROM mainly_interaction_events WHERE guild_id=$1 AND actor=$2',[i.guildId,actor.id,action]);
        await db.query('COMMIT'); db.release(); db=null;
        if(!inserted.rowCount) return i.editReply('Deze interactie is al verwerkt.');
        const cfg=actions[action], line=cfg.lines[Math.floor(Math.random()*cfg.lines.length)].replaceAll('{actor}',`<@${actor.id}>`).replaceAll('{target}',`<@${target.id}>`);
        const unlocked=[];
        try { const member=await i.guild.members.fetch(actor.id); if(Number(counts.rows[0].specific)>=50) unlocked.push(await award(member,cfg.role)); if(Number(counts.rows[0].total)>=500) unlocked.push(await award(member,'MainSquad Menace')); } catch(e){console.error('Interaction achievements:',e);}
        await i.editReply({content:cfg.emoji+' '+line+unlocked.filter(Boolean).map(r=>'\n🏆 Achievement unlocked: **'+r+'**!').join(''),allowedMentions:{parse:[],users:[actor.id,target.id]}});
      } catch(e){if(db){await db.query('ROLLBACK').catch(()=>{});db.release();} console.error('Mainly Interactions:',e);await i.editReply('🩷 Interactie kon niet worden verwerkt. Probeer later opnieuw.');}
    }};
}
export async function interactionStats(i) {
  if(!i.inGuild()) return privateReply(i,'Gebruik dit in de server.');
  await i.deferReply({flags:MessageFlags.Ephemeral});
  try {
    const pool=await poolFor();
    const result=await pool.query('SELECT action,count(*) FILTER(WHERE actor=$2) AS given,count(*) FILTER(WHERE target=$2) AS received FROM mainly_interaction_events WHERE guild_id=$1 AND (actor=$2 OR target=$2) GROUP BY action',[i.guildId,i.user.id]);
    const rows=new Map(result.rows.map(r=>[r.action,r]));
    await i.editReply('**Mainly Interactions — Given / Received**\n'+Object.entries(actions).map(([k,v])=>`${v.emoji} ${k}: **${rows.get(k)?.given||0} / ${rows.get(k)?.received||0}**`).join('\n'));
  }catch(e){console.error(e);await i.editReply('Statistieken tijdelijk niet beschikbaar.');}
}
export async function interactionPrivacy(i) {
  if(!i.inGuild()) return privateReply(i,'Gebruik dit in de server.');
  await i.deferReply({flags:MessageFlags.Ephemeral});
  try {const pool=await poolFor();const enabled=i.options.getBoolean('toestaan',true);if(enabled) await pool.query('DELETE FROM mainly_interaction_optout WHERE guild_id=$1 AND user_id=$2',[i.guildId,i.user.id]);else await pool.query('INSERT INTO mainly_interaction_optout VALUES($1,$2) ON CONFLICT DO NOTHING',[i.guildId,i.user.id]);await i.editReply(enabled?'Interacties staan aan.':'Interacties staan uit voor jou.');}catch(e){console.error(e);await i.editReply('Instelling kon niet worden opgeslagen.');}
}


ja pas maar aan 

