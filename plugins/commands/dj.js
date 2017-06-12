const info = {
  name: ['dj'],
  description: 'Adds you to the queue to DJ.',
  usage: '`' + config.discriminator + 'dj`: Adds you to the DJ queue. If there is room on the table, you will step up and begin playing music.',
  type: CommandType.TTMusic,
  hidden: false
};

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.addDj(bot, message);
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
