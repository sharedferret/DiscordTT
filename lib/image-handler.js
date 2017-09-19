const db = require(global.paths.lib + 'database-client').db;

// Image command name arrays, grouped by guildId
// Global image commands are under "global"
const guildImageCommands = {};

const loadImageCommandsFromDb = () => {
  db.all('SELECT guildId, name FROM ImageCommand GROUP BY name', (err, rows) => {
    log.debug('Retrieved rows', rows);
    for (const row of rows) {
      if (!guildImageCommands[row.guildId]) {
        guildImageCommands[row.guildId] = [];
      }

      guildImageCommands[row.guildId].push(row.name);
    }
  });
}

const getImageCommand = (input, guildId) => {
  if (guildImageCommands.global && guildImageCommands.global.indexOf(input) !== -1) {
    // Matched global command, fetch definition from db and return
    const promise = fetchImageFromDb('global', input);
    return promise;
  } else if (guildImageCommands[guildId] && guildImageCommands[guildId].indexOf(input) !== -1) {
    // Matched guild command, fetch definition from db and return
    const promise = fetchImageFromDb(guildId, input);
    return promise;
  }

  return false;
}

const fetchImageFromDb = (guildId, name) => {
  const promise = new Promise((resolve, reject) => {
    db.all('SELECT url FROM ImageCommand WHERE guildId = ? AND name = ?',
    [
      guildId,
      name
    ], (err, rows) => {
      if (err) return reject(err);

      const urls = rows.map(i => { return i.url; });

      // randomly pick an entry and return it
      resolve(_.sample(urls));
    });
  });

  return promise;
}

const addImageCommand = () => {

}

const removeImageCommand = () => {

}

module.exports = {
  loadImageCommandsFromDb: loadImageCommandsFromDb,
  getImageCommand: getImageCommand,
  addImageCommand: addImageCommand,
  removeImageCommand: removeImageCommand
};