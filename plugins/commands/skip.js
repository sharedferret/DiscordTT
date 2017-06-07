var name = ['skip'];
var description = 'Skips the currently playing song.';

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  tt.skipSong(message.guild.id);
};

var matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  handleMessage: handleMessage,
  matches: matches
};
