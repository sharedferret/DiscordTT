const moment = require('moment');
const db = require(global.paths.lib + 'database-client').db;

const handleMessage = function(bot, message, input) {
  const embed = Utils.createEmbed(message);
  
  embed.setAuthor(bot.user.username, bot.user.avatarURL(256));

  db.all('SELECT * FROM CommandUsage WHERE date = ? GROUP BY commandName ORDER BY count DESC LIMIT 5', 
    [ moment().utc().startOf('day').toDate() ],
    function(err, rows) {
      if (err) return log.warn(err);

      let description = '';

      for (const row of rows) {
        description += '**' + row.commandName + '**: ' + row.count + '\n';
      }

      embed.setTitle('Command popularity (so far today)');
      embed.setDescription(description);

      message.channel.send('', { embed: embed });
  });
};

const info = {
  name: ['usage'],
  description: 'Shows the most common commands used recently.',
  type: CommandType.Utility,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '': 'Show command popularity.'
      }
    }
  }
};

module.exports = {
  info: info
};
