const info = {
  name: ['stepdown'],
  description: 'Removes you from the decks.',
  usage: '`' + config.discriminator + 'stepdown`',
  type: CommandType.TTMusic,
  hidden: false
};

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.removeDj(bot, message);
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
