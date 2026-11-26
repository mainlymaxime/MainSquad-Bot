






import { createInteractionCard } from './interactionCardService.js';
import { SlashCommandBuilder, MessageFlags, AttachmentBuilder } from 'discord.js';
import { pgDb } from '../utils/postgresDatabase.js';
const actions = {
  "hug": {
    "emoji": "🧸",
    "role": "1575589382361194768",
    "lines": [
      "{actor} knuffelt {target}. Gratis therapie!",
      "{actor} knuffelt {target}. Social battery +10%.",
      "{actor} knuffelt {target}. Knuffel van het jaar!",
      "{actor} knuffelt {target}. Alle stress verdwijnt spontaan.",
      "{actor} knuffelt {target}. Een dagelijkse dosis liefde.",
      "{actor} knuffelt {target}. Friendship +100 XP.",
      "{actor} knuffelt {target}. Instant comfort unlocked.",
      "{actor} knuffelt {target}. De wereld is weer een stukje mooier.",
      "{actor} knuffelt {target}. Officieel knuffelbeerwaardig.",
      "{actor} knuffelt {target}. Een dikke tien voor gezelligheid.",
      "{actor} knuffelt {target}. Personal space, hallo?!",
      "{actor} knuffelt {target}. HELP, zuurstof graag.",
      "{actor} knuffelt {target}. Dit duurt ongemakkelijk lang.",
      "{actor} knuffelt {target}. De knuffelabonnementen zijn op.",
      "{actor} knuffelt {target}. Er kraakt iets. Hopelijk geen rib.",
      "{actor} knuffelt {target}. De social battery is nu leeg.",
      "{actor} knuffelt {target}. Loslaten is ook een optie.",
      "{actor} knuffelt {target}. De ontsnappingsroute is geblokkeerd.",
      "{actor} knuffelt {target}. Iemand heeft de afstandsbediening nodig.",
      "{actor} knuffelt {target}. Dit had ook een emoji kunnen zijn."
    ]
  },
  "spank": {
    "emoji": "🍑",
    "role": "1575589591795236935",
    "lines": [
      "{actor} heeft {target} gespanked. 10/10 voor techniek!",
      "{actor} heeft {target} gespanked. Een applaus voor de uitvoering.",
      "{actor} heeft {target} gespanked. das n rooie hand oei oei.",
      "{actor} heeft {target} gespanked. Het soundboard heeft een nieuwe hit.",
      "{actor} heeft {target} gespanked. Een gouden medaille voor precisie.",
      "{actor} heeft {target} gespanked. Booty Hunter energy!",
      "{actor} heeft {target} gespanked. De jury geeft vijf sterren.",
      "{actor} heeft {target} gespanked. vet kinky",
      "{actor} heeft {target} gespanked. De timing was chef’s kiss.",
      "{actor} heeft {target} gespanked. De MainSquad applaudisseert.",
      "{actor} heeft {target} gespanked. De echo was hoorbaar in Maastricht.",
      "{actor} heeft {target} gespanked. Emotional damage!",
      "{actor} heeft {target} gespanked. De mods kijken even de andere kant op.",
      "{actor} heeft {target} gespanked. De advocaat is onderweg.",
      "{actor} heeft {target} gespanked. Dat stond niet in de algemene voorwaarden.",
      "{actor} heeft {target} gespanked. De administratie opent een dossier.",
      "{actor} heeft {target} gespanked. maar hand klapte om.. ritje naar de EHBO is een beter idee..",
      "{actor} heeft {target} gespanked, maar sloeg mis.. {target} ligt nu op de grond...",
      "{actor} heeft {target} gespanked. {target} pimpslapped {actor} terug.",
      "{actor} heeft {target} gespanked. Weer een normale dag in de MainSquad AHEM."
    ]
  },
  "hit": {
    "emoji": "🥊",
    "role": "1575590060324028496",
    "lines": [
      "{actor} mept {target}. Een virtueel tikje met liefde.",
      "{actor} mept {target}. Critical hit!",
      "{actor} mept {target}. wtf ouwe...",
      "{actor} mept {target}. zo recht op de smoel..",
      "{actor} mept {target}. Een tien voor de slapstick.",
      "{actor} mept {target} met een stoel.",
      "{actor} mept {target} met vuist tussen de pupsen",
      "{actor} mept {target} finaal de grond in... gezellig weer dit.",
      "{actor} mept {target} maar {target} bukt en {actor} valt voorover. haha sukkel.",
      "{actor} mept {target} met een knuppel.. wat in de gta gebeurt hier?",
      "{actor} mept {target}. Vriendschap -5 XP.",
      "{actor} mept {target}. {target} ligt K.O.",
      "{actor} mept {target}. wat gezellig weer dit..",
      "{actor} mept {target}. De respawn begint over drie seconden.",
      "{actor} mept {target} maar mist HAHA noob.",
      "{actor} mept {target}. De gezamenlijke hersencel is zoek.",
      "{actor} mept {target} zonder te kijken en valt zelf op smoel.",
      "{actor} mept {target}. De virtuele advocaat is onderweg.",
      "{actor} mept {target}. + streetcred. ",
      "{actor} mept {target} maar mist.. Skill issue."
    ]
  },
  "kiss": {
    "emoji": "💋",
    "role": "1575590181874962474",
    "lines": [
      "{actor} zoent {target}. Nieuwe ship unlocked!",
      "{actor} zoent {target}. De vlinders maken overuren.",
      "{actor} zoent {target}. Romance is alive!",
      "{actor} zoent {target}. Een tien voor romantiek.",
      "{actor} zoent {target}. De fanfiction schrijft zichzelf.",
      "{actor} zoent {target}. get a room...",
      "{actor} zoent {target}. NAWWW.",
      "{actor} zoent {target}. Friendship premium unlocked.",
      "{actor} zoent {target}. De rozen zijn onderweg.",
      "{actor} zoent {target}. *pornhub intro speelt af* ",
      "{actor} zoent {target}. IEUWWW, wie eet er nu knoflook voor een zoen?.",
      "{actor} zoent {target}. ja uhm.. volgende keer je mond dicht doen aub",
      "{actor} zoent {target}. GET A ROOM.",
      "{actor} zoent {target} maar {target} barft binnensmonds.",
      "{actor} zoent {target}. Dit stond niet op de bingo kaart.",
      "{actor} zoent {target}. De chat heeft collectief barfneigingen",
      "{actor} zoent {target}. ja heel leuk, we doen ff alsof we het niet hebben gezien.. brr.",
      "{actor} zoent {target} maar het was een droom.. de realisatie kwam toen {actor} wakker werd al zoenend tegen spiele.. weird.",
      "{actor} zoent {target}. Dat was een natte bedoening."
    ]
  },
  "lick": {
    "emoji": "👅",
    "role": "1575590756716912651",
    "lines": [
      "{actor} likt {target}. Smaakt naar vriendschap.",
      "{actor} likt {target}. Een gouden ster voor originaliteit.",
      "{actor} likt {target}. Een bijzonder compliment blijkbaar.",
      "{actor} likt {target}. Smaakt naar aardbeienijs.",
      "{actor} likt {target}. De smaaktest is geslaagd.",
      "{actor} likt {target}. Vijf sterren op de smaakkaart.",
      "{actor} likt {target}. Een likje geluk.",
      "{actor} likt {target}. De smaakpapillen vieren feest.",
      "{actor} likt {target}. Smaakt naar overwinning.",
      "{actor} likt {target}. De chat doet een barfje.",
      "{actor} likt {target}. IEUW, waarom?!",
      "{actor} likt {target}. Smaakt naar slechte beslissingen.",
      "{actor} likt {target}. Een normale begroeting was ook een optie.",
      "{actor} likt {target}. De beschaving gaat achteruit.",
      "{actor} likt {target}. De laatste hersencel heeft ontslag genomen.",
      "{actor} likt {target}. De hygiënepolitie is onderweg.",
      "{actor} likt {target}. Dit had niemand op zijn bingokaart.",
      "{actor} likt {target}. De zeep staat klaar.",
      "{actor} likt {target}. Tijd om het internet uit te zetten."
    ]
  },
  "yeet": {
    "emoji": "🚀",
    "role": "1575590308971024586",
    "lines": [
      "{actor} yeet {target}. Goede vlucht, bestie!",
      "{actor} yeet {target}. NASA is onder de indruk.",
      "{actor} yeet {target}. Gratis vakantie unlocked!",
      "{actor} yeet {target}. Een tien voor de lancering.",
      "{actor} yeet {target}. Vlieg hoog, kameraad!",
      "{actor} yeet {target}. De zwaartekracht heeft verloren.",
      "{actor} yeet {target}. Een nieuw wereldrecord!",
      "{actor} yeet {target}. Businessclass naar de maan.",
      "{actor} yeet {target}. De sterren liggen binnen handbereik.",
      "{actor} yeet {target}. Perfecte landing, vijf sterren.",
      "{actor} yeet {target}. Ryanair biedt excuses aan.",
      "{actor} yeet {target}. Retourneren is niet mogelijk.",
      "{actor} yeet {target}. Verwachte landing: volgende week.",
      "{actor} yeet {target}. De bagage is zoek.",
      "{actor} yeet {target}. De vlucht heeft geen terugticket.",
      "{actor} yeet {target}. Houston, we have a problem.",
      "{actor} yeet {target}. De landing was minder elegant.",
      "{actor} yeet {target}. De navigatie is uitgevallen.",
      "{actor} yeet {target}. De verzekering dekt dit niet.",
      "{actor} yeet {target}. De bestemming is onbekend."
    ]
  },
  "highfive": {
    "emoji": "🙌",
    "role": "1575590407662997504",
    "lines": [
      "{actor} highfivet {target}. Absolute legends!",
      "{actor} highfivet {target}. Teamwork makes the dream work.",
      "{actor} highfivet {target}. Friendship +10 XP.",
      "{actor} highfivet {target}. Missie geslaagd!",
      "{actor} highfivet {target}. Main character energy.",
      "{actor} highfivet {target}. Perfecte synchronisatie.",
      "{actor} highfivet {target}. Een tien voor teamwork.",
      "{actor} highfivet {target}. De overwinning is binnen.",
      "{actor} highfivet {target}. De hele squad applaudisseert.",
      "{actor} highfivet {target}. Dat verdient een tweede high five.",
      "{actor} highfivet {target}. Oeps, mis.",
      "{actor} highfivet {target}. De lucht heeft gewonnen.",
      "{actor} highfivet {target}. Au, iets te enthousiast.",
      "{actor} highfivet {target}. De timing was dramatisch.",
      "{actor} highfivet {target}. De hand bleef ongemakkelijk hangen.",
      "{actor} highfivet {target}. De gezamenlijke hersencel was afwezig.",
      "{actor} highfivet {target}. Dit wordt uit de montage geknipt.",
      "{actor} highfivet {target}. De jury geeft een magere twee.",
      "{actor} highfivet {target}. Een high five met vertraging.",
      "{actor} highfivet {target}. De pols vraagt om vakantie."
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
async function award(member, roleId) {
  const role = await member.guild.roles.fetch(roleId).catch(() => null);
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
        try { const member=await i.guild.members.fetch(actor.id); if(Number(counts.rows[0].specific)>=50) unlocked.push(await award(member,cfg.role)); if(Number(counts.rows[0].total)>=500) unlocked.push(await award(member,'1575590529482105064')); } catch(e){console.error('Interaction achievements:',e);}
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
    const member=await i.guild.members.fetch(i.user.id);
    const image=await createInteractionCard(member,rows);
    await i.editReply({files:[new AttachmentBuilder(image,{name:'mainly-interactions.png'})],allowedMentions:{parse:[]}});
  }catch(e){console.error(e);await i.editReply('Statistieken tijdelijk niet beschikbaar.');}
}
export async function interactionPrivacy(i) {
  if(!i.inGuild()) return privateReply(i,'Gebruik dit in de server.');
  await i.deferReply({flags:MessageFlags.Ephemeral});
  try {const pool=await poolFor();const enabled=i.options.getBoolean('toestaan',true);if(enabled) await pool.query('DELETE FROM mainly_interaction_optout WHERE guild_id=$1 AND user_id=$2',[i.guildId,i.user.id]);else await pool.query('INSERT INTO mainly_interaction_optout VALUES($1,$2) ON CONFLICT DO NOTHING',[i.guildId,i.user.id]);await i.editReply(enabled?'Interacties staan aan.':'Interacties staan uit voor jou.');}catch(e){console.error(e);await i.editReply('Instelling kon niet worden opgeslagen.');}
}




