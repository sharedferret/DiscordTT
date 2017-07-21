const info = {
  name: ['pl shuffle '],
  description: 'Shuffle songs in a playlist.',
  usage: '`' + config.discriminator + 'pl shuffle [playlist name or ID]`',
  type: CommandType.TTPlaylist
};

const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  const playlistName = message.content.substring(config.discriminator.length + 11, message.content.length);

  if (!playlistName) {
    console.log('getting playlist id');
    return playlistHandler.getActivePlaylistId(message.author.id, playlistHandler.shufflePlaylist.bind(this, bot, message));
  }

  playlistHandler.shufflePlaylist(bot, message, playlistName);
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'pl shuffle')
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
