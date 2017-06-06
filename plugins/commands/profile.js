var name = ['/profile'];
var description = 'View your profile.';

var tt = require(global.paths.lib + 'turntable-handler');
var Discord = require('discord.js');
var db = require(global.paths.lib + 'database-handler').db;

var handleMessage = function(bot, message) {
  var embed = new Discord.RichEmbed();

  embed.setAuthor(message.author.username, message.author.avatarURL);
  embed.setTimestamp(new Date());
  embed.setThumbnail(message.author.avatarURL);

  db.serialize(function() {
    db.get('SELECT points FROM User WHERE id=?', [ message.author.id ], function(err, row) {
      var pointsText = '0 points';

      if (row && row.points) {
        pointsText = row.points == 1 ? '1 point' : row.points + ' points';
      }

      embed.addField('DJ Points', pointsText, true);

      message.channel.send('', { embed: embed });
    });
  });
};

var matches = function(input) {
  return name.indexOf(input.trim()) !== -1;
};

module.exports = {
  name: name,
  description: description,
  handleMessage: handleMessage,
  matches: matches
};
