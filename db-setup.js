// Sets up DB tables
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('db.sqlite3');

db.serialize(function() {
    console.log('- Creating Song');
  db.run('CREATE TABLE IF NOT EXISTS Song (' +
    'id TEXT PRIMARY KEY NOT NULL,' +
    'type TEXT NOT NULL,' +
    'url TEXT NOT NULL,' +
    'artist TEXT,' +
    'title TEXT NOT NULL,' +
    'metadata TEXT)');

  console.log('- Creating Server');
  db.run('CREATE TABLE IF NOT EXISTS Server (' +
    'id TEXT PRIMARY KEY, ' +
    'settings TEXT)');

  console.log('- Creating User');
  db.run('CREATE TABLE IF NOT EXISTS User (' +
    'id TEXT PRIMARY KEY NOT NULL,' +
    'serverId TEXT NOT NULL, ' +
    'username TEXT, ' +
    'avatar TEXT, ' +
    'upvotes INTEGER DEFAULT 0 NOT NULL, ' +
    'downvotes INTEGER DEFAULT 0 NOT NULL, ' +
    'points INTEGER DEFAULT 0 NOT NULL, ' +
    'lastActive DATETIME, ' +
    'metadata TEXT, ' +
    'activePlaylistId TEXT)');

  console.log('- Creating UserQueue');
  db.run('CREATE TABLE IF NOT EXISTS UserQueue (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'userId TEXT, ' +
    'position INTEGER NOT NULL, ' +
    'songId TEXT NOT NULL,' +
    'dateAdded DATETIME,' +
    'playlistId TEXT)');

  console.log('- Creating SongHistory');
  db.run('CREATE TABLE IF NOT EXISTS SongHistory (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'serverId TEXT NOT NULL, ' +
    'djid TEXT NOT NULL, ' +
    'songId TEXT NOT NULL, ' +
    'time DATETIME, ' +
    'upvotes INTEGER DEFAULT 0, ' +
    'downvotes INTEGER DEFAULT 0)');

  console.log('- Creating Playlist');
  db.run('CREATE TABLE IF NOT EXISTS Playlist (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'userId TEXT NOT NULL, ' +
    'name TEXT, ' +
    'metadata TEXT)');
});

db.close();
