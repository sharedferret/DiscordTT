const info = {
  name: ['status'],
  description: 'Find out about Tohru!',
  usage: '`' + config.discriminator + 'status`: Show bot vitals.',
  type: CommandType.Utility
};

const Discord = require('discord.js');
const git = require('git-rev');
const pkg = require(global.paths.root + '/package.json');
const moment = require('moment');
const humanize = require('humanize');
const tt = require(global.paths.lib + 'turntable-handler');
require('moment-precise-range-plugin');

const handleMessage = function(bot, message) {
  const embed = new Discord.RichEmbed();
  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setThumbnail(bot.user.avatarURL);

  let description = '';

  // Uptime
  let status = '';

  status += 'Uptime: ' + moment.preciseDiff(global.startTime, new Date()) + '\n';
  status += 'Active audio streams: ' + (bot.voiceConnections.size) + '\n';

  embed.addField('Status', status);

  // Session data
  let session = '';

  // Active streams
  session += 'Songs played: ' + tt.networkUsage.streams + '\n';
  session += 'Data downloaded: ' + humanize.filesize(tt.networkUsage.dataIn, 1024, 2) + '\n';

  embed.addField('This Session', session);

  // embed.setDescription(description);

  message.channel.send('', { embed: embed });
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
