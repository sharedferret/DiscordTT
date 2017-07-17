const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');

const closeDb = function() {
  db.close();
};

module.exports = {
  db: db,
  closeDb: closeDb
};
