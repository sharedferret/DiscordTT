const name = ['skip'];
const description = 'Skips the currently playing song.';
const type = CommandType.TTMusic;

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.skipSong(message.guild.id);
};

const matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  type: type,
  handleMessage: handleMessage,
  matches: matches
};
