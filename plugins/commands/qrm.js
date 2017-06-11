const name = ['q- ', 'q remove '];
const description = 'Removes a song from your playlist.';
const usage = '`' + config.discriminator + 'q remove [queue location]`:\n`' + config.discriminator + 'q- [queue location]:`';
const type = CommandType.TTPlaylist;

const messageHandler = require(global.paths.lib + 'message-handler');
const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const google = require('googleapis');
const youtube = google.youtube('v3');
const Discord = require('discord.js');
const uuid = require('uuid/v4');

const handleMessage = function(bot, message) {
  const positionString = message.content.substring(message.content.startsWith(config.discriminator + 'q-') ? config.discriminator.length + 3 : config.discriminator.length + 9, message.content.length);

  if (positionString == '') {
    return message.reply('please provide a position.');
  }

  queueHandler.removeSong(bot, message, parseInt(positionString));
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'q remove') || _.startsWith(input, config.discriminator + 'q-');
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  type: type,
  handleMessage: handleMessage,
  matches: matches
};
