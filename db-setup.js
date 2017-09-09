'use strict';

// Sets up DB tables
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');

db.serialize(function() {
  log.info('- Creating Song');
  db.run('CREATE TABLE IF NOT EXISTS Song (' +
    'id TEXT PRIMARY KEY NOT NULL,' +
    'type TEXT NOT NULL,' +
    'url TEXT NOT NULL,' +
    'artist TEXT,' +
    'title TEXT NOT NULL,' +
    'metadata TEXT)');

  log.info('- Creating Server');
  db.run('CREATE TABLE IF NOT EXISTS Server (' +
    'id TEXT PRIMARY KEY, ' +
    'settings TEXT)');

  log.info('- Creating User');
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

  log.info('- Creating UserQueue');
  db.run('CREATE TABLE IF NOT EXISTS UserQueue (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'userId TEXT, ' +
    'position INTEGER NOT NULL, ' +
    'songId TEXT NOT NULL,' +
    'dateAdded DATETIME,' +
    'playlistId TEXT)');

  log.info('- Creating SongHistory');
  db.run('CREATE TABLE IF NOT EXISTS SongHistory (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'serverId TEXT NOT NULL, ' +
    'djid TEXT NOT NULL, ' +
    'songId TEXT NOT NULL, ' +
    'time DATETIME, ' +
    'upvotes INTEGER DEFAULT 0, ' +
    'downvotes INTEGER DEFAULT 0)');

  log.info('- Creating Playlist');
  db.run('CREATE TABLE IF NOT EXISTS Playlist (' +
    'id TEXT PRIMARY KEY, ' +
    'userId TEXT NOT NULL, ' +
    'name TEXT, ' +
    'metadata TEXT, ' +
    'UNIQUE(userId, name))');

  log.info('- Creating UserPoints');
  db.run('CREATE TABLE IF NOT EXISTS UserPoints(' +
    'userId TEXT PRIMARY KEY, '
    + 'chatMessage INTEGER NOT NULL DEFAULT 0, ' +
    'botCommand INTEGER NOT NULL DEFAULT 0, ' +
    'songPlay INTEGER NOT NULL DEFAULT 0, ' +
    'songVote INTEGER NOT NULL DEFAULT 0, ' +
    'songPointEarned INTEGER NOT NULL DEFAULT 0)');
  
  log.info('- Creating CommandUsage');
  db.run('CREATE TABLE IF NOT EXISTS CommandUsage(' +
    'commandName TEXT NOT NULL, ' +
    'guildId TEXT NOT NULL, ' +
    'date DATETIME NOT NULL, ' +
    'count INTEGER NOT NULL DEFAULT 1, ' +
    'PRIMARY KEY(commandName, guildId, date))');
});

db.close();
