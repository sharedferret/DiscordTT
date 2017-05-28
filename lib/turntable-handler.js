var connection;
var ytdl = require('ytdl-core');
var activeDispatcher;

// Holds the current state of the player, including the current song and any
// active connections or dispatchers.
var state = {
  nowPlaying: null,
  upvotes: 0,
  downvotes: 0,
  currentDj: null,
  djs: [],
  waitingDjs: []
};

var ytOpts = {
  quality: 'lowest',
  filter: 'audioonly',
  retries: 2
};

var setState = function(state) {
  this.state = state;
}

var handleConnect = function(bot, message, nowPlaying, url, connection) {
  console.log('in promise resolve');
  this.connection = connection;

  this.playStream(bot, message, nowPlaying, url);
}

var closeVoiceChannel = function(bot, serverId) {
  console.log('trashing channel');
  this.activeDispatcher.end();

  this.connection.disconnect();
  this.connection = null;
  this.activeDispatcher = null;
};

var endSongHandler = function(bot, message, nowPlaying, url) {
  nowPlaying.channel.send('finished playing ' + nowPlaying.embeds[0].description);
  console.log(nowPlaying.reactions);
  this.closeVoiceChannel();
};

var playStream = function(bot, message, nowPlaying, url) {
  // Actually plays a new song - hook here for newSong events
  console.log('attempting to play stream, url', url);

  if (this.connection && !this.activeDispatcher) {
    console.log('loading yt stream');
    var stream = ytdl(url, ytOpts);
    this.activeDispatcher = this.connection.playStream(stream, { seek: 0, volume: 0.55 });

    // The dispatcher end event marks the end of a song - hook here for endSong events
    // TODO: The voice connection should only be closed when no songs are left
    this.activeDispatcher.once('end', this.endSongHandler.bind(this, bot, message, nowPlaying, url));
  }
};

var skipSong = function() {
  if (this.activeDispatcher) {
    this.activeDispatcher.end();
  }
};

var playSong = function(bot, message, nowPlaying, url) {
  if (!connection) {
    var promise = message.member.voiceChannel.join();
    promise.then(this.handleConnect.bind(this, bot, message, nowPlaying, url));
  } else {
    this.playStream(bot, message, nowPlaying, url);
  }
};

module.exports = {
  closeVoiceChannel: closeVoiceChannel,
  endSongHandler: endSongHandler,
  playStream: playStream,
  playSong: playSong,
  skipSong: skipSong,
  handleConnect: handleConnect,
  setState: setState
};
