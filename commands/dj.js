const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message, input) {
  if (message.guild) {
    tt.addDj(bot, message);
  } else {
    message.reply('This command can only be used on a server, not via DM.');
  }
  
};

const info = {
  name: ['dj'],
  description: 'Adds a user to the queue to DJ.',
  type: CommandType.TTMusic,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Adds you to the DJ queue. If there is room on the table, you will step up and begin playing music.'
      }
    }
  }
};

module.exports = {
  info: info
};
