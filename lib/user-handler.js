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

const getProfile = function(userId, callback) {
  db.serialize(function() {
    db.get('SELECT * FROM User WHERE id = ?', [ userId ], function(err, row) {
      console.log('row', row);
      callback.apply(this, [row]);
    });
  });
};

module.exports = {
  updateProfileData: updateProfileData,
  getProfile: getProfile
};