const tt = require(global.paths.lib + 'turntable-handler-legacy');

const handleMessage = function(bot, message, input) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  const state = tt.getState(message.guild.id);

  // Cases where a user can skip:
  // 1: They're a guild admin (Administrator or Manage Server role)
  // 2: They're the current DJ
  // 3: The bot is currently playing a song on their behalf
  if (Utils.isGuildAdmin(message.member) || 
    (state && state.currentDj && (
      state.djs[state.currentDj].id == message.author.id || 
      (state.nowPlaying && state.nowPlaying.originalDJ && state.nowPlaying.originalDJ.id == message.author.id)))) {
    tt.skipSong(message.guild.id);
  } else {
    message.reply('only a guild administrator or the current DJ can skip a song.');
  }
};

const info = {
  name: ['skip'],
  description: 'Skips the currently playing song.',
  type: CommandType.TTMusic,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Skips the currently playing song.'
      }
    }
  }
};

module.exports = {
  info: info
};
