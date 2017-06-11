const name = ['dj'];
const description = 'Adds you to the queue to DJ.';
const usage = '`' + config.discriminator + 'dj`: Adds you to the DJ queue. If there is room on the table, you will step up and begin playing music.';
const type = CommandType.TTMusic;
const hidden = false;

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.addDj(bot, message);
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
