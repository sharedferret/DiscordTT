const db = require(global.paths.lib + 'database-handler').db;
const uuid = require('uuid/v4');
const Discord = require('discord.js');

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
    db.get('SELECT * FROM User WHERE id = ?', [ user.id ], function(err, row) {
      // If no rows returned, create a new profile
      if (!row) {
        const row = {
          id: user.id,
          serverId: guildId,
          username: user.username,
          avatar: user.avatarURL,
          upvotes: 0,
          downvotes: 0,
          points: 0,
          lastActive: new Date(),
          metadata: null
        };
        createUser(user, guildId);
        callback.apply(this, [row]);
      } else {
        callback.apply(this, [row]);
      }
    });
  });
};

const createUser = function(user, guildId) {
  const defaultPlaylistId = uuid();

  // Add a new default playlist
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
      guildId,
      user.username,
      user.avatarURL,
      new Date(),
      null,
      defaultPlaylistId
    ]);

  return defaultPlaylistId;
}

module.exports = {
  updateProfileData: updateProfileData,
  getProfile: getProfile
};