const info = {
  name: ['skip'],
  description: 'Skips the currently playing song.',
  type: CommandType.TTMusic
};

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.skipSong(message.guild.id);
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
