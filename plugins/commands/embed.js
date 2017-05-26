var name = ['/embed'];

var Discord = require('discord.js');

var messageHandler = require(global.paths.lib + 'message-handler');

var handleMessage = function(bot, message) {
  var embed = new Discord.RichEmbed('Test');

  embed.setColor([66,255,255]);
  embed.setDescription('Description');
  embed.setAuthor('Yui', message.author.avatarURL);
  embed.addField('Field1', 'Value');
  embed.addField('a', 'Value1', true);
  embed.addField('\t', 'Value2', true);
  embed.addField('\t', 'Value3', true);

  embed.addField('Field2', 'Valuen');

  embed.setFooter('Footer Text');
  embed.setImage(message.author.avatarURL);
  embed.setTimestamp(new Date());
  embed.setTitle('Title');
  embed.setThumbnail(message.author.avatarURL);

  message.channel.send('', { embed: embed });
};

var matches = function(input) {
  return name.indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  handleMessage: handleMessage,
  matches: matches
};
