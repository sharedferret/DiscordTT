var name = ['help', 'commands'];
var description = 'Lists the bot\'s available commands.';
var usage = '`' + config.discriminator + 'help`: List all commands.\n`' + config.discriminator + 'help [command name]`: Show help page for a specific command.';

var Discord = require('discord.js');
var messageHandler = require(global.paths.lib + 'message-handler');

var handleMessage = function(bot, message) {
  if (message.content == config.discriminator + 'help' || message.content == config.discriminator + 'commands') {
    // TODO: Split commands by type, add ability to hide commands
    var embed = new Discord.RichEmbed();
    embed.setAuthor(bot.user.username, bot.user.avatarURL);
    embed.setDescription('Here\'s a list of all the commands I support. For more info, type `/help [command name]`.');
    embed.addField('Supported Commands', 
      messageHandler.commands
        .filter(function(i) {
          return i.hidden !== true;
        })
        .map(function(i) { 
          return config.discriminator + (typeof i.name == 'string' ? i.name : i.name[0]); 
        })
        .join('\n'));

    embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
    embed.setTimestamp(new Date());
    embed.setThumbnail(bot.user.avatarURL);

    message.channel.send('', { embed: embed });
  } else {
    var commandName = message.content.substring(config.discriminator.length + 5, message.content.length);
    if (!commandName.startsWith(config.discriminator)) {
      commandName = config.discriminator + commandName;
    }

    var requestedCommand = messageHandler.fetchCommand(commandName);

    if (requestedCommand) {
      var embed = new Discord.RichEmbed();
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

var matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1 || _.startsWith(input, config.discriminator + 'help');
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
