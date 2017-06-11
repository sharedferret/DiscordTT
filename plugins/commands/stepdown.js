const name = ['stepdown'];
const description = 'Removes you from the decks.';
const usage = '`' + config.discriminator + 'stepdown`';
const type = CommandType.TTMusic;
const hidden = false;

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.removeDj(bot, message);
};

const matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  type: type,
  hidden: hidden,
  handleMessage: handleMessage,
  matches: matches
};
