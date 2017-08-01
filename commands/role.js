const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');

const listRoles = function(bot, message, input) {
  if (!message.member) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const settings = serverSettingsManager.getSettings(message.guild.id);

  if (!settings.autorole.enabled) {
    return message.reply('autorole is not enabled on this server.');
  }

  const autoroles = settings.autorole.roles;
  let roleList = [];

  _.forOwn(autoroles, (roleId, roleName) => {
    const guildRole = message.guild.roles.get(roleId);

    if (guildRole) {
      roleList.push('`' + roleName + '`: ' + guildRole.name);
    }
  });

  const roleDescription = '_Use ' + Utils.createCommandWithPrefix('role add [role name]', message.guild.id) +
    ' to grant yourself an autorole.\nUse ' + 
    Utils.createCommandWithPrefix('role remove [role name]', message.guild.id) + ' to remove an autorole._';

  const embed = Utils.createEmbed(message);

  embed.setAuthor('Autoroles', bot.user.avatarURL);
  embed.setDescription(roleDescription);
  embed.addField('Available Roles', roleList.join('\n'));
  embed.setThumbnail(message.guild.iconURL);

  message.channel.send('', { embed: embed });
};

const grantRole = function(bot, message, input) {
  if (!message.member) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const settings = serverSettingsManager.getSettings(message.guild.id);

  if (!settings.autorole.enabled) {
    return message.reply('autorole is not enabled on this server.');
  }

  const autoroles = settings.autorole.roles;

  if (autoroles[input.input]) {
    // Attempt to grant this role
    const role = message.guild.roles.get(autoroles[input.input]);

    message.member.addRole(role)
      .then(() => {
        return message.reply('you\'ve been granted the ' + role.name + ' role!');
      })
      .catch(err => {
        // TODO: This will likely be a permission error
        console.warn(err);
        return message.reply('I wasn\'t able to add that role, sorry!');
      });
  } else {
    return message.reply('I couldn\'t find that role, sorry!');
  }
};

const revokeRole = function(bot, message, input) {
  if (!message.member) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const settings = serverSettingsManager.getSettings(message.guild.id);

  if (!settings.autorole.enabled) {
    return message.reply('autorole is not enabled on this server.');
  }

  const autoroles = settings.autorole.roles;

  if (autoroles[input.input]) {
    // Attempt to revoke this role
    const role = message.guild.roles.get(autoroles[input.input]);

    message.member.removeRole(role)
      .then(() => {
        return message.reply('you no longer have the ' + role.name + ' role.');
      })
      .catch(err => {
        // TODO: This will likely be a permission error
        console.warn(err);
        return message.reply('I wasn\'t able to remove that role, sorry!');
      });
  } else {
    return message.reply('I couldn\'t find that role, sorry!');
  }
};

const info = {
  name: ['role', 'roles', 'autorole'],
  description: 'Gives a guild-specific autorole to a user.',
  operations: {
    _default: {
      handler: listRoles
    },
    list: {
      handler: listRoles,
      usage: {
        '': 'List available autoroles.'
      }
    },
    add: {
      handler: grantRole,
      usage: {
        '[role]': 'Gives the specified role.'
      }
    },
    remove: {
      handler: revokeRole,
      usage: {
        '[role]': 'Removes the specified role.'
      }
    }
  },
  type: CommandType.General
};

module.exports = {
  info: info
};
