const db = require(global.paths.lib + 'database-client').db;
const requestImageSize = require('request-image-size');
const uuid = require('uuid/v4');

const supportedTypes = ['bmp', 'gif', 'jpg', 'jpeg', 'png'];

// Image command name arrays, grouped by guildId
// Global image commands are under "global"
const guildImageCommands = {};

const loadImageCommandsFromDb = () => {
  db.all('SELECT guildId, name FROM ImageCommand GROUP BY name', (err, rows) => {
    log.debug('Retrieved rows', rows);
    if (rows) {
      for (const row of rows) {
        if (!guildImageCommands[row.guildId]) {
          guildImageCommands[row.guildId] = [];
        }
  
        guildImageCommands[row.guildId].push(row.name);
      }
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

const addImageCommand = (message, guildId, userId, name, url) => {
  // Sanity check
  if (!name || name.length == 0 || !url || url.length == 0) {
    return message.reply('please provide the image command\'s name and URL.');
  }

  // Check that the provided URL links to an image
  // Note: Since we're not caching the image locally, it's possible that
  // the image will cease to exist or be replaced in the future. This is
  // not an exhaustive check
  requestImageSize(url)
    .then(size => {
      log.debug(size);

      if (supportedTypes.indexOf(size.type) == -1) {
        return message.reply('that doesn\'t look like an image URL. Please check the URL and try again.');
      }
      
      const id = uuid();

      // Insert this row into the db
      // TODO: If the requested command name clashes with a global command
      // or image command, the global command will take priority. If a user
      // attempts to override a global command, this should error out.
      // TODO: For auditing purposes, log the user that added this command.
      db.run('INSERT INTO ImageCommand (id, guildId, name, url, timestamp) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          guildId,
          name,
          url,
          new Date()
        ], err => {
          // On success, notify and add to local command cache
          if (!guildImageCommands[guildId]) {
            guildImageCommands[guildId] = [];
          }
    
          guildImageCommands[guildId].push(name);

          log.debug('image cmds', guildImageCommands[guildId]);

          message.reply('image command added.');
        });
    })
    .catch(error => {
      message.reply('that doesn\'t look like an image URL. Please check the URL and try again.');
    })
}

const removeImageCommand = (message, guildId, userId, name) => {
  if (!name || name.length == 0) {
    return message.reply('please provide the name of the image command to delete.');
  }
  db.run('DELETE FROM ImageCommand WHERE guildId = ? AND name = ?', [guildId, name]);

  if (guildImageCommands[guildId].indexOf(name) > -1) {
    guildImageCommands[guildId].splice(guildImageCommands[guildId].indexOf(name), 1);
  }

  message.reply('command deleted.');
}

const removeImageFromCommand = () => {

}

module.exports = {
  loadImageCommandsFromDb: loadImageCommandsFromDb,
  getImageCommand: getImageCommand,
  addImageCommand: addImageCommand,
  removeImageCommand: removeImageCommand,
  removeImageFromCommand: removeImageFromCommand
};