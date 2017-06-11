var name = ['dj'];
var description = 'Adds you to the queue to DJ.';
var usage = '`' + config.discriminator + 'dj`: Adds you to the DJ queue. If there is room on the table, you will step up and begin playing music.';
var type = CommandType.TTMusic;
var hidden = false;

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  tt.addDj(bot, message);
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
