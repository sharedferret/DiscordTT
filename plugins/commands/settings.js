const info = {
  name: ['settings'],
  description: 'View and update guild settings.',
  usage: config.discriminator + 'settings: View the settings for your guild.\n' +
    config.discriminator + 'settings update [setting] [new value]: Update a guild setting.',
  type: CommandType.Utility
};

const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const Discord = require('discord.js');

// Hidden uses
// settings view [guild id] - admin gated
// settings gupdate [guild id] [setting] [new value] - admin gated

const handleMessage = function(bot, message) {
  if (message.content.length > config.discriminator.length + 9) {
    const cmd = message.content.substring(config.discriminator.length, message.content.length).split(' ');

    switch(cmd[1]) {
      case 'update':
        break;
      case 'view':
        // Admin gated
        if (config.admins.indexOf(message.author.id) !== -1) {
          const targetGuild = cmd[2];
          displayGuildSettings(message, cmd[2]);
        }
        break;
      case 'gupdate':
        if (config.admins.indexOf(message.author.id) !== -1) {
          updateGuildSettingsAdmin(message, cmd[2], cmd[3], cmd[4]);
        }
        break;
      default: break;
    }
  } else {
    displayGuildSettings(message, message.guild.id);
  }
};

// TODO: Error handling, pls
const updateGuildSettingsAdmin = function(message, guildId, field, update) {
  if (!guildId || !field || !update) {
    return message.reply('that is not a valid update.');
  }

  const updates = {};
  updates[field] = update;

  serverSettingsManager.updateSettings(message, guildId, updates);

  message.reply('the `' + field + '` setting has been updated.');
}

const displayGuildSettings = function(message, guildId) {
  const settings = serverSettingsManager.getSettings(message.guild.id);

  if (settings) {
    const embed = new Discord.RichEmbed();

    embed.setAuthor('Server Settings', message.author.avatarURL);
    embed.setTimestamp(new Date());
    embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);

    embed.addField('Guild ID', guildId);

    for (const i of _.keys(settings)) {
      const setting = settings[i];
      console.log(typeof setting);
      if (typeof setting == 'object') {
        let settingText = '';
        for (const j of _.keys(setting)) {
          settingText += '' + j + ': _' + JSON.stringify(setting[j]) + '_\n';
        }
        embed.addField(i, settingText);
      } else {
        embed.addField(i, setting); 
      }
    }

    message.channel.send('', { embed: embed });
  } else {
    message.reply('that guild does not have any stored settings.');
  }
}

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'settings');
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
