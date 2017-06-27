const info = {
  name: ['pl add '],
  description: 'Add a new playlist.',
  usage: '`' + config.discriminator + 'pl add [playlist name]`',
  type: CommandType.TTPlaylist
};

const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');
const url = require('url');

const handleMessage = function(bot, message) {
  const playlistName = message.content.substring(config.discriminator.length + 7, message.content.length);

  if (!playlistName) {
    // TODO: Generate a playlist name in this situation
    return message.reply('please provide a name for this playlist!');
  }

  // If it's a YT playlist link, attempt to load all tracks
  const messageUrl = url.parse(playlistName);

  if (messageUrl.host && messageUrl.host.indexOf('youtube.com') > -1 && messageUrl.query && messageUrl.query.indexOf('list=') > -1) {
    const plStart = messageUrl.query.substring(messageUrl.query.indexOf('list='), messageUrl.query.length);

    const playlistId = plStart.substring(5, plStart.indexOf('&') > -1 ? plStart.indexOf('&') : plStart.length);

    return playlistHandler.addYoutubePlaylist(message, playlistId);
  }

  playlistHandler.addPlaylist(bot, message, playlistName);
};

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'pl add')
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
