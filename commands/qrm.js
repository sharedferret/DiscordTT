const messageHandler = require(global.paths.lib + 'message-handler');
const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const google = require('googleapis');
const youtube = google.youtube('v3');
const Discord = require('discord.js');
const uuid = require('uuid/v4');

const handleMessage = function(bot, message, input) {
  const positionString = input.input;

  if (positionString == '') {
    return message.reply('please provide a position.');
  }

  queueHandler.removeSong(bot, message, parseInt(positionString));
};

const info = {
  name: ['q-'],
  description: 'Removes a song from your playlist.',
  type: CommandType.TTPlaylist,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '[queue location]': 'Removes the song at the given position in your queue. (To find the position, use `' + config.discriminator + 'q`)'
      }
    }
  }
};

module.exports = {
  info: info,
  handleMessage: handleMessage
};
