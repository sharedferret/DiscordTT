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
        guildUpdatePrefix(message, input, update);
        break;
      case 'autorole':
        guildUpdateAutorole(bot, message, input, update);
        break;
      case 'defaultrole':
        guildUpdateDefaultRole(bot, message, input, update);
        break;
      case 'announcementchannel':
        guildUpdateAnnouncementChannel(bot, message, input, update);
        break;
      case 'joinmessage':
        guildUpdateJoinMessage(bot, message, input, update);
        break;
      case 'leavemessage':
        guildUpdateLeaveMessage(bot, message, input, update);
        break;
      default:
        return message.reply('please provide a valid setting to update.');
    }
  } else {
    return message.reply('you must be a guild administrator to use this command.');
  }
};

const guildUpdateAnnouncementChannel = function(bot, message, input, update) {
  const updates = {};

  switch (input.operation) {
    case 'add':
    case 'update':
      const updateChannel = message.guild.channels.filter(i => { return i.name === update || i.id === update; }).first();

      if (updateChannel) {
        updateChannel.send(updateChannel.name + ' registered for guild announcements.')
          .then(updateChannelMessage => {
            updates['announcements.announcementChannel'] = updateChannel.id;
            serverSettingsManager.updateSettings(message, message.guild.id, updates);
            message.reply('the guild\'s announcement channel has been updated.');
          })
          .catch(err => {
            return message.reply('I wasn\'t able to send a message to that channel. Please check the channel permissions.');
          });
      } else {
        return message.reply('I couldn\'t find that channel.');
      }
      break;
    case 'remove':
      updates['announcements.announcementChannel'] = undefined;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the guild\'s announcement channel has been cleared.');
      break;
    default:
      break;
  }
};

const guildUpdateJoinMessage = function(bot, message, input, update) {
  const updates = {};

  switch (input.operation) {
    case 'add':
    case 'update':
      updates['announcements.userJoin.message'] = update;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `joinmessage` setting has been updated.');
      break;
    case 'remove':
      updates['announcements.userJoin.message'] = undefined;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `joinmessage` setting has been removed.');
      break;
    case 'enable':
      updates['announcements.userJoin.enabled'] = true;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `joinmessage` feature has been enabled.');
      break;
    case 'disable':
      updates['announcements.userJoin.enabled'] = false;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `joinmessage` feature has been disabled.');
      break;
    default:
      break;
  }
};

const guildUpdateLeaveMessage = function(bot, message, input, update) {
  const updates = {};

  switch (input.operation) {
    case 'add':
    case 'update':
      updates['announcements.userLeave.message'] = update;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `leavemessage` setting has been updated.');
      break;
    case 'remove':
      updates['announcements.userLeave.message'] = undefined;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `leavemessage` setting has been removed.');
      break;
    case 'enable':
      updates['announcements.userLeave.enabled'] = true;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `leavemessage` feature has been enabled.');
      break;
    case 'disable':
      updates['announcements.userLeave.enabled'] = false;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the `leavemessage` feature has been disabled.');
      break;
    default:
      break;
  }
};

const guildUpdatePrefix = function(message, input, update) {
  const updates = {};

  if (input.flags && input.flags.useDefault) {
    if (input.input == 'true') updates['prefix.useDefault'] = true;
    if (input.input == 'false') updates['prefix.useDefault'] = false;
  }

  // Clear prefix if -clear is passed, otherwise update prefix if input exists
  if (input.flags && input.flags.clear !== undefined) {
    updates['prefix.custom'] = null;
  } else if (update) {
    updates['prefix.custom'] = update;
  }

  serverSettingsManager.updateSettings(message, message.guild.id, updates);
  return message.reply('the `prefix` setting has been updated.');
};

const guildUpdateAutorole = function(bot, message, input, update) {
  const updates = {};

  switch(input.operation) {
    case 'enable':
      updates['autorole.enabled'] = true;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('autorole has been enabled.');
      break;
    case 'disable':
      updates['autorole.enabled'] = false;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('autorole has been disabled.');
      break;
    case 'add':
    case 'update':
      const autoRoleName = update.substring(0, update.indexOf(' '));
      const guildRoleName = update.substring(update.indexOf(' ') + 1, update.length);
      const guildRole = message.guild.roles.filter(i => { return i.name === guildRoleName; }).first();

      // TODO: Attempt to grant this role to the bot (to ensure it has permissions to do so)

      if (autoRoleName && guildRoleName && guildRole) {
        updates['autorole.roles.' + autoRoleName] = guildRole.id;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the `' + autoRoleName + '` role has been added.');
      } else {
        message.reply('please provide a valid role and role name to add.');
      }

      break;
    case 'remove':
      const autoroles = serverSettingsManager.getSettings(message.guild.id).autorole.roles;

      if (autoroles[update]) {
        updates['autorole.roles.' + update] = undefined;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the `' + update + '` role has been removed.');
      } else {
        message.reply('please provide a valid autorole name.');
      }
      break;
    default:
      break;
  }
};

const guildUpdateDefaultRole = function(bot, message, input, update) {
  const updates = {};

  switch(input.operation) {
    case 'add':
    case 'update':
      const guildRole = message.guild.roles.filter(i => { return i.name === update; }).first();

      if (guildRole) {
        updates['autorole.defaultRole'] = guildRole.id;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the `' + guildRole.name + '` role has been set as default, and will be granted to all new users.');
      } else {
        message.reply('please provide a valid role.');
      }
      break;
    case 'remove':
      const currentDefaultRole = serverSettingsManager.getSettings(message.guild.id).autorole.defaultRole;

      if (currentDefaultRole) {
        updates['autorole.defaultRole'] = undefined;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the default role has been removed.');
      }
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
          settingText += '' + j + ': `' + JSON.stringify(setting[j]) + '`\n';
        }
        embed.addField(i, settingText);
      } else {
        if (setting !== undefined) {
          embed.addField(i, '`' + setting + '`'); 
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

// TODO: Fix the RichEmbed 1024 char limit issue with command help pages. Not sure how yet.
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
    add: {
      handler: updateGuildSettings,
      usage: {
        'autorole [autorole name] [role name]': 'Adds a new user-selectable autorole. Specify the autorole name (what users will type to gain the role) first, then the name of the role that should be granted.'
      }
    },
    remove: {
      handler: updateGuildSettings,
      usage: {
        'autorole [autorole name]': 'Removes a user-selectable autorole.'
      }
    },
    enable: {
      handler: updateGuildSettings,
      usage: {
        '[feature]': 'Enables the specified feature. (Supported: `autorole`)'
      }
    },
    disable: {
      handler: updateGuildSettings,
      usage: {
        '[feature]': 'Disables the specified feature. (Supported: `autorole`)'
      }
    },
    update: {
      handler: updateGuildSettings,
      usage: {
        'prefix [new prefix]': 'Sets a new guild-specific command prefix.',
        'defaultrole [new role]': 'Sets a default role that users will be assigned when joining the server.',
//        'joinmessage [message]': 'Sets the message that will be sent to the announcement channel when a user joins the server. Use ${username} to mention the user.',
//        'leavemessage [message]': 'Sets the message that will be sent to the announcement channel when a user leaves the server. Use ${username} to mention the user.',
//        'announcementchannel [channel name]': 'Sets the channel announcements will be sent to.'
      },
      flags: {
        useDefault: '[prefix] Use the default prefix (' + config.prefix + ') in addition to a custom prefix. true/false',
      }
    }
  }
};

module.exports = {
  info: info
};
