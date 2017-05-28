var db = require(global.paths.lib + 'database-handler').db;

var viewQueue = function(bot, message) {
  db.serialize(function() {
    db.all('SELECT q.position AS position, s.id AS id, s.type AS type, s.url AS url, s.artist AS artist, s.title AS title, s.metadata AS metadata FROM UserQueue q INNER JOIN Song s ON q.songId = s.id WHERE q.userId = ? ORDER BY q.position LIMIT 10',
      [ message.author.id ], 
      function(error, rows) {
        var description = '';

        for (var i in rows) {
          var row = rows[i];
          description += (row.position) + ') [' + row.title + '](' + row.url + ')\n';
        }

        // TODO: Move back into qview
        var Discord = require('discord.js');

        var embed = new Discord.RichEmbed();

        embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
        embed.setTimestamp(new Date());

        embed.setAuthor(message.author.username + '\'s Queue', message.author.avatarURL);
        embed.setDescription(description);

        message.channel.send('', { embed: embed });
      });
  });
};

var removeSong = function(bot, message, queuePosition) {
  if (queuePosition < 1) {
    return message.reply('please provide a valid queue position.');
  }

  db.serialize(function() {
    db.get('SELECT s.title AS title FROM UserQueue q INNER JOIN Song s ON q.songId = s.id WHERE q.userId = ? AND q.position = ?',
      [
        message.author.id,
        queuePosition
      ],
      function(getErr, row) {
        if (getErr || !row) {
          return message.reply('please provide a valid queue position.');
        }

        db.run('DELETE FROM UserQueue WHERE userId = ? AND position = ?', 
          [
            message.author.id,
            queuePosition
          ], function(runErr) {
            if (!runErr) {
              db.run('UPDATE UserQueue SET position=position-1 WHERE userId = ? AND position > ?',
                [
                  message.author.id,
                  queuePosition
                ]);

              message.reply('_' + row.title + '_ was removed from your queue.');
            }
        }); 
    }); 
  });
};

var queueSong = function(bot, message, song) {
  var user = message.author;

  db.serialize(function() {
    // Add user account if not already exists
    db.run('INSERT OR REPLACE INTO User (id, serverId, username, avatar, upvotes, downvotes, points, lastActive) VALUES (?, ?, ?, ?, (SELECT upvotes FROM User WHERE id = ?), (SELECT downvotes FROM User WHERE id = ?), (SELECT points FROM User WHERE id = ?), ?)',
      [
        user.id,
        message.guild.id,
        user.username,
        user.avatarURL,
        user.id,
        user.id,
        user.id,
        new Date()
      ]);

    // Insert/replace song data
    // Since Youtube is our only provider, we're using the Youtube ID as a unique PK
    // Replace since we want any updated metadata
    db.run('INSERT OR REPLACE INTO Song (id, type, url, title, metadata) VALUES (?, ?, ?, ?, ?)',
      [
        song.id.videoId,
        'youtube',
        'https://www.youtube.com/watch?v=' + song.id.videoId,
        song.snippet.title,
        JSON.stringify(song)
      ]);

    // Insert into this user's queue at position 1, shift all other playlist entries down one
    db.run('UPDATE UserQueue SET position=position+1 WHERE userId = ' + user.id);
    db.run('INSERT INTO UserQueue (userId, position, songId, dateAdded) VALUES (?, ?, ?, ?)',
      [
        user.id,
        1,
        song.id.videoId, 
        new Date()
      ]);

    message.reply('I\'ve added the song to the top of your queue!');
  });
};

module.exports = {
  queueSong: queueSong,
  removeSong: removeSong,
  viewQueue: viewQueue
};

