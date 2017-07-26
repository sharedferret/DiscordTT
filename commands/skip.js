const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message, input) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }
  
  tt.skipSong(message.guild.id);
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
