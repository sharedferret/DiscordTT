const name = ['stop'];
const description = 'Forcefully stops the TT plugin.';
const type = CommandType.TTMusic;

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  tt.stop(message.guild.id);
  message.reply('TT plugin stopped.');
};

const matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  type: type,
  handleMessage: handleMessage,
  matches: matches
};
