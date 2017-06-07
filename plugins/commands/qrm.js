var name = ['q- ', 'q remove '];
var description = 'Removes a song from your playlist.';
var usage = '`' + config.discriminator + 'q remove [queue location]`:\n`' + config.discriminator + 'q- [queue location]:`';

var messageHandler = require(global.paths.lib + 'message-handler');
var queueHandler = require(global.paths.lib + 'queue-handler');
var tt = require(global.paths.lib + 'turntable-handler');
var google = require('googleapis');
var youtube = google.youtube('v3');
var Discord = require('discord.js');
var uuid = require('uuid/v4');

var handleMessage = function(bot, message) {
  var positionString = message.content.substring(message.content.startsWith(config.discriminator + 'q-') ? config.discriminator.length + 3 : config.discriminator.length + 9, message.content.length);

  if (positionString == '') {
    return message.reply('please provide a position.');
  }

  queueHandler.removeSong(bot, message, parseInt(positionString));
};

var matches = function(input) {
  return _.startsWith(input, config.discriminator + 'q remove') || _.startsWith(input, config.discriminator + 'q-');
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
