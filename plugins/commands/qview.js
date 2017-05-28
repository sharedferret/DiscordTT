var name = ['/q view'];
var description = 'View your playlist.';
var usage = '`/q view`:';

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
