var name = ['profile'];
var description = 'View your profile.';

var tt = require(global.paths.lib + 'turntable-handler');
var Discord = require('discord.js');
var db = require(global.paths.lib + 'database-handler').db;

var handleMessage = function(bot, message) {
  if (message.mentions.users.size > 0) {
    console.log('showing profile for first mention');
    displayProfileForUser(bot, message, message.mentions.users.first());
  } else {
    displayProfileForUser(bot, message, message.author);
  }
};

var displayProfileForUser = function(bot, message, user) {
  var embed = new Discord.RichEmbed();

  embed.setAuthor(user.username, user.avatarURL);
  embed.setTimestamp(new Date());
  embed.setThumbnail(user.avatarURL);
  embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);

  db.serialize(function() {
    db.get('SELECT points FROM User WHERE id=?', [ user.id ], function(err, row) {
      var pointsText = '0 points';

      if (row && row.points) {
        pointsText = row.points == 1 ? '1 point' : row.points + ' points';
      }

      embed.addField('DJ Points', pointsText, true);

      db.all('SELECT s.title AS title, COUNT(*) AS playcount, SUM(h.upvotes) AS up, SUM(h.downvotes) AS down FROM SongHistory h LEFT JOIN Song s ON s.id = h.songId WHERE h.djid = ? GROUP BY songId ORDER BY playcount DESC LIMIT 3',
        [ user.id ], function(mostPlayedErr, mostPlayedRows) {

        var mostPlayed = '';

        for (var i in mostPlayedRows) {
          var row = mostPlayedRows[i];
          mostPlayed += (parseInt(i) + 1) + ') ' + row.title + '\n\t\t' + row.playcount + ' plays (+' + row.up + '/-' + row.down + ')\n';
        }

        if (mostPlayed) {
          embed.addField('Most Played', mostPlayed);
        }

        message.channel.send('', { embed: embed });
      });
    });
  });
};

var matches = function(input) {
  return _.startsWith(input, config.discriminator + 'profile');
};

module.exports = {
  name: name,
  description: description,
  handleMessage: handleMessage,
  matches: matches
};
