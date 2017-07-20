const info = {
  name: ['server'],
  description: 'View information about this server.',
  usage: config.discriminator + 'settings: View information about your guild.',
  type: CommandType.Utility
};

const Discord = require('discord.js');
const moment = require('moment');

const handleMessage = function(bot, message) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const embed = new Discord.RichEmbed();

  const guild = message.guild;

  embed.setAuthor(guild.name, message.guild.iconURL);
  embed.setTimestamp(new Date());
  embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
  embed.setThumbnail(message.guild.iconURL);

  embed.addField('Created By', guild.owner.nickname ? guild.owner.nickname : guild.owner.user.username, true);
  embed.addField('Created', moment(guild.createdTimestamp).format('dddd, MMMM Do YYYY'), true);
  embed.addField('Members', guild.memberCount, true);

  let guildText = guild.region;
  switch(guild.region) {
    case 'eu-west':
      guildText = ':flag_eu: Western Europe';
      break;
    case 'brazil':
      guildText = ':flag_br: Brazil';
      break;
    case 'eu-central':
      guildText = ':flag_eu: Central Europe';
      break;
    case 'hongkong':
      guildText = ':flag_hk: Hong Kong';
      break;
    case 'russia':
      guildText = ':flag_ru: Russia';
      break;
    case 'singapore':
      guildText = ':flag_sg: Singapore';
      break;
    case 'sydney':
      guildText = ':flag_au: Sydney';
      break;
    case 'us-central':
      guildText = ':flag_us: US Central';
      break;
    case 'us-east':
      guildText = ':flag_us: US East';
      break;
    case 'us-west':
      guildText = ':flag_us: US West';
      break;
    case 'us-south':
      guildText = ':flag_us: US South';
      break;
    default:
      break;
  }

  embed.addField('Region', guildText, true);
  embed.addField('Channel ID', '`' + guild.id + '`', true);
  embed.addField('AFK Channel', guild.channels.get(guild.afkChannelID).name + ' (Timeout: ' + (guild.afkTimeout / 60) + ' minutes)', true);
  // embed.addField('Used Tohru Since', moment(guild.joinedTimestamp).format('dddd, MMMM Do YYYY'), true);

  let roleArray = [];
  for (const [id, role] of guild.roles) {
    if (role.name != '@everyone') {
      if (!roleArray[role.position]) {
        roleArray[role.position] = [];
      }
      roleArray[role.position].push(role.name + ' (' + role.members.keyArray().length + ')');
    }
  }

  const roles = _.compact(_.flatten(roleArray));

  embed.addField('Roles (' + roles.length + ')', roles.join(', '));

  let textChannelArray = [];
  let voiceChannelArray = [];

  for (const [id, channel] of guild.channels) {
    if (channel.type == 'voice') {
      if (!voiceChannelArray[channel.position]) {
        voiceChannelArray[channel.position] = [];
      }
      voiceChannelArray[channel.position].push(channel.name);
    } else {
      if (!textChannelArray[channel.position]) {
        textChannelArray[channel.position] = [];
      }
      textChannelArray[channel.position].push(channel.name);
    }
  }

  const textChannels = _.compact(_.flatten(textChannelArray));
  const voiceChannels = _.compact(_.flatten(voiceChannelArray));

  embed.addField('Text Channels (' + textChannels.length + ')', textChannels.join(', '));
  embed.addField('Voice Channels (' + voiceChannels.length + ')', voiceChannels.join(', '));

  const emojiArray = [];
  for (const [id, emoji] of guild.emojis) {
    emojiArray.push('<:' + emoji.name + ':' + id + '>');
  }

  embed.addField('Custom Emoji', emojiArray.join(' '));

  message.channel.send('', { embed: embed });
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
