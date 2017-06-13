const serverSettings = {};
const db = require(global.paths.lib + 'database-handler').db;

const baseSettings = {
  youtube: {
    enabled: false,
    quality: 'lowest'
  },
  premium: false
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

const updateSettings = function(bot, serverId, settings) {
  // TODO implement
}

module.exports = {
  registerServer: registerServer,
  loadSettings: loadSettings,
  getSettings: getSettings,
  updateSettings: updateSettings
}
