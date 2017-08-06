const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler-legacy');

const qAdd = require(global.paths.commands + 'qadd');
const qRm = require(global.paths.commands + 'qrm');

const handleMessage = function(bot, message, input) {
  const position = input.input;

  let page = 1;

  if (position) {
    const idx = parseInt(position, 10);
    console.log('idx', idx);

    if (!isNaN(idx)) {
      page = idx;
    }
  }

  queueHandler.viewQueue(bot, message, page);
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
