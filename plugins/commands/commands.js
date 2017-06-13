const info = {
  name: ['help', 'commands'],
  description: 'Lists the bot\'s available commands.',
  usage: '`' + config.discriminator + 'help`: List all commands.\n`' + config.discriminator + 'help [command name]`: Show help page for a specific command.',
  type: CommandType.General
};

const Discord = require('discord.js');
const messageHandler = require(global.paths.lib + 'message-handler');

const handleMessage = function(bot, message) {
  if (message.content == config.discriminator + 'help' || message.content == config.discriminator + 'commands') {
    // TODO: Split commands by type, add ability to hide commands
    const embed = new Discord.RichEmbed();
    embed.setAuthor(bot.user.username, bot.user.avatarURL);
    embed.setTitle('Supported Commands');
    embed.setDescription('Here\'s a list of all the commands I support. For more info, type `' + config.discriminator + 'help [command name]`.');
    
    const sortedCommands = _.groupBy(messageHandler.commands, function(i) { return i.info.type; });

    for (let commandType in sortedCommands) {
      embed.addField(commandType,
        '`' + sortedCommands[commandType]
        .filter(function(i) { return i.hidden !== true; })
        .map(function(i) { return config.discriminator + i.info.name[0]})
        .join('`, `') + '`');
    }

    embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
    embed.setTimestamp(new Date());
    embed.setThumbnail(bot.user.avatarURL);

    message.channel.send('', { embed: embed });
  } else {
    let commandName = message.content.substring(config.discriminator.length + 5, message.content.length);
    if (!commandName.startsWith(config.discriminator)) {
      commandName = config.discriminator + commandName;
    }

    const requestedCommand = messageHandler.fetchCommand(commandName);

    if (requestedCommand) {
      const embed = new Discord.RichEmbed();
      embed.setAuthor(bot.user.username, bot.user.avatarURL);
      embed.setTitle(requestedCommand.info.name[0]);
      embed.setDescription('_' + (requestedCommand.info.description ? requestedCommand.info.description : 'No description available.') + '_');
      if (requestedCommand.info.usage) {
        embed.addField('Usage', requestedCommand.info.usage);
      }

      if (requestedCommand.info.name.length > 1) {
        embed.addField('Alternate commands', requestedCommand.info.name.join(', '));
      }

      embed.setThumbnail(bot.user.avatarURL);
      embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
      embed.setTimestamp(new Date());

      message.channel.send('', { embed: embed });
    } else {
      message.reply('I couldn\'t find that command.');
    }
  }
  
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1 || _.startsWith(input, config.discriminator + 'help');
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
