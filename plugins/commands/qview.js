const name = ['q'];
const description = 'View your playlist.';
const usage = '`' + config.discriminator + 'q`\n`' + config.discriminator + 'q`';
const type = CommandType.TTPlaylist;

const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  queueHandler.viewQueue(bot, message);
};

const matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  type: type,
  handleMessage: handleMessage,
  usage: usage,
  matches: matches
};
