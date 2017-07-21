const info = {
  name: ['pl rename '],
  description: 'Rename a playlist (this command only supports playlist IDs).',
  usage: '`' + config.discriminator + 'pl rename [playlist ID] [new playlist name]`',
  type: CommandType.TTPlaylist
};

const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  const messageParts = message.content.substring(config.discriminator.length, message.content.length).split(' ');

  if (!messageParts[2]) {
    return message.reply('please provide the ID of the playlist you want to rename.');
  }

  if (messageParts[3]) {
    messageParts[3] = messageParts.slice(3, messageParts.length).join(' ');
  } else {
    return message.reply('plase provide a new name for your playlist.');
  }

  playlistHandler.renamePlaylist(bot, message, messageParts[2], messageParts[3]);
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'pl rename')
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
