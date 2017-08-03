const messageHandler = require(global.paths.lib + 'message-handler');

const handleMessage = function(bot, message, input) {
  if (input.input) {
    displayCommandPage(bot, message, input.input);
  } else {
    displayAllCommands(bot, message);
  }
};

const displayAllCommands = function(bot, message) {
  const embed = Utils.createEmbed(message);

  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setTitle('Supported Commands');
  embed.setDescription('Here\'s a list of all the commands I support. For more info, type ' +
    Utils.createCommandWithPrefix('help [command name]', message.guild ? message.guild.id : null) + '.');
  
  const sortedCommands = _.groupBy(messageHandler.commands, function(i) { return i.info.type; });

  for (let commandType in sortedCommands) {
    embed.addField(commandType,
      sortedCommands[commandType]
      .filter(function(i) { return i.hidden !== true; })
      .map(function(i) {
        if (i.info.displayNames) {
          return i.info.displayNames.map(function(i) {
            return Utils.createCommandWithPrefix(i, message.guild ? message.guild.id : null);
          }).join(', ');
        }

        return Utils.createCommandWithPrefix(i.info.name[0], message.guild ? message.guild.id : null);
      })
      .join(', '));
  }

  embed.setThumbnail(bot.user.avatarURL);

  message.channel.send('', { embed: embed });
}

const displayCommandPage = function(bot, message, commandName) {
  const prefix = Utils.getPrefix(message.guild ? message.guild.id : null);

  if (!commandName.startsWith(prefix)) {
    commandName = prefix + commandName;
  }

  const requestedCommand = messageHandler.fetchCommand(commandName, message.guild ? message.guild.id : null);

  if (requestedCommand) {
    const command = requestedCommand.command;

    const embed = Utils.createEmbed(message);
    embed.setAuthor(bot.user.username, bot.user.avatarURL);
    embed.setTitle(command.info.name[0]);
    embed.setDescription('_' + (command.info.description ? command.info.description : 'No description available.') + '_');
    
    // Usage, flags
    let usage = [];
    let flags = [];
    
    _.forOwn(command.info.operations, function(operation, operationName) {
      _.forOwn(operation.usage, function(usageEntryDescription, usageEntryName) {
        let entryText = Utils.createCommandWithPrefix(command.info.name[0], message.guild ? message.guild.id : null, true);

        if (operationName !== '_default') {
          entryText += ' ' + operationName;
        }

        if (usageEntryName !== '') {
          entryText += ' ' + usageEntryName;
        }

        entryText += '`: ' + usageEntryDescription;
        usage.push(entryText);
      });

      if (operation.usage) {
        usage.push('');
      }
      
      _.forOwn(operation.flags, function(flagDescription, flagName) {
        if (flagDescription) {
          const entryText = '`-' + flagName + '`: ' + flagDescription;
          flags.push(entryText);
        }
      });
    });

    if (usage.length > 0) {
      const usageParts = [[]];
      const usageLengths = [0];
      let idx = 0;
      for (const i of usage) {
        if (usageLengths[idx] + i.length < 1000) {
          usageParts[idx].push(i);
          usageLengths[idx] += i.length;
        } else {
          idx++;
          usageLengths[idx] = 0;
          usageParts[idx] = [];
          usageParts[idx].push(i);
          usageLengths[idx] += i.length;
        }
      }

      for (const index in usageParts) {
        if (index == 0) {
          embed.addField('Usage', usageParts[index].join('\n'));
        } else {
          embed.addField('\u200B', usageParts[index].join('\n'));
        } 
      }
    }
    
    if (flags.length > 0) {
      embed.addField('Flags', flags.join('\n'));
    }

    if (command.info.examples) {
      embed.addField('Examples', command.info.examples.map(function(i) {
        return '`' + prefix + i + '`';
      }).join('\n'));
    }

    if (command.info.name.length > 1) {
      embed.addField('Aliases', command.info.name.join(', '));
    }

    message.channel.send('', { embed: embed });
  } else {
    message.reply('I couldn\'t find that command.');
  }
};

const info = {
  name: ['help', 'commands'],
  description: 'Lists the bot\'s available commands.',
  type: CommandType.General,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'List all commands.',
        '[command name]': 'Show detailed help page for a specific command.'
      }
    }
  }
};

module.exports = {
  info: info
};
