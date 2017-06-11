const name = ['help', 'commands'];
const description = 'Lists the bot\'s available commands.';
const usage = '`' + config.discriminator + 'help`: List all commands.\n`' + config.discriminator + 'help [command name]`: Show help page for a specific command.';
const type = CommandType.General;

const Discord = require('discord.js');
const messageHandler = require(global.paths.lib + 'message-handler');

const handleMessage = function(bot, message) {
  if (message.content == config.discriminator + 'help' || message.content == config.discriminator + 'commands') {
    // TODO: Split commands by type, add ability to hide commands
    const embed = new Discord.RichEmbed();
    embed.setAuthor(bot.user.username, bot.user.avatarURL);
    embed.setTitle('Supported Commands');
    embed.setDescription('Here\'s a list of all the commands I support. For more info, type `' + config.discriminator + 'help [command name]`.');
    
    const sortedCommands = _.groupBy(messageHandler.commands, function(i) { return i.type; });
    console.log('commands', sortedCommands);

    for (let commandType in sortedCommands) {
      embed.addField(commandType,
        sortedCommands[commandType]
        .filter(function(i) { return i.hidden !== true; })
        .map(function(i) { return config.discriminator + (typeof i.name == 'string' ? i.name : i.name[0])})
        .join('\n'));
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
      embed.setTitle(typeof requestedCommand.name == 'string' ? requestedCommand.name : requestedCommand.name[0]);
      embed.setDescription('_' + (requestedCommand.description ? requestedCommand.description : 'No description available.') + '_');
      if (requestedCommand.usage) {
        embed.addField('Usage', requestedCommand.usage);
      }

      if (!(typeof requestedCommand.name == 'string')) {
        embed.addField('Alternate commands', requestedCommand.name.join(', '));
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
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1 || _.startsWith(input, config.discriminator + 'help');
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  type: type,
  handleMessage: handleMessage,
  matches: matches
};
