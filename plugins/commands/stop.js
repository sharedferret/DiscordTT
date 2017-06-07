var name = ['stop'];
var description = 'Forcefully stops the TT plugin.';

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  tt.stop(message.guild.id);
  message.reply('TT plugin stopped.');
};

var matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  handleMessage: handleMessage,
  matches: matches
};
