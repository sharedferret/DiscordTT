const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');

const updateGuildSettings = function(bot, message, input) {
  if (!message.member) {
    return message.reply('This command can only be used on a server, not via DM.');
  };

  // Gated by Administrator discord permission
  if (message.member.hasPermission('ADMINISTRATOR')) {
    if (!input.input) {
      return message.reply('please provide a guild setting and new value to update.');
    }

    const cmd = input.input.split(' ');
    const setting = cmd.shift();
    const update = cmd.join(' ');

    switch(setting) {
      case 'prefix':
        const updates = {};

        if (input.flags && input.flags.useDefault) {
          if (input.input == 'true') updates['prefix.useDefault'] = true;
          if (input.input == 'false') updates['prefix.useDefault'] = false;
        }

        // Clear prefix if -clear is passed, otherwise update prefix if input exists
        if (input.flags && input.flags.clear) {
          updates['prefix.custom'] = null;
        } else if (update) {
          updates['prefix.custom'] = update;
        }

        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        return message.reply('the `prefix` setting has been updated.');
        break;
      default:
        return message.reply('please provide a valid setting to update.');
    }
  } else {
    return message.reply('you must be a guild administrator to use this command.');
  }
};

// TODO: Error handling, pls
const updateGuildSettingsAdmin = function(bot, message, input) {
  if (config.admins.indexOf(message.author.id) !== -1) {
    const cmd = input.input.split(' ');
    const guildId = cmd.shift();
    const field = cmd.shift();
    let update = cmd.join(' ');

    if (update == 'b!true') update = true;
    if (update == 'b!false') update = false;

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

  if (input.flags && input.flags.raw !== undefined && settings) {
    return message.reply('```JSON\n' + JSON.stringify(settings) + '\n```');
  }

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
        if (setting) {
          embed.addField(i, setting); 
        } else {
          embed.addField(i, '_no value set_')
        }
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
      },
      flags: {
        raw: null
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
        '[setting] [new value]': 'Update a guild setting.',
        'prefix [new prefix]': 'Sets a new guild-specific command prefix.'
      },
      flags: {
        useDefault: '[prefix] Use the default prefix (' + config.prefix + ') in addition to a custom prefix. true/false',
        clear: 'Clear the guild\'s custom value for this setting.'
      }
    }
  }
};

module.exports = {
  info: info
};
