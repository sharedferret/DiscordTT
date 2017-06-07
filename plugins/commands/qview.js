var name = [config.discriminator + 'q', config.discriminator + 'q view'];
var description = 'View your playlist.';
var usage = '`' + config.discriminator + 'q view`\n`' + config.discriminator + 'q`';

var queueHandler = require(global.paths.lib + 'queue-handler');
var tt = require(global.paths.lib + 'turntable-handler');
var Discord = require('discord.js');

var handleMessage = function(bot, message) {
  queueHandler.viewQueue(bot, message);
};

var matches = function(input) {
  return name.indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  handleMessage: handleMessage,
  usage: usage,
  matches: matches
};
