const info = {
  name: ['usage'],
  description: 'Shows the most common commands used recently.',
  usage: '`' + config.discriminator + 'usage`: Show command popularity.',
  type: CommandType.Utility
};

const Discord = require('discord.js');
const moment = require('moment');
const db = require(global.paths.lib + 'database-handler').db;

const handleMessage = function(bot, message) {
  const embed = new Discord.RichEmbed();
  embed.setAuthor(bot.user.username, bot.user.avatarURL);

  let description = '';

  db.all('SELECT * FROM CommandUsage WHERE date = ? GROUP BY commandName ORDER BY count DESC LIMIT 5', 
    [ moment().utc().startOf('day').toDate() ],
    function(err, rows) {
      if (err) return console.warn(err);

      let description = '';

      for (const row of rows) {
        description += '**' + row.commandName + '**: ' + row.count + '\n';
      }

      embed.setTitle('Command popularity (so far today)');
      embed.setDescription(description);

      message.channel.send('', { embed: embed });
  });
};

const matches = function(input) {
  return info.name.map(function(i) { return config.discriminator + i; }).indexOf(input.trim()) !== -1;
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
