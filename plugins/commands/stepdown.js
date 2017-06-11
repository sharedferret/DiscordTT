var name = ['stepdown'];
var description = 'Removes you from the decks.';
var usage = '`' + config.discriminator + 'stepdown`';
var type = CommandType.TTMusic;
var hidden = false;

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  tt.removeDj(bot, message);
};

var matches = function(input) {
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
