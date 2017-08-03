const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');

const checkUpdateRestrictions = function(bot, message, input) {
  if (!message.member) {
    message.reply('This command can only be used on a server, not via DM.');
    return false;
  }

  if (Utils.isGuildAdmin(message.member)) {
    return true;
  } else {
    message.reply('you must be a guild administrator to use this command.');
    return false;
  }
}

const guildUpdateAutorole = function(bot, message, input) {
  if (!checkUpdateRestrictions(bot, message, input)) return;
  const cmd = input.input.split(' ');
  const setting = cmd.shift();
  const update = cmd.join(' ');
  const updates = {};

  switch(setting) {
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

      // Make sure autoRoleName is a single word
      if (!autoRoleName.match(/^[A-Za-z0-9]+$/)) {
        return message.reply('please make sure your autorole name contains only letters and numbers.')
      }

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
    case 'default':
      const defaultRole = message.guild.roles.filter(i => { return i.name === update; }).first();

      if (defaultRole) {
        updates['autorole.defaultRole'] = defaultRole.id;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the `' + defaultRole.name + '` role has been set as default, and will be granted to all new users.');
      } else {
        message.reply('please provide a valid role.');
      }
      break;
    default:
      break;
  }
};

const guildUpdatePrefix = function(bot, message, input) {
  if (!checkUpdateRestrictions(bot, message, input)) return;
  const cmd = input.input.split(' ');
  const setting = cmd.shift();
  const update = cmd.join(' ');
  const updates = {};

  switch(setting) {
    case 'set':
      updates['prefix.custom'] = update;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the guild\'s custom prefix is now `' + update + '`.');
      break;
    case 'remove':
      updates['prefix.custom'] = undefined;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('the guild\'s custom prefix has been removed.');
      break;
    case 'default':
      if (update === 'enable') {
        updates['prefix.useDefault'] = true;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the bot\'s global prefix has been enabled for this server.');
      } else if (update === 'disable') {
        updates['prefix.useDefault'] = false;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('the bot\'s global prefix has been disabled for this server (if a custom prefix has been set).');
      }
      break;
    default:
      break;
  }
};

const guildUpdateAnnouncementChannel = function(bot, message, input) {
  if (!checkUpdateRestrictions(bot, message, input)) return;
  const cmd = input.input.split(' ');
  const setting = cmd.shift();
  const update = cmd.join(' ');
  const updates = {};

  switch (setting) {
    case 'add':
    case 'update':
      const updateChannel = message.guild.channels.filter(i => { return i.name === update || i.id == update; }).first();

      if (updateChannel) {
        updateChannel.send('<#' + updateChannel.id + '> registered for guild announcements.')
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

const guildUpdateJoinMessage = function(bot, message, input) {
  if (!checkUpdateRestrictions(bot, message, input)) return;
  const cmd = input.input.split(' ');
  const setting = cmd.shift();
  const update = cmd.join(' ');
  const updates = {};

  switch (setting) {
    case 'set':
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

const guildUpdateLeaveMessage = function(bot, message, input) {
  if (!checkUpdateRestrictions(bot, message, input)) return;
  const cmd = input.input.split(' ');
  const setting = cmd.shift();
  const update = cmd.join(' ');
  const updates = {};

  switch (setting) {
    case 'set':
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

const guildUpdateLogging = function(bot, message, input) {
  if (!checkUpdateRestrictions(bot, message, input)) return;
  const cmd = input.input.split(' ');
  const setting = cmd.shift();
  const update = cmd.join(' ');
  const updates = {};

  switch (setting) {
    case 'setchannel':
    case 'channel':
      const logChannel = message.guild.channels.filter(i => { return i.name === update || i.id == update; }).first();

      if (logChannel) {
        logChannel.send('<#' + logChannel.id + '> registered for logging.')
          .then(logChannelMessage => {
            updates['logs.logChannel'] = logChannel.id;
            serverSettingsManager.updateSettings(message, message.guild.id, updates);
            message.reply('the guild\'s logging channel has been updated.');
          })
          .catch(err => {
            return message.reply('I wasn\'t able to send a message to that channel. Please check the channel permissions.');
          });
      } else {
        return message.reply('I couldn\'t find that channel.');
      }
      break;
    case 'enable':
      updates['logs.enabled'] = true;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('logging has been enabled.');
      break;
    case 'disable':
      updates['logs.enabled'] = false;
      serverSettingsManager.updateSettings(message, message.guild.id, updates);
      message.reply('logging has been disabled.');
      break;
    case 'exclude':
      let excludeText = update;

      if (!excludeText && input.flags && input.flags.channel) excludeText = input.flags.channel;
      if (!excludeText && input.flags && input.flags.c) excludeText = input.flags.c;
      if (!excludeText && input.flags && input.flags.role) excludeText = input.flags.role;
      if (!excludeText && input.flags && input.flags.r) excludeText = input.flags.r;

      const role = message.guild.roles.filter(i => { return i.name == excludeText || i.id == excludeText; }).first();
      const channel = message.guild.channels.filter(i => { return i.name == excludeText || i.id == excludeText; }).first();

      if (input.flags && (input.flags.channel || input.flags.c)) {
        if (channel) {
          updates['logs.excludechannels.' + channel.id] = null;
          serverSettingsManager.updateSettings(message, message.guild.id, updates);
          message.reply('actions from the `' + channel.name + '` channel will not be logged.');
        } else {
          message.reply('that is not a valid channel name.');
        }
      } else if (input.flags && (input.flags.role || input.flags.r)) {
        if (role) {
          updates['logs.excluderoles.' + role.id] = null;
          serverSettingsManager.updateSettings(message, message.guild.id, updates);
          message.reply('actions from the `' + role.name + '` role will not be logged.');
        } else {
          message.reply('that is not a valid role name.');
        }
      } else if (role && channel) {
        return message.reply('your guild has a role and channel both named `' + excludeText + '`. Please specify whether you want to exclude a channel or role by using the `-channel` or `-role` flag.');
      } else if (role) {
        updates['logs.excluderoles.' + role.id] = null;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('actions from the `' + role.name + '` role will not be logged.');
      } else if (channel) {
        updates['logs.excludechannels.' + channel.id] = null;
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('actions from the `' + channel.name + '` channel will not be logged.');
      } else {
        message.reply('that is not a valid channel or role name.');
      }
      break;
    case 'include':
      let includeText = update;

      if (!includeText && input.flags && input.flags.channel) includeText = input.flags.channel;
      if (!includeText && input.flags && input.flags.c) includeText = input.flags.c;
      if (!includeText && input.flags && input.flags.role) includeText = input.flags.role;
      if (!includeText && input.flags && input.flags.r) includeText = input.flags.r;

      const roleToRemove = message.guild.roles.filter(i => { return i.name == includeText || i.id == includeText; }).first();
      const channelToRemove = message.guild.channels.filter(i => { return i.name == includeText || i.id == includeText; }).first();

      if (input.flags && (input.flags.channel || input.flags.c)) {
        if (channelToRemove) {
          updates['logs.excludechannels.' + channelToRemove.id] = undefined;
        } else {
          updates['logs.excludechannels.' + includeText] = undefined;
        }
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('`' + includeText + '` has been removed from the logging exclude list.');
      } else if (input.flags && (input.flags.role || input.flags.r)) {
        if (roleToRemove) {
          updates['logs.excluderoles.' + roleToRemove.id] = undefined;
        } else {
          updates['logs.excluderoles.' + includeText] = undefined;
        }
        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('`' + includeText + '` has been removed from the logging exclude list.');
      } else {
        // Remove both
        if (channelToRemove) {
          updates['logs.excludechannels.' + channelToRemove.id] = undefined;
        } else {
          updates['logs.excludechannels.' + includeText] = undefined;
        }

        if (roleToRemove) {
          updates['logs.excluderoles.' + roleToRemove.id] = undefined;
        } else {
          updates['logs.excluderoles.' + includeText] = undefined;
        }

        serverSettingsManager.updateSettings(message, message.guild.id, updates);
        message.reply('`' + includeText + '` has been removed from the logging exclude list.');
      }
      break;
    default:
      break;
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
        embed.addField(i, settingText, true);
      } else {
        if (setting !== undefined) {
          embed.addField(i, '`' + setting + '`', true); 
        } else {
          embed.addField(i, '_no value set_', true)
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
    autorole: {
      handler: guildUpdateAutorole,
      usage: {
        'add [autorole name] [role name]': 'Adds a new user-selectable autorole. Specify the autorole name (what users will type to gain the role) first, then the name of the role that should be granted.',
        'remove [autorole name]': 'Removes a user-selectable autorole.',
        'enable': 'Enables the autorole feature.',
        'disable': 'Disables the autorole feature.',
        'default [role name]': 'Sets a default role that users will be assigned when joining the server.'
      }
    },
    prefix: {
      handler: guildUpdatePrefix,
      usage: {
        'set [prefix]': 'Sets a new guild-specific command prefix.',
        'remove [prefix]': 'Removes the guild-specific command prefix.',
        'default enable': 'Enables the bot\'s global command prefix (`' + config.prefix + '`) in addition to the guild-specific prefix.',
        'default disable': 'Disables the bot\'s global command prefix (`' + config.prefix + '`) on this server (if a custom prefix has been set).',
      }
    },
    announcementchannel: {
      handler: guildUpdateAnnouncementChannel,
      usage: {
        '[channel name]': 'Set a channel to push guild announcements to (for example, user welcome messages).'
      }
    },
    joinmessage: {
      handler: guildUpdateJoinMessage,
      usage: {
        'set [message]': 'Sets the message that will be sent to the announcement channel when a user joins the server. Use ${username} to mention the user.',
        'enable': 'Enables user join messages for this guild.',
        'disable': 'Disables user join messages for this guild.'
      }
    },
    leavemessage: {
      handler: guildUpdateLeaveMessage,
      usage: {
        'set [message]': 'Sets the message that will be sent to the announcement channel when a user leaves the server. Use ${username} to mention the user.',
        'enable': 'Enables user leave messages for this guild.',
        'disable': 'Disables user leave messages for this guild.'
      }
    },
    logging: {
      handler: guildUpdateLogging,
      usage: {
        'setchannel [channel name]': 'Sets the logging channel.',
        'enable': 'Enables logging for this guild.',
        'disable': 'Disables logging for this guild.',
        'exclude [channel or role name]': 'Excludes actions from a specific channel or role from being logged.',
        'include [channel or role name]': 'Removes a channel/role from the logging exclusion list.'
      },
      flags: {
        channel: 'Specify a channel to be excluded from logging.',
        role: 'Specify a role to be excluded from logging.',
        c: null,
        r: null
      }
    }
  }
};

module.exports = {
  info: info
};
