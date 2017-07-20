const info = {
  name: ['playlists', 'pl'],
  description: 'View your playlists.',
  usage: '`' + config.discriminator + 'playlists`\n`' + config.discriminator + 'pl`',
  type: CommandType.TTPlaylist
};

const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  playlistHandler.viewPlaylists(bot, message);
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
