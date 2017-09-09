const git = require('git-rev');
const pkg = require(global.paths.root + '/package.json');
const moment = require('moment');
const humanize = require('humanize');
const tt = require(global.paths.lib + 'turntable-handler');
require('moment-precise-range-plugin');

const handleMessage = function(bot, message, input) {
  const embed = Utils.createEmbed(message);
  embed.setAuthor(bot.user.username, bot.user.avatarURL(256));
  embed.setThumbnail(bot.user.avatarURL(256));

  let description = '';

  // Uptime
  let status = '';

  status += 'Uptime: ' + moment.preciseDiff(global.startTime, new Date()) + '\n';
  status += 'Active audio streams: ' + (bot.voiceConnections.size) + '\n';

  embed.addField('Status', status);

  // Session data
  let session = '';

  // Active streams
  session += 'Songs played: ' + tt.getNetworkUsage().streams + '\n';
  session += 'Data downloaded: ' + humanize.filesize(tt.getNetworkUsage().dataIn, 1024, 2) + '\n';

  embed.addField('This Session', session);

  // embed.setDescription(description);

  message.channel.send('', { embed: embed });
};

const info = {
  name: ['status'],
  description: 'Find out about Tohru!',
  type: CommandType.Utility,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Show bot vitals.'
      }
    }
  }
};

module.exports = {
  info: info
};
