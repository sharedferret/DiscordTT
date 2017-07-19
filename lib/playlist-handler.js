'use strict';

const db = require(global.paths.lib + 'database-handler').db;
const uuid = require('uuid/v4');
const Discord = require('discord.js');
const google = require('googleapis');
const youtube = google.youtube('v3');

const viewPlaylists = function(bot, message) {
  db.serialize(function() {
    db.all('select p.id AS playlistId, p.name AS playlistName, COUNT(q.id) as songCount, CASE WHEN p.id = u.activePlaylistId THEN \"true\" ELSE \"false\" END AS active FROM Playlist p LEFT JOIN UserQueue q ON p.id = q.playlistId LEFT JOIN User u ON p.userId = u.id WHERE u.id = ? GROUP BY p.id ORDER BY p.id ASC',
      [ message.author.id ],
      function(err, rows) {
        if (rows && rows.length > 0) {
          let description = '';

          for (const row of rows) {
            if (row.active === 'true') {
              description += '**';
            }

            description += row.playlistName;
            if (row.active === 'true') {
              description += '**';
            }

            description += ' (' + row.songCount + ' song' + (row.songCount == 1 ? '' : 's') + ')';
            description += ' [ID: `' + row.playlistId.substring(0, 4) + '`]\n';
          }

          const embed = new Discord.RichEmbed();

          embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);
          embed.setTimestamp(new Date());

          embed.setAuthor(message.author.username + '\'s Playlists', message.author.avatarURL);
          embed.setDescription(description);

          message.channel.send('', { embed: embed });
        }
      });
  });
};

const addPlaylist = function(bot, message, playlistName) {
  const newPlaylistId = uuid();

  db.serialize(function() {
    db.get('INSERT INTO Playlist (id, userId, name, metadata) VALUES (?, ?, ?, ?)',
      [
        newPlaylistId,
        message.author.id,
        playlistName,
        null
      ], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return message.reply(`you already have a playlist named **${playlistName}**. Please choose a different name.`);
          }

          console.warn(err);
          return message.reply('an error occurred while trying to create your playlist.');
        }
        
        message.reply(`your playlist **${playlistName}** (ID: \`` + (newPlaylistId.substring(0, 4) + '\`) has been created!'));
      });
  });
};

const switchPlaylist = function(bot, message, playlist) {
  db.serialize(function() {
    db.get('SELECT id, name FROM Playlist WHERE userId = ? AND name = ? OR id LIKE ?',
      [
        message.author.id,
        playlist, 
        playlist + '%'
      ], function(err, row) {
        if (err) {
          return console.warn(err);
        }

        if (!row) {
          return message.reply('I couldn\'t find a playlist by that name!');
        }

        // Make it active
        db.run('UPDATE User SET activePlaylistId = ? WHERE id = ?',
          [
            row.id,
            message.author.id
          ], function(err) {
            if (err) {
              return console.warn(err);
            }

            message.reply('your active playlist is now `' + row.name + '`.');
          });
      });
  });
};

const removePlaylist = function(bot, message, playlist) {
  // Get playlist ID for name
  db.serialize(function() {
    db.get('SELECT id, name FROM Playlist WHERE userId = ? AND name = ? OR id LIKE ?',
      [
        message.author.id,
        playlist,
        playlist + '%'
      ], function(err, row) {
        if (err) {
          return console.warn(err);
        }

        if (!row) {
          return message.reply('I couldn\'t find a playlist by that name!');
        }

        // Delete the playlist itself
        db.run('DELETE FROM Playlist WHERE id = ?', [ row.id ]);

        // Delete the playlist's queue entries
        db.run('DELETE FROM UserQueue WHERE playlistId = ?', [ row.id ]);

        // If it was the user's active playlist, null that row
        db.run('UPDATE User SET activePlaylistId = null WHERE id = ? AND activePlaylistId = ?',
          [
            message.author.id,
            row.id
          ]);

        message.reply('your playlist has been deleted.');
      });
  });
};

const addYoutubePlaylist = function(message, playlistId) {
  youtube.playlists.list({
    key: config.api.google,
    part: 'snippet',
    id: playlistId
  }, function(error, playlistResponse) {
    if (error) {
      console.warn('An error occurred while searching YouTube', error);
      return message.reply('I was unable to find the playlist you requested.');
    }

    youtube.playlistItems.list({
      key: config.api.google,
      part: 'snippet',
      maxResults: 50,
      playlistId: playlistId
    }, function(error, itemsResponse) {
      if (error) {
        console.warn('An error occurred while searching YouTube', error);
        return message.reply('I was unable to find the playlist you requested.');
      }

      db.serialize(function() {
        // Create a new playlist
        const playlistId = uuid();
        const playlistName = playlistResponse.items[0].snippet.title;

        db.get('INSERT INTO Playlist (id, userId, name, metadata) VALUES (?, ?, ?, ?)',
          [
            playlistId,
            message.author.id,
            playlistName,
            null
          ], function(err) {
            if (err) {
              if (err.code === 'SQLITE_CONSTRAINT') {
                return message.reply(`you already have a playlist named **${playlistName}**. Please choose a different name.`);
              }

              console.warn(err);
              return message.reply('an error occurred while trying to create your playlist.');
            }

            // Now, add the playlist's songs to the new playlist
            for (const i in itemsResponse.items) {
              const item = itemsResponse.items[i];
              db.run('INSERT INTO UserQueue (userId, position, songId, dateAdded, playlistId) VALUES (?, ?, ?, ?, ?)',
                [
                  message.author.id,
                  parseInt(i) + 1,
                  item.snippet.resourceId.videoId,
                  new Date(),
                  playlistId
                ]);

              // Insert/replace song data
              // Since Youtube is our only provider, we're using the Youtube ID as a unique PK
              // Replace since we want any updated metadata
              db.run('INSERT OR REPLACE INTO Song (id, type, url, title, metadata) VALUES (?, ?, ?, ?, ?)',
                [
                  item.snippet.resourceId.videoId,
                  'youtube',
                  'https://www.youtube.com/watch?v=' + item.snippet.resourceId.videoId,
                  item.snippet.title,
                  JSON.stringify(item)
                ]);
            }

            message.reply('your playlist **' + playlistName + '** has been created! Type `' + config.discriminator + 'pl select ' + playlistId.substring(0, 4) + '` to switch to it.');
        }); 
      });
    });
  });
};

module.exports = {
  viewPlaylists: viewPlaylists,
  switchPlaylist: switchPlaylist,
  addPlaylist: addPlaylist,
  removePlaylist: removePlaylist,
  addYoutubePlaylist: addYoutubePlaylist
};