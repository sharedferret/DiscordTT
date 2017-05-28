var name = ['/q remove '];
var description = 'Removes a song from your playlist.';
var usage = '`/q remove [song name or YouTube ID]`:';

var messageHandler = require(global.paths.lib + 'message-handler');
var queueHandler = require(global.paths.lib + 'queue-handler');
var tt = require(global.paths.lib + 'turntable-handler');
var google = require('googleapis');
var youtube = google.youtube('v3');
var Discord = require('discord.js');
var uuid = require('uuid/v4');

var handleMessage = function(bot, message) {
  // TODO: This will need to occur in a lib handler
  // TODO: This loop will act as the bot's main event loop when a DJ session is active
  // TODO: Optimize for bandwidth constraints (e.g. cache downloaded songs)

  if (message.content.length < 10) {
    return message.reply('please provide a position.');
  }

  var queuePosition = parseInt(message.content.substring(10, message.content.length));

  queueHandler.removeSong(bot, message, queuePosition);
};

var matches = function(input) {
  return _.startsWith(input, '/q remove ') || input == '/q remove';
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
