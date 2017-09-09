const queueHandler = require(global.paths.lib + 'queue-handler');
const qAdd = require(global.paths.commands + 'qadd');
const qRm = require(global.paths.commands + 'qrm');

const handleMessage = function(bot, message, input) {
  const position = input.input;

  let page = 1;

  if (position) {
    const idx = parseInt(position, 10);
    log.info('idx', idx);

    if (!isNaN(idx)) {
      page = idx;
    }
  }

  const startPosition = (page - 1) * 10;

  queueHandler.getQueue(message.author.id, page)
    .then(result => {
      const playlistName = result.playlistName;
      const songCount = result.songCount;
      const songs = result.songs;

      if (songs && songs.length > 0) {
        let description = '';

        for (let i in songs) {
          const song = songs[i];
          description += `${song.position}) [${song.title}](${song.url})\n`;
        }

        description += `\n_Page ${page} of ${Math.ceil(songCount / 10)}_`;

        const embed = Utils.createEmbed(message);
        embed.setAuthor(`Playlist: ${playlistName} (${songCount} song${songCount == 1 ? '' : 's'})`, message.author.avatarURL(256));
        embed.setDescription(description);

        if (songs.length > 0) {
          const firstSongMetadata = JSON.parse(songs[0].metadata);
          embed.setThumbnail(firstSongMetadata.snippet.thumbnails.medium.url);
        }

        message.channel.send('', { embed: embed });
      } else {
        if (songCount < startPosition) {
          message.reply(`your queue only has ${songCount} song${songCount == 1 ? '' : 's'}. Please specify a lower page number.`);
        } else {
          message.reply('you don\'t have any songs in your queue!');
        }
      }
    })
    .catch(error => {
      message.reply('sorry, an error occurred.');
      log.info(error);
    })
};

const handleQAdd = function(bot, message, input) {
  qAdd.handleMessage(bot, message, input);
}

const info = {
  name: ['q'],
  description: 'View the song queue for your current playlist.',
  type: CommandType.TTPlaylist,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'View the first page of your queue.',
        '[page number]': 'View a specific page of your queue.'
      }
    },
    add: {
      handler: qAdd.handleMessage,
      usage: {
        '[song name]': 'Add a song to your queue (see also `' + config.prefix + 'q+`).'
      }
    },
    remove: {
      handler: qRm.handleMessage,
      usage: {
        '[song position]': 'Remove a song at the given position (see also `' + config.prefix + 'q-`).'
      }
    }
  }
};

module.exports = {
  info: info
};
