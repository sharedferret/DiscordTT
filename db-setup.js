// Sets up DB tables
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('db.sqlite3');

db.serialize(function() {
  db.run('CREATE TABLE IF NOT EXISTS Song (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'type TEXT,' +
    'url TEXT,' +
    'artist TEXT,' +
    'title TEXT)');

  db.run('CREATE TABLE IF NOT EXISTS Server (id TEXT PRIMARY KEY)');

  db.run('CREATE TABLE IF NOT EXISTS User (id TEXT PRIMARY KEY,' +
    'serverId TEXT, upvotes INTEGER, downvotes INTEGER, points INTEGER, lastActive DATETIME)');

  db.run('CREATE TABLE IF NOT EXISTS UserQueue (userId TEXT PRIMARY KEY, position INTEGER, songId INTEGER)');

  db.run('CREATE TABLE IF NOT EXISTS SongHistory (serverId TEXT, djid TEXT, songId INTEGER, time DATETIME, upvotes INTEGER, downvotes INTEGER)');
});

db.close();
