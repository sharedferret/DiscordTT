const info = {
  name: ['q'],
  description: 'View your playlist.',
  usage: '`' + config.discriminator + 'q`\n`' + config.discriminator + 'q`',
  type: CommandType.TTPlaylist
};

const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  queueHandler.viewQueue(bot, message);
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
