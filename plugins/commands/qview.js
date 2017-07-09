const info = {
  name: ['q'],
  description: 'View your current playlist.',
  usage: '`' + config.discriminator + 'q`: View the first page of your queue.\n`' + config.discriminator + 'q [page number]`: View a specific page of your active playlist\'s queue.',
  type: CommandType.TTPlaylist
};

const queueHandler = require(global.paths.lib + 'queue-handler');
const tt = require(global.paths.lib + 'turntable-handler');
const Discord = require('discord.js');

const handleMessage = function(bot, message) {
  const cmd = message.content.substring(config.discriminator.length, message.content.length);

  let page = 1;

  if (cmd.length > 2) {
    const idx = parseInt(cmd.substring(2, cmd.length), 10);
    console.log('idx', idx);

    if (!isNaN(idx)) {
      page = idx;
    }
  }

  queueHandler.viewQueue(bot, message, page);
};

const matches = function(input) {
  // Match /q
  if (info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1) return true;

  // Match /q [page num]
  if (_.startsWith(input, config.discriminator + 'q ')) {
    const idx = parseInt(input.substring(config.discriminator.length + 2, input.length), 10);
    return !isNaN(idx);
  }

};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
