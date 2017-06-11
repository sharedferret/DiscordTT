var name = ['status'];
var description = 'Find out about Tohru!';
var usage = '`' + config.discriminator + 'status`: Show bot vitals.';
var type = CommandType.Utility;

var Discord = require('discord.js');
var git = require('git-rev');
var pkg = require(global.paths.root + '/package.json');
var moment = require('moment');
var humanize = require('humanize');
var tt = require(global.paths.lib + 'turntable-handler');
require('moment-precise-range-plugin');

var handleMessage = function(bot, message) {
  var embed = new Discord.RichEmbed();
  embed.setAuthor(bot.user.username, bot.user.avatarURL);
  embed.setThumbnail(bot.user.avatarURL);

  var description = '';

  // Uptime
  var status = '';

  status += 'Uptime: ' + moment.preciseDiff(global.startTime, new Date()) + '\n';
  status += 'Active audio streams: ' + (bot.voiceConnections.size) + '\n';

  embed.addField('Status', status);

  // Session data
  var session = '';

  // Active streams
  session += 'Songs played: ' + tt.networkUsage.streams + '\n';
  session += 'Data downloaded: ' + humanize.filesize(tt.networkUsage.dataIn, 1024, 2) + '\n';

  embed.addField('This Session', session);

  // embed.setDescription(description);

  message.channel.send('', { embed: embed });
};

var matches = function(input) {
  return name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  type: type,
  usage: usage,
  handleMessage: handleMessage,
  matches: matches
};
