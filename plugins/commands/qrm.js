var name = ['/q- ', '/q remove '];
var description = 'Removes a song from your playlist.';
var usage = '`/q remove [queue location]`:\n`/q- [queue location]:`';

var messageHandler = require(global.paths.lib + 'message-handler');
var queueHandler = require(global.paths.lib + 'queue-handler');
var tt = require(global.paths.lib + 'turntable-handler');
var google = require('googleapis');
var youtube = google.youtube('v3');
var Discord = require('discord.js');
var uuid = require('uuid/v4');

var handleMessage = function(bot, message) {
  var positionString = message.content.substring(message.content.startsWith('/q-') ? 4 : 10, message.content.length);

  if (positionString == '') {
    return message.reply('please provide a position.');
  }

  queueHandler.removeSong(bot, message, parseInt(positionString));
};

var matches = function(input) {
  return _.startsWith(input, '/q remove') || _.startsWith(input, '/q-');
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
