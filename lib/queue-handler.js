var db = require(global.paths.lib + 'database-handler').db;
var uuid = require('uuid/v4');

var viewQueue = function(bot, message) {
  db.serialize(function() {
    db.all('SELECT p.name AS playlist, q.position AS position, s.id AS id, s.type AS type, s.url AS url, s.artist AS artist, s.title AS title, s.metadata AS metadata FROM UserQueue q INNER JOIN Song s ON q.songId = s.id INNER JOIN User u ON u.id = q.userId INNER JOIN Playlist p ON q.userId = p.userId WHERE q.userId = ? AND q.playlistId = u.activePlaylistId AND q.position > ? ORDER BY q.position LIMIT 10',
      [ message.author.id, 0 ], 
      function(error, rows) {
        if (rows && rows.length > 0) {
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

          embed.setAuthor('Playlist: ' + rows[0].playlist, message.author.avatarURL);
          embed.setDescription(description);

          if (rows.length > 0) {
            var firstSongMetadata = JSON.parse(rows[0].metadata);
            embed.setThumbnail(firstSongMetadata.snippet.thumbnails.medium.url);
          }

          message.channel.send('', { embed: embed });
        } else {
          message.reply('you don\'t have any songs in your queue!');
        }
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
    // Get User object from DB
    db.get('SELECT p.name AS name, u.activePlaylistId AS activePlaylistId FROM Playlist p LEFT JOIN User u ON p.userId = u.id WHERE u.id = ? AND u.activePlaylistId = p.id', [ user.id ], function(err, row) {
      var playlistName = 'Default';

      if (!row) {
        console.log('creating user');
        var defaultPlaylistId = uuid();

        // Add a new default playlist if it doesn't already exist
        db.run('INSERT INTO Playlist (id, userId, name, metadata) VALUES (?, ?, ?, ?)',
          [
            defaultPlaylistId,
            user.id,
            'Default',
            null
          ]);

        // Create a new entry for User
        db.run('INSERT INTO User (id, serverId, username, avatar, upvotes, downvotes, points, lastActive, metadata, activePlaylistId) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?)',
          [
            user.id,
            message.guild.id,
            user.username,
            user.avatarURL,
            new Date(),
            null,
            defaultPlaylistId
          ]);

        db.run('INSERT INTO UserQueue (userId, position, songId, playlistId, dateAdded) VALUES (?, ?, ?, ?, ?)',
          [
            user.id,
            1,
            song.id.videoId,
            defaultPlaylistId,
            new Date()
          ]);
      } else {
        // Backfill: create a default playlist if one doesn't exist
        var playlist = row.activePlaylistId;
        playlistName = row.name;

        if (!playlist) {
          playlist = uuid();
          db.run('INSERT INTO Playlist (id, userId, name, metadata) VALUES (?, ?, ?, ?)',
            [
              playlist,
              user.id,
              'Default',
              null
            ]);
        }

        // Update User
        db.run('UPDATE User SET username = ?, avatar = ?, lastActive = ? WHERE id = ?',
          [
            user.username,
            user.avatarURL,
            new Date(),
            user.id
          ]);

        // Insert into this user's queue at position 1, shift all other playlist entries down one
        db.run('UPDATE UserQueue SET position=position+1 WHERE userId = ? AND playlistId = ?', [ user.id, playlist ]);
        db.run('INSERT INTO UserQueue (userId, position, songId, playlistId, dateAdded) VALUES (?, ?, ?, ?, ?)',
          [
            user.id,
            1,
            song.id.videoId, 
            playlist,
            new Date()
          ]);
      }

      message.reply('I\'ve added the song to the top of your ' + playlistName + ' queue!');
    });

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
  });
};

var getQueuedSong = function(userId, callback) {
  db.serialize(function() {
    db.get('SELECT s.id AS id, s.type AS type, s.url AS url, s.artist AS artist, s.title AS title, s.metadata AS metadata FROM UserQueue q INNER JOIN Song s ON q.songId = s.id WHERE q.userId = ? AND q.position = 1 LIMIT 1',
      [ userId ], function(err, row) {
        callback(row);
      });
  })
};

var cycleQueue = function(userId) {
  db.serialize(function() {
    //db.run('DELETE FROM UserQueue WHERE userId = ? AND position = 1', [ userId ]);
    db.run('UPDATE UserQueue SET position = (SELECT count(*) + 1 FROM UserQueue WHERE userId = ?) WHERE userId = ? AND position = 1',
      [ userId, userId ]);

    db.run('UPDATE UserQueue SET position=position-1 WHERE userId = ?', [ userId ]);
  });
};

var getQueueLength = function(userid, callback) {
  db.serialize(function() {
    db.get('SELECT count(*) AS count FROM UserQueue WHERE userId = ?', [ userid ], function(err, row) {
      callback(row.count);
    });
  })
};

module.exports = {
  queueSong: queueSong,
  removeSong: removeSong,
  viewQueue: viewQueue,
  cycleQueue: cycleQueue,
  getQueuedSong: getQueuedSong,
  getQueueLength: getQueueLength
};

