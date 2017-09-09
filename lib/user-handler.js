const db = require(global.paths.lib + 'database-client').db;
const uuid = require('uuid/v4');

// updates is an object keyed by the absolute path in the metadata object to update
// e.g. { 'location.country': 'gb' } will update the location.country key in the
// metadata object for the user
const updateProfileData = function(userId, updates) {
  db.serialize(function() {
    db.get('SELECT metadata FROM User WHERE id=?', [ userId ], function(err, row) {
      let metadata = JSON.parse(row.metadata);

      if (!metadata) {
        metadata = {};
      }

      for (const update in updates) {
        _.set(metadata, update, updates[update]);
      }

      db.run('UPDATE User SET metadata = ? WHERE id = ?', [ JSON.stringify(metadata), userId ]);
    });
  });
};

const getProfile = function(user, guildId, callback) {
  db.serialize(function() {
    db.get('SELECT * FROM User u LEFT JOIN UserPoints p ON u.id = p.userId WHERE u.id = ?', [ user.id ], function(err, row) {
      // If no rows returned, create a new profile
      if (!row) {
        const row = {
          id: user.id,
          serverId: guildId,
          username: user.username,
          avatar: user.avatarURL(256),
          upvotes: 0,
          downvotes: 0,
          currency: 0,
          points: 0,
          userPoints: {
            chatMessage: 0,
            botCommand: 0,
            songPlay: 0,
            songVote: 0,
            songPointEarned: 0
          },
          lastActive: new Date(),
          metadata: null
        };
        createUser(user, guildId);
        callback.apply(this, [row]);
      } else {
        const profile = {
          id: row.id,
          serverId: row.serverId,
          username: row.username,
          avatar: row.avatar,
          upvotes: row.upvotes,
          downvotes: row.downvotes,
          points: row.points,
          lastActive: row.lastActive,
          metadata: row.metadata,
          userPoints: {
            chatMessage: row.chatMessage,
            botCommand: row.botCommand,
            songPlay: row.songPlay,
            songVote: row.songVote,
            songPointEarned: row.songPointEarned
          }
        };

        callback.apply(this, [profile]);
      }
    });
  });
};

const createUser = function(user, guildId) {
  const defaultPlaylistId = uuid();

  // Add a new default playlist
  db.run('INSERT OR IGNORE INTO Playlist (id, userId, name, metadata) VALUES (?, ?, ?, ?)',
    [
      defaultPlaylistId,
      user.id,
      'Default',
      null
    ]);

  // Create a new entry for User
  db.run('INSERT OR IGNORE INTO User (id, serverId, username, avatar, upvotes, downvotes, points, lastActive, metadata, activePlaylistId) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?)',
    [
      user.id,
      guildId,
      user.username,
      user.avatarURL(256),
      new Date(),
      null,
      defaultPlaylistId
    ]);
  
  // Create a new entry for UserPoints
  db.run('INSERT OR IGNORE INTO UserPoints (userId) VALUES (?)', [ user.id ]);

  return defaultPlaylistId;
};

const addPoints = function(userId, updates) {
  db.run('UPDATE UserPoints SET chatMessage=chatMessage+?, botCommand=botCommand+?, songPlay=songPlay+?, songVote=songVote+?, songPointEarned=songPointEarned+? WHERE userId = ?',
  [
    updates.chatMessage ? updates.chatMessage : 0,
    updates.botCommand ? updates.botCommand : 0,
    updates.songPlay ? updates.songPlay : 0,
    updates.songVote ? updates.songVote : 0,
    updates.songPointEarned ? updates.songPointEarned : 0,
    userId
  ]);
};

module.exports = {
  updateProfileData: updateProfileData,
  getProfile: getProfile,
  createUser: createUser,
  addPoints: addPoints
};