var connection;
var ytdl = require('ytdl-core');
var activeDispatcher;

var queueHandler = require(global.paths.lib + 'queue-handler');
var Discord = require('discord.js');

var db = require(global.paths.lib + 'database-handler').db;

// Holds the current state of the player, including the current song and any
// active connections or dispatchers.
var state = {
  textChannel: null,
  voiceChannel: null,
  nowPlaying: null,
  upvotes: 0,
  downvotes: 0,
  currentDj: 0,
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
};

var getState = function() {
  return this.state;
};

var closeVoiceChannel = function(bot, serverId) {
  console.log('trashing channel');
  if (this.activeDispatcher) {
    this.activeDispatcher.end();
  }
  
  if (this.connection) {
    this.connection.disconnect();
  }
  
  this.connection = null;
  this.activeDispatcher = null;
};

var skipSong = function() {
  if (this.activeDispatcher) {
    this.activeDispatcher.end();
  }
};

var getVotesForSong = function(bot) {
  if (this.state && this.state.botMessage) {
    var upvoteUsers = this.state.botMessage.reactions.get('%F0%9F%91%8D').users.keyArray();
    var downvoteUsers = this.state.botMessage.reactions.get('%F0%9F%91%8E').users.keyArray();

    _.remove(upvoteUsers, function(i) { return i == bot.user.id; });
    _.remove(downvoteUsers, function(i) { return i == bot.user.id; });

    this.state.upvotes = upvoteUsers.length;
    this.state.downvotes = downvoteUsers.length;
  }
};

var addSongHistory = function(bot, user, song, guildId, upvotes, downvotes) {
  db.serialize(function() {
    db.run('INSERT INTO SongHistory (serverId, djid, songId, time, upvotes, downvotes) VALUES (?, ?, ?, ?, ?, ?)',
      [
        guildId,
        user.id,
        song.id,
        new Date(),
        upvotes,
        downvotes
      ]);

    // Points earned
    var points = upvotes - downvotes;
    if (points < 0) points = 0;

    db.run('UPDATE User SET points=points+? WHERE id=?',
      [
        points,
        user.id
      ]);
  });
};

var endSongHandler = function(bot, user, song, guildId) {
  console.log('in endsonghandler');

  this.activeDispatcher = null;

  if (this.state == null) {
    return this.closeVoiceChannel();
  }

  // Increase user's songs played
  this.state.djs[state.currentDj].songsPlayed += 1;

  this.getVotesForSong(bot);

  // Write out song history
  this.addSongHistory(bot, user, song, guildId, this.state.upvotes, this.state.downvotes);

  // Update original Now Playing message with final vote tally
  // TODO: "Now Playing" creation needs to be pulled out to its own function
  var songMetadata = JSON.parse(song.metadata);

  // Stuff from play and playStream - start song stream, send Now Playing message
  // Send back a Now Playing message
  var embed = new Discord.RichEmbed();

  embed.setThumbnail(songMetadata.snippet.thumbnails.medium.url);
  embed.setFooter('Queued by DJ ' + user.username, user.avatarURL);
  embed.setTimestamp(new Date());
  embed.setAuthor(user.username, user.avatarURL);
  embed.setTitle('Now Playing');
  embed.setDescription(song.title);
  embed.addField('Votes', '**' + this.state.upvotes + '**👍  **' + this.state.downvotes + '**👎');

  this.state.botMessage.edit('', { embed: embed });

  // Advance to next DJ
  this.advanceDJs(bot);

  console.log('next dj slot', this.state.currentDj);

  if (this.state.djs[this.state.currentDj]) {
    this.playNextSong(bot, this.state.djs[this.state.currentDj].id);
  } else {
    // No more DJs, clean up TT plugin
    this.state = null;
    this.closeVoiceChannel();
  }
};

var advanceDJs = function(bot) {
  var next = this.state.currentDj + 1;

  if (this.state.removeCurrentDj) {
    this.state.removeCurrentDj = false;
    this.state.djs.splice(this.state.currentDj, 1);
    next = this.state.currentDj;
  }

  if (next >= config.turntable.djs || next >= this.state.djs.length) {
    next = 0;
  }

  console.log('Setting next DJ to ' + next);

  if (state.djs[next]) {
    this.state.currentDj = next;
  } else {
    // If no DJs left, close voice channel
    this.state.currentDj = 0;
    this.closeVoiceChannel();
  }
}

var playStream = function(bot, user, song, songMetadata, nowPlaying) {
  // Invoke song player
  console.log('attempting to play stream, url', song.url);

  this.state.nowPlaying = song;
  this.state.botMessage = nowPlaying;

  if (this.connection && !this.activeDispatcher) {
    console.log('loading yt stream');
    var stream = ytdl(song.url, ytOpts);
    this.activeDispatcher = this.connection.playStream(stream, { seek: 0, volume: 0.55 });

    // The dispatcher end event marks the end of a song - hook here for endSong events
    // TODO: The voice connection should only be closed when no songs are left
    this.activeDispatcher.once('end', this.endSongHandler.bind(this, bot, user, song, nowPlaying.guild.id));

    // Cycle current DJ's playlist
    this.queueHandler.cycleQueue(user.id);
  }

  var upvotePromise = nowPlaying.react('👍');
  upvotePromise.then(function(messageReaction) {
    messageReaction.message.react('👎');
  });
};

