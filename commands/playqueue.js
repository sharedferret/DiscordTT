const playlistHandler = require(global.paths.lib + 'playlist-handler');
const tt = require(global.paths.lib + 'turntable-handler-legacy');
const url = require('url');

const viewPlayQueue = (bot, message, input) => {
    if (!message.guild) {
      return message.reply('This command can only be used on a server, not via DM.');
    }

    const position = input.input;
    let page = 1;

    if (position) {
        const idx = parseInt(position, 10);
        if (!isNaN(idx)) page = idx;
    }

    const state = tt.getState(message.guild.id);

    if (!state || !state.unqueuedSongs || state.unqueuedSongs.length == 0) {
      return message.reply('The play queue is empty.');
    }

    const embed = Utils.createEmbed(message);

    embed.setAuthor('Play Queue', bot.user.avatarURL);

    let descriptionLines = [];

    const startIdx = (page - 1) * 10;
    const endIdx = startIdx + 10 > state.unqueuedSongs.length ? state.unqueuedSongs.length : (startIdx + 10);

    for (let i = startIdx; i < endIdx; i++) {
      const song = state.unqueuedSongs[i];
      descriptionLines.push(`${i + 1}) [${song.title}](${song.url}) (Queued by ${song.originalDJ.username})`);
    }

    const description = descriptionLines.join('\n') + `\nPage ${page} of ${Math.ceil(state.unqueuedSongs.length / 10)}`;

    embed.setDescription(description);
    const firstSongMetadata = JSON.parse(state.unqueuedSongs[0].metadata);
    embed.setThumbnail(firstSongMetadata.snippet.thumbnails.medium.url);

    message.channel.send('', { embed: embed });
};

const clearPlayQueue = (bot, message, input) => {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  tt.clearPlayQueue(message.guild.id);
  message.reply('the play queue has been cleared.');
}

const info = {
  name: ['playqueue', 'pq'],
  description: 'Shows the play queue for songs that have been queued outside a playlist.',
  type: CommandType.TTPlaylist,
  hidden: false,
  operations: {
    _default: {
      handler: viewPlayQueue,
      usage: {
        '': 'View the play queue.',
        '[page number]': 'View a specific page of the play queue.'
      }
    },
    clear: {
      handler: clearPlayQueue,
      usage: {
        '': 'Clears the play queue.'
      }
    }
  }
};

module.exports = {
  info: info
};
