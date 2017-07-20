const info = {
  name: ['stop'],
  description: 'Stops the TT plugin.',
  type: CommandType.TTMusic
};

const tt = require(global.paths.lib + 'turntable-handler');

const handleMessage = function(bot, message) {
  if (!message.guild) {
    return message.reply('This command can only be used on a server, not via DM.');
  }

  tt.stop(message.guild.id);
  message.reply('TT plugin stopped.');
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
