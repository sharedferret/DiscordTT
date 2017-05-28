var connection;
var ytdl = require('ytdl-core');
var activeDispatcher;

// Holds the current state of the player, including the current song and any
// active connections or dispatchers.
var state = {};

var ytOpts = {
  quality: 'lowest',
  filter: 'audioonly',
  retries: 2
};

var setState = function(state) {
  this.state = state;
}

var handleConnect = function(url, connection) {
  console.log('in promise resolve');
  this.connection = connection;
  this.playStream(url);
}

var closeVoiceChannel = function(bot, serverId) {
  console.log('trashing channel');
  this.activeDispatcher.end();

  this.connection.disconnect();
  this.connection = null;
  this.activeDispatcher = null;
};

var endSongHandler = function() {
  
};

var playStream = function(url) {
  // Actually plays a new song - hook here for newSong events

  if (this.connection && !this.activeDispatcher) {
    var stream = ytdl(url, ytOpts);
    this.activeDispatcher = this.connection.playStream(stream, { seek: 0, volume: 0.55 });

    // The dispatcher end event marks the end of a song - hook here for endSong events
    // TODO: The voice connection should only be closed when no songs are left
    this.activeDispatcher.once('end', this.closeVoiceChannel.bind(this));
  }
};

var skipSong = function() {
  if (this.activeDispatcher) {
    this.activeDispatcher.end();
  }
};

var playSong = function(bot, voiceChannel, url) {
  if (!connection) {
    var promise = voiceChannel.join();
    promise.then(this.handleConnect.bind(this, url));
  } else {
    this.playStream(bot, url);
  }
};

module.exports = {
  closeVoiceChannel: closeVoiceChannel,
  playStream: playStream,
  playSong: playSong,
  skipSong: skipSong,
  handleConnect: handleConnect,
  setState: setState
};
