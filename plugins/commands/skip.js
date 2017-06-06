var name = ['/skip'];
var description = 'Skips the currently playing song.';

var tt = require(global.paths.lib + 'turntable-handler');

var handleMessage = function(bot, message) {
  tt.skipSong();
};

var matches = function(input) {
  return name.indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  handleMessage: handleMessage,
  matches: matches
};
