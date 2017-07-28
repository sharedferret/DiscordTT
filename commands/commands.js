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
  embed.setDescription('Here\'s a list of all the commands I support. For more info, type `' + config.discriminator + 'help [command name]`.');
  
  const sortedCommands = _.groupBy(messageHandler.commands, function(i) { return i.info.type; });

  for (let commandType in sortedCommands) {
    embed.addField(commandType,
      '`' + sortedCommands[commandType]
      .filter(function(i) { return i.hidden !== true; })
      .map(function(i) {
        if (i.info.displayNames) return i.info.displayNames.map(function(i) { return config.discriminator + i; }).join(', ');
        return config.discriminator + i.info.name[0]
      })
      .join('`, `') + '`');
  }

  embed.setThumbnail(bot.user.avatarURL);

  message.channel.send('', { embed: embed });
}

const displayCommandPage = function(bot, message, commandName) {
  if (!commandName.startsWith(config.discriminator)) {
    commandName = config.discriminator + commandName;
  }

  const requestedCommand = messageHandler.fetchCommand(commandName);

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
        let entryText = '`' + config.discriminator + command.info.name[0];

        if (operationName !== '_default') {
          entryText += ' ' + operationName;
        }

        if (usageEntryName !== '') {
          entryText += ' ' + usageEntryName;
        }

        entryText += '`: ' + usageEntryDescription;
        usage.push(entryText);
      });

      usage.push('');

      _.forOwn(operation.flags, function(flagDescription, flagName) {
        const entryText = '`-' + flagName + '`: ' + flagDescription;
        flags.push(entryText);
      });
    });

    embed.addField('Usage', usage.join('\n'));
    embed.addField('Flags', flags.join('\n'));

    if (command.info.examples) {
      embed.addField('Examples', command.info.examples.map(function(i) {
        return '`' + config.discriminator + i + '`';
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

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1 || _.startsWith(input, config.discriminator + 'help');
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
