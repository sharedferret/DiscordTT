const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message, input) {
  tt.removeDj(bot, message);
};

const info = {
  name: ['stepdown'],
  description: 'Removes you from the decks.',
  type: CommandType.TTMusic,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Removes the user from the DJ list, and stops playing their music.'
      }
    }
  }
};

module.exports = {
  info: info
};
