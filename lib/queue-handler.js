'use strict';

const db = require(global.paths.lib + 'database-client').db;
const uuid = require('uuid/v4');
const userHandler = require(global.paths.lib + 'user-handler');

const getQueue = function(userId, page) {
  const promise = new Promise((resolve, reject) => {
    const startPosition = (page - 1) * 10;
    db.serialize(function() {
      db.get('SELECT count(*) AS songCount FROM UserQueue q LEFT JOIN User u ON u.id = q.userId WHERE q.userId = ? AND q.playlistId = u.activePlaylistId', 
        [ userId ],
        function(err, songCountRow) {
          if (err) return reject(err);

          db.all('SELECT p.name AS playlist, q.position AS position, s.id AS id, s.type AS type, s.url AS url, s.artist AS artist, s.title AS title, s.metadata AS metadata FROM UserQueue q LEFT JOIN Song s ON q.songId = s.id LEFT JOIN User u ON u.id = q.userId LEFT JOIN Playlist p ON q.userId = p.userId WHERE q.userId = ? AND q.playlistId = u.activePlaylistId AND q.playlistId = p.id AND q.position > ? ORDER BY q.position LIMIT 10',
            [ userId, startPosition ], 
            function(error, rows) {
              if (error) return reject(error);

              resolve({
                playlistName: rows[0] ? rows[0].playlist : null,
                songCount: songCountRow.songCount,
                songs: rows
              });
          });
      });
    });
  });

  return promise;
};

const removeSong = function(bot, message, queuePosition) {
  if (queuePosition < 1) {
    return message.reply('please provide a valid queue position.');
  }

  db.serialize(function() {
    db.get('SELECT s.title AS title, u.activePlaylistId AS playlistId FROM UserQueue q INNER JOIN Song s ON q.songId = s.id INNER JOIN User u ON u.id = q.userId WHERE q.userId = ? AND q.position = ? AND q.playlistId = u.activePlaylistId',
      [
        message.author.id,
        queuePosition
      ],
      function(getErr, row) {
        if (getErr || !row) {
          return message.reply('please provide a valid queue position.');
        }

        db.run('DELETE FROM UserQueue WHERE userId = ? AND position = ? AND playlistId = ?', 
          [
            message.author.id,
            queuePosition,
            row.playlistId
          ], function(runErr) {
            if (!runErr) {
              db.run('UPDATE UserQueue SET position=position-1 WHERE userId = ? AND position > ? AND playlistId = ?',
                [
                  message.author.id,
                  queuePosition,
                  row.playlistId
                ]);

              message.reply('_' + row.title + '_ was removed from your queue.');
            }
        }); 
    }); 
  });
};

const queueSong = function(bot, message, song) {
  const user = message.author;
  const videoId = song.id.videoId ? song.id.videoId : song.id;

  db.serialize(function() {
    // Get User object from DB
    db.get('SELECT p.name AS name, u.activePlaylistId AS activePlaylistId FROM Playlist p LEFT JOIN User u ON p.userId = u.id WHERE u.id = ? AND u.activePlaylistId = p.id', [ user.id ], function(err, row) {
      let playlistName = 'Default';

      if (!row) {
        log.info('creating user');

        const defaultPlaylistId = userHandler.createUser(message.user, message.guild ? message.guild.id : null);

        db.run('INSERT INTO UserQueue (userId, position, songId, playlistId, dateAdded) VALUES (?, ?, ?, ?, ?)',
          [
            user.id,
            1,
            videoId,
            defaultPlaylistId,
            new Date()
          ]);
      } else {
        // Backfill: create a default playlist if one doesn't exist
        let playlist = row.activePlaylistId;
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
            user.avatarURL(256),
            new Date(),
            user.id
          ]);

        db.get('SELECT COUNT(*) AS count FROM UserQueue WHERE userId = ? AND playlistId = ?', (err, queueCount) => {
          if (queueCount.count > 100) { return message.reply('this playlist is full. Please select another playlist.'); }

          // Insert into this user's queue at position 1, shift all other playlist entries down one
          db.serialize(() => {
            db.run('UPDATE UserQueue SET position=position+1 WHERE userId = ? AND playlistId = ?', [ user.id, playlist ]);
            db.run('INSERT INTO UserQueue (userId, position, songId, playlistId, dateAdded) VALUES (?, ?, ?, ?, ?)',
              [
                user.id,
                1,
                videoId, 
                playlist,
                new Date()
              ]);
            });          
        });
      }

      message.reply('I\'ve added the song to the top of your ' + playlistName + ' queue!');
    });

    // Insert/replace song data
    // Since Youtube is our only provider, we're using the Youtube ID as a unique PK
    // Replace since we want any updated metadata
    db.run('INSERT OR REPLACE INTO Song (id, type, url, title, metadata) VALUES (?, ?, ?, ?, ?)',
      [
        videoId,
        'youtube',
        'https://www.youtube.com/watch?v=' + videoId,
        song.snippet.title,
        JSON.stringify(song)
      ]);
  });
};

const getQueuedSong = (userId) => {
  const promise = new Promise((resolve, reject) => {
    db.get('SELECT s.id AS id, s.type AS type, s.url AS url, s.artist AS artist, s.title AS title, s.metadata AS metadata FROM UserQueue q INNER JOIN Song s ON q.songId = s.id INNER JOIN User u ON q.userId = u.id WHERE q.userId = ? AND u.activePlaylistId = q.playlistId AND q.position = 1 LIMIT 1',
      [ userId ], function(err, row) {
      if (err) return reject(err);
      resolve(row);
    });
  });

  return promise;
};

const cycleQueue = function(userId) {
  db.serialize(function() {
    db.get('SELECT activePlaylistId FROM User u WHERE id = ?', [ userId ], function(err, row) {
      db.serialize(function() {
        db.run('UPDATE UserQueue SET position = (SELECT count(*) + 1 FROM UserQueue WHERE userId = ? AND playlistId = ?) WHERE userId = ? AND playlistId = ? AND position = 1',
          [ userId, row.activePlaylistId, userId, row.activePlaylistId ]);

        db.run('UPDATE UserQueue SET position=position-1 WHERE userId = ? AND playlistId = ?', [ userId, row.activePlaylistId ]);
      });
    });
  });
};

const getQueueLength = (userid) => {
  const promise = new Promise((resolve, reject) => {
    db.get('SELECT count(*) AS count FROM UserQueue q INNER JOIN User u ON u.id = q.userId WHERE userId = ? AND q.playlistId = u.activePlaylistId', [ userid ], function(err, row) {
      if (err) return reject(err);
      resolve(row.count);
    });
  });

  return promise;
};

module.exports = {
  queueSong: queueSong,
  removeSong: removeSong,
  getQueue: getQueue,
  cycleQueue: cycleQueue,
  getQueuedSong: getQueuedSong,
  getQueueLength: getQueueLength
};

