var connection;
var ytdl = require('ytdl-core');
var activeDispatcher;

var ytOpts = {
  quality: 'lowest',
  filter: 'audioonly',
  retries: 2
};

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

var playStream = function(url) {
  if (this.connection && !this.activeDispatcher) {
    var stream = ytdl(url, ytOpts);
    this.activeDispatcher = this.connection.playStream(stream, { seek: 0, volume: 0.4 });

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
  handleConnect: handleConnect
};
