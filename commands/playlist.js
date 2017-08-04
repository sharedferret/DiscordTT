const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const url = require('url');

const viewPlaylists = function(bot, message, input) {
  playlistHandler.viewPlaylists(bot, message);
};

const addPlaylist = function(bot, message, input) {
  const playlistName = input.input;

  if (!playlistName) {
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

const deletePlaylist = function(bot, message, input) {
  const playlistName = input.input;

  if (!playlistName) {
    return message.reply('please provide the name or ID of the playlist you want to remove.');
  }

  playlistHandler.removePlaylist(bot, message, playlistName);
};

const selectPlaylist = function(bot, message, input) {
  const playlistName = input.input;

  if (!playlistName) {
    return message.reply('please provide the name or ID of the playlist you want to use.');
  }

  playlistHandler.switchPlaylist(bot, message, playlistName);
};

const renamePlaylist = function(bot, message, input) {
  const messageParts = input.input.split(' ');

  if (!messageParts[0]) {
    return message.reply('please provide the ID of the playlist you want to rename.');
  }

  if (!messageParts[1]) {
    return message.reply('plase provide a new name for your playlist.');
  }

  const playlistId = messageParts.shift();
  const newPlaylistName = messageParts.join(' ');

  playlistHandler.renamePlaylist(bot, message, playlistId, newPlaylistName);
};

const shufflePlaylist = function(bot, message, input) {
  const playlistName = input.input;

  // If no playlist name provided, shuffle the active playlist
  if (!playlistName) {
    return playlistHandler.getActivePlaylistId(message.author.id, playlistHandler.shufflePlaylist.bind(this, bot, message));
  }

  playlistHandler.shufflePlaylist(bot, message, playlistName);
};

const info = {
  name: ['pl', 'playlist'],
  description: 'Playlist management commands.',
  displayNames: ['pl', 'pl add', 'pl delete', 'pl rename', 'pl select', 'pl shuffle'],
  type: CommandType.TTPlaylist,
  hidden: false,
  operations: {
    _default: {
      handler: viewPlaylists,
      usage: {
        '': 'View your playlists.'
      }
    },
    add: {
      handler: addPlaylist,
      usage: {
        '[playlist name]': 'Create a new playlist with the given name.',
        '[Youtube playlist URL]': 'Create a new playlist from a Youtube playlist.'
      }
    },
    delete: {
      handler: deletePlaylist,
      usage: {
        '[playlist name or ID]': 'Delete a playlist with the given name or ID.'
      }
    },
    select: {
      handler: selectPlaylist,
      usage: {
        '[playlist name or ID]': 'Change your active playlist.'
      }
    },
    rename: {
      handler: renamePlaylist,
      usage: {
        '[playlist ID] [new playlist name]': 'Rename a playlist (this command only supports playlist IDs - use `' + config.prefix + 'pl` to find the playlist\'s ID).'
      }
    },
    shuffle: {
      handler: shufflePlaylist,
      usage: {
        '[playlist name or ID]': 'Shuffle songs in a playlist.'
      }
    }
  }
};

module.exports = {
  info: info
};
