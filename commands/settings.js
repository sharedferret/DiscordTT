const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');

const updateGuildSettings = function(bot, message, input) {
  return message.reply('this command has not yet been implemented.');
};

// TODO: Error handling, pls
const updateGuildSettingsAdmin = function(bot, message, input) {
  if (config.admins.indexOf(message.author.id) !== -1) {
    const cmd = input.input.split(' ');
    const guildId = cmd.shift();
    const field = cmd.shift();
    const update = cmd.join(' ');

    if (!guildId || !field || !update) {
      return message.reply('that is not a valid update.');
    }

    const updates = {};
    updates[field] = update;

    serverSettingsManager.updateSettings(message, guildId, updates);

    message.reply('the `' + field + '` setting has been updated.');
  }
};

const displayGuildSettings = function(bot, message, input) {
  let guildId;

  if (message.guild) {
    guildId = message.guild.id;
  }

  if (config.admins.indexOf(message.author.id) !== -1 && input.input) {
    guildId = input.input;
  }

  if (!guildId) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const settings = serverSettingsManager.getSettings(guildId);

  if (settings) {
    const embed = Utils.createEmbed(message);

    embed.setAuthor('Server Settings', message.guild.iconURL);
    embed.setThumbnail(message.guild.iconURL);

    const guild = bot.guilds.get(guildId);
    embed.addField('Guild', (guild ? guild.name : 'Unknown Guild') + ' (ID: `' + guildId + '`)');

    for (const i of _.keys(settings)) {
      const setting = settings[i];
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
};

const info = {
  name: ['settings'],
  description: 'View and update guild settings.',
  type: CommandType.Utility,
  hidden: false,
  operations: {
    _default: {
      handler: displayGuildSettings,
      usage: {
        '': 'View the settings for your guild.'
      }
    },
    view: {
      handler: displayGuildSettings
    },
    gupdate: {
      handler: updateGuildSettingsAdmin
    },
    update: {
      handler: updateGuildSettings,
      usage: {
        '[setting] [new value]': 'Update a guild setting.'
      }
    }
  }
};

module.exports = {
  info: info
};
