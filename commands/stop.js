const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message, input) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  tt.stop(message.guild.id);
  message.reply('TT plugin stopped.');
};

const info = {
  name: ['stop'],
  description: 'Stops the TT plugin.',
  type: CommandType.TTMusic,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Stops the TT plugin.'
      }
    }
  }
};

module.exports = {
  info: info
};