var playSong = function(bot, song, user) {
  var songMetadata = JSON.parse(song.metadata);

  // Stuff from play and playStream - start song stream, send Now Playing message
  // Send back a Now Playing message
  var embed = new Discord.RichEmbed();

  embed.setThumbnail(songMetadata.snippet.thumbnails.medium.url);
  embed.setFooter('Queued by DJ ' + user.username, user.avatarURL);
  embed.setTimestamp(new Date());
  embed.setAuthor(user.username, user.avatarURL);
  embed.setTitle('Now Playing');
  embed.setDescription(song.title);

  var promise = this.state.textChannel.send('', { embed: embed });
  promise.then(this.playStream.bind(this, bot, user, song, songMetadata));
};

var fetchUser = function(bot, userid, song) {
  // TODO: If song is empty, kick the current DJ and advance to the next one
  if (!song) {
    var djIndex = _.findIndex(this.state.djs, function(i) { return i.id == userid; });
    this.state.djs.splice(djIndex, 1);

    if (this.state.djs[this.state.currentDj]) {
      this.playNextSong(bot, this.state.djs[this.state.currentDj].id);
    } else {
      // If no DJs left, close voice channel
      this.state.currentDj = 0;
      this.closeVoiceChannel();
    }
  }

  // Grab a new reference to the user
  console.log('Fetching user with ID ', userid);
  var userPromise = bot.fetchUser(userid);
  userPromise.then(this.playSong.bind(this, bot, song));
};

var handleConnect = function(bot, message, connection) {
  console.log('in promise resolve');
  this.connection = connection;

  this.playNextSong(bot, message.author.id);
}

var playNextSong = function(bot, userId) {
  // Make sure people are actually in the VC


  // Retrieve song data from DB for the current DJ
  this.queueHandler.getQueuedSong(userId, this.fetchUser.bind(this, bot, userId));
}

var addDj = function(bot, message) {
  if (this.state && (_.findIndex(this.state.djs, function(i) { return i.id == message.author.id; }) > -1 ||
    _.findIndex(this.state.waitingDjs, function(i) { return i.id == message.author.id; }) > -1)) {
    return message.reply('you\'re already DJing!');
  }

  // Verify the user actually has songs in their queue
  this.queueHandler.getQueueLength(message.author.id, this.addDjHelper.bind(this, bot, message));
};

var addDjHelper = function(bot, message, songCount) {
  if (songCount > 0) {
    if (this.state == null) {
      this.state = {
        textChannel: null,
        voiceChannel: null,
        nowPlaying: null,
        upvotes: 0,
        downvotes: 0,
        currentDj: 0,
        removeCurrentDj: false,
        djs: [],
        waitingDjs: []
      };
    }

    // If there's room, immediately step up
    console.log('Entering addDj');
    if (this.state.djs.length < config.turntable.djs) {
      var position = this.state.djs.length;
      console.log('entering at position', position);
      this.state.djs[position] = message.author;
      this.state.djs[position].songsPlayed = 0;

      message.reply('you\'ve been added to the DJ booth.');

      // If no one's playing, start playing from the new DJ's queue
      if (this.state.djs.length == 1) {
        this.state.currentDj = position;

        // Connect to VC
        if (!this.connection) {
          this.state.voiceChannel = message.member.voiceChannel;
          this.state.textChannel = message.channel;

          var promise = message.member.voiceChannel.join();
          promise.then(this.handleConnect.bind(this, bot, message));
        } else {
          this.playNextSong(bot, message.author.id);
        }
      }
    } else {
      console.log('adding to waiting list');
      this.state.waitingDjs.push(message.author);
      message.reply('you\'ve been added to the waiting list.');
    }
  } else {
    message.reply('you have no songs in your queue. Add one by typing `/q+ [song name]`!');
  }
};

var removeDj = function(bot, message) {
  // 1. If they're the current DJ - set the removeCurrentDj state flag and skip song
  // (Let the end song event handler deal with it)
  if (this.state == null) return;

  if (this.state.djs[this.state.currentDj] && this.state.djs[this.state.currentDj].id == message.author.id && this.activeDispatcher) {
    this.state.removeCurrentDj = true;
    return this.activeDispatcher.end();
  }

  // 2. If they're a DJ, remove them, then shift the remaining DJs positions, including the current DJ
  var djIndex = _.findIndex(this.state.djs, function(i) { return i.id == message.author.id; });

  if (djIndex > -1) {
    // remove DJ
    console.log('DJs before splice', this.state.djs);

    this.state.djs.splice(djIndex, 1);

    console.log('DJs after splice', this.state.djs);

    // reorder remaining DJs
    for (var i = djIndex + 1; i <= this.state.djs.length; i++) {
      if (this.state.currentDj == i) {
        this.state.currentDj -= 1;
      }

      //this.state.djs[i - 1] = this.state.djs[i];
      //this.state.djs.splice(i);
    }

    return;
  }

  // 3. If they're on the waiting list, just remove them
  var removed = _.remove(this.state.waitingDjs, function(i) { return i.id == message.author.id; });

  if (removed.length > 0) {
    message.reply('you\'ve been removed from the DJ waitlist.');
  }
};

var promoteWaitingDj = function() {
  // TODO Implement
};

var stop = function() {
  this.state = null;
  this.activeDispatcher.end();
};

module.exports = {
  closeVoiceChannel: closeVoiceChannel,
  endSongHandler: endSongHandler,
  playStream: playStream,
  playSong: playSong,
  fetchUser: fetchUser,
  skipSong: skipSong,
  handleConnect: handleConnect,
  setState: setState,
  addDj: addDj,
  removeDj: removeDj,
  playNextSong: playNextSong,
  getState: getState,
  setState: setState,
  state: state,
  connection: connection,
  activeDispatcher: activeDispatcher,
  advanceDJs: advanceDJs,
  queueHandler: queueHandler,
  stop: stop,
  getVotesForSong: getVotesForSong,
  addSongHistory: addSongHistory,
  addDjHelper: addDjHelper
};
