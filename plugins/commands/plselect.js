const info = {
  name: ['pl select '],
  description: 'Switch to a new playlist.',
  usage: '`' + config.discriminator + 'pl select [playlist name or ID]`',
  type: CommandType.TTPlaylist
};

const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  const playlistName = message.content.substring(config.discriminator.length + 10, message.content.length);

  if (!playlistName) {
    return message.reply('please provide the name or ID of the playlist you want to use.');
  }

  playlistHandler.switchPlaylist(bot, message, playlistName);
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'pl select')
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
