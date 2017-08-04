const moment = require('moment');

const MESSAGE_CHARACTER_LIMIT = 1020;

const handleMessage = function(bot, message, input) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const embed = Utils.createEmbed(message);

  const guild = message.guild;

  embed.setAuthor(guild.name, message.guild.iconURL);
  embed.setTimestamp(new Date());
  embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
  embed.setThumbnail(message.guild.iconURL);

  embed.addField('Created By', guild.owner.nickname ? guild.owner.nickname : guild.owner.user.username, true);
  embed.addField('Created', moment(guild.createdTimestamp).format('dddd, MMMM Do YYYY'), true);
  embed.addField('Members', guild.memberCount, true);

  let guildText = guild.region;
  switch (guild.region) {
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

  if (guild.afkChannelID) {
  embed.addField('AFK Channel', guild.channels.get(guild.afkChannelID).name + ' (Timeout: ' + (guild.afkTimeout / 60) + ' minutes)', true);
  }
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

  if (roleArray.length > 0) {
    const roles = _.compact(_.flatten(roleArray));
    let roleText = roles.join(', ');

    if (roleText.length > MESSAGE_CHARACTER_LIMIT) {
      roleText = roleText.substring(0, MESSAGE_CHARACTER_LIMIT);
      roleText = roleText.substring(0, roleText.lastIndexOf(','));
      roleText += '...';
    }

    embed.addField('Roles (' + roles.length + ')', roleText);
  }

  let textChannelArray = [];
  let voiceChannelArray = [];

  for (const [id, channel] of guild.channels) {
    if (channel.type == 'voice') {
      if (!voiceChannelArray[channel.position]) {
        voiceChannelArray[channel.position] = [];
      }
      voiceChannelArray[channel.position].push(channel.name);
    } else {
      // TODO [#61]: only add text channel if the bot has Read Messages permissions for it
      // TODO: add Main Channel

      if (!textChannelArray[channel.position]) {
        textChannelArray[channel.position] = [];
      }
      textChannelArray[channel.position].push(channel.name);
    }
  }

  if (textChannelArray.length > 0) {
    const textChannels = _.compact(_.flatten(textChannelArray));
    let textChannelsText = textChannels.join(', ');

    if (textChannelsText.length > MESSAGE_CHARACTER_LIMIT) {
      textChannelsText = textChannelsText.substring(0, MESSAGE_CHARACTER_LIMIT);
      textChannelsText = textChannelsText.substring(0, textChannelsText.lastIndexOf(','));
      textChannelsText += '...';
    }
    embed.addField('Text Channels (' + textChannels.length + ')', textChannelsText);
  }

  if (voiceChannelArray.length > 0) {
    const voiceChannels = _.compact(_.flatten(voiceChannelArray));
    let voiceChannelsText = voiceChannels.join(', ');

    if (voiceChannelsText.length > MESSAGE_CHARACTER_LIMIT) {
      voiceChannelsText = voiceChannelsText.substring(0, MESSAGE_CHARACTER_LIMIT);
      voiceChannelsText = voiceChannelsText.substring(0, voiceChannelsText.lastIndexOf(','));
      voiceChannelsText += '...';
    }
    embed.addField('Voice Channels (' + voiceChannels.length + ')', voiceChannelsText);
  }

  const emojiArray = [];
  for (const [id, emoji] of guild.emojis) {
    emojiArray.push('<:' + emoji.name + ':' + id + '>');
  }

  if (emojiArray.length > 0) {
    let emojiText = emojiArray.join(', ');
    if (emojiText.length > MESSAGE_CHARACTER_LIMIT) {
      emojiText = emojiText.substring(0, MESSAGE_CHARACTER_LIMIT);
      emojiText = emojiText.substring(0, emojiText.lastIndexOf(' '));
      emojiText += '...';
    }
    embed.addField('Custom Emoji', emojiText);
  }
  
  message.channel.send('', { embed: embed });
};

const info = {
  name: ['server'],
  description: 'View information about this server.',
  type: CommandType.Utility,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'View information about your guild.'
      }
    }
  }
};

module.exports = {
  info: info
};
