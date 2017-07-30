const serverSettings = {};
const db = require(global.paths.lib + 'database-client').db;

const baseSettings = {
  announcements: {
    userJoin: {
      enabled: false
    },
    userLeave: {
      enabled: false
    }
  },
  autorole: {
    enabled: false
  },
  disabledCommands: {
    commands: {},
    groups: {},
    channels: []
  },
  localization: {
    locale: 'en_US'
  },
  logs: {
    enabled: false
  },
  prefix: {
    custom: null,
    useDefault: true
  },
  premium: false,
  ttPlugin: {
    enabled: true,
    youtubeQuality: 'lowest'
  },
  weather: {
    enabled: true,
    source: 'OpenWeatherMap'
  }
};

const registerServer = function(serverId) {
  console.log('- Registering server ' + serverId);

  db.run('INSERT OR IGNORE INTO Server (id, settings) VALUES (?, ?)',
    [ serverId, JSON.stringify(baseSettings) ]);
};

const loadSettings = function(serverId) {
  db.get('SELECT * FROM Server WHERE id = ?', [ serverId ], function(err, row) {
    if (err) return console.warn(err);

    if (row) {
      try {
        serverSettings[serverId] = JSON.parse(row.settings);
      } catch (e) {
        return console.warn(e);
      }
    } else {
      serverSettings[serverId] = baseSettings;
    }
  })
}

const getSettings = function(serverId) {
  if (serverSettings[serverId]) {
    return serverSettings[serverId];
  }
}

const updateSettings = function(message, serverId, updates) {
  console.log('Attempting to apply update', updates);
  db.serialize(function() {
    db.get('SELECT settings FROM Server WHERE id = ?', [ serverId ], function(err, row) {
      let settings = JSON.parse(row.settings);

      if (!settings) {
        settings = {};
      }

      for (const update in updates) {
        if (update === undefined) {
          _.unset(settings, update);

        } else {
          _.set(settings, update, updates[update]);
        }
        
      }

      // Update local cache
      serverSettings[serverId] = settings;

      db.run('UPDATE Server SET settings = ? WHERE id = ?', [ JSON.stringify(settings), serverId ]);
    });
  });
}

module.exports = {
  registerServer: registerServer,
  loadSettings: loadSettings,
  getSettings: getSettings,
  updateSettings: updateSettings
}
