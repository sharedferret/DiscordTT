var connections = {};
var ytdl = require('ytdl-core');
var activeDispatchers = {};

var queueHandler = require(global.paths.lib + 'queue-handler');
var Discord = require('discord.js');

var db = require(global.paths.lib + 'database-handler').db;

// Holds the current state of the player, including the current song and any
// active connections or dispatchers.
// Segmented by guild ID
var state = {};

var ytOpts = {
  quality: 'lowest',
  filter: 'audioonly',
  retries: 3
};

var setState = function(state, guildId) {
  this.state[guildId] = state;
};

var getState = function(guildId) {
  return this.state[guildId];
};

var closeVoiceChannel = function(bot, guildId) {
  console.log('trashing channel for guild ' + guildId);
  if (this.activeDispatchers[guildId]) {
    this.activeDispatchers[guildId].end();
  }
  
  if (this.connections[guildId]) {
    this.connections[guildId].disconnect();
  }
  
  this.connections[guildId] = null;
  this.activeDispatchers[guildId] = null;
};

var skipSong = function(guildId) {
  if (this.activeDispatchers[guildId]) {
    this.activeDispatchers[guildId].end();
  }
};

var getVotesForSong = function(bot, guildId) {
  if (this.state[guildId] && this.state[guildId].botMessage) {
    var upvoteUsers = [];
    var downvoteUsers = [];

    if (this.state[guildId].botMessage.reactions.get('%F0%9F%91%8D')) {
      upvoteUsers = this.state[guildId].botMessage.reactions.get('%F0%9F%91%8D').users.keyArray();
    }

    if (this.state[guildId].botMessage.reactions.get('%F0%9F%91%8E')) {
      downvoteUsers = this.state[guildId].botMessage.reactions.get('%F0%9F%91%8E').users.keyArray();
    }

    _.remove(upvoteUsers, function(i) { return i == bot.user.id; });
    _.remove(downvoteUsers, function(i) { return i == bot.user.id; });

    this.state[guildId].upvotes = upvoteUsers.length;
    this.state[guildId].downvotes = downvoteUsers.length;
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
  console.log('in endsonghandler, guildId = ' + guildId);

  this.activeDispatchers[guildId] = null;

  if (this.state[guildId] == null) {
    console.log('state is null, closing');
    return this.closeVoiceChannel(bot, guildId);
  }

  // Increase user's songs played
  this.state[guildId].djs[this.state[guildId].currentDj].songsPlayed += 1;

  this.getVotesForSong(bot, guildId);

  // Write out song history
  this.addSongHistory(bot, user, song, guildId, this.state[guildId].upvotes, this.state[guildId].downvotes);

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
  embed.addField('Votes', '**' + this.state[guildId].upvotes + '**👍  **' + this.state[guildId].downvotes + '**👎');

  this.state[guildId].botMessage.edit('', { embed: embed });

  // Advance to next DJ
  this.advanceDJs(bot, guildId);

  console.log('next dj slot', this.state[guildId].currentDj);

  if (this.state[guildId].djs[this.state[guildId].currentDj]) {
    this.playNextSong(bot, this.state[guildId].djs[this.state[guildId].currentDj].id, guildId);
  } else {
    // No more DJs, clean up TT plugin
    this.state[guildId] = null;
    this.closeVoiceChannel(bot, guildId);
  }
};

var advanceDJs = function(bot, guildId) {
  var next = this.state[guildId].currentDj + 1;

  if (this.state[guildId].removeCurrentDj) {
    this.state[guildId].removeCurrentDj = false;
    this.state[guildId].djs.splice(this.state[guildId].currentDj, 1);
    next = this.state[guildId].currentDj;
  }

  if (next >= config.turntable.djs || next >= this.state[guildId].djs.length) {
    next = 0;
  }

  console.log('Setting next DJ to ' + next);

  if (this.state[guildId].djs[next]) {
    this.state[guildId].currentDj = next;
  } else {
    // If no DJs left, close voice channel
    this.state[guildId].currentDj = 0;
    this.closeVoiceChannel(bot, guildId);
  }
}

var playStream = function(bot, user, song, songMetadata, guildId, nowPlaying) {
  // Invoke song player
  console.log('attempting to play stream, url', song.url);
  console.log('guildId = ' + guildId);

  this.state[guildId].nowPlaying = song;
  this.state[guildId].botMessage = nowPlaying;

  if (this.connections[guildId] && !this.activeDispatchers[guildId]) {
    // TODO: See what this gives us
    var stream = ytdl(song.url, ytOpts);

    stream.on('info', function(info, format) {
      // console.log('- fetched video with info', info);
    });

    stream.on('progress', function(chunk, downloaded, downloadLength) {
      // console.log('- video progress: Chunk length ' + chunk + ', ' + downloaded + ' downloaded (length ' + downloadLength + ')');
    });

    this.activeDispatchers[guildId] = this.connections[guildId].playStream(stream, { seek: 0, volume: 0.25 });

    // The dispatcher end event marks the end of a song - hook here for endSong events
    // TODO: The voice connection should only be closed when no songs are left
    this.activeDispatchers[guildId].once('end', this.endSongHandler.bind(this, bot, user, song, guildId));

    // Cycle current DJ's playlist
    this.queueHandler.cycleQueue(user.id);
  }

  var upvotePromise = nowPlaying.react('👍');
  upvotePromise.then(function(messageReaction) {
    messageReaction.message.react('👎');
  });
};

var playSong = function(bot, song, guildId, user) {
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

  var promise = this.state[guildId].textChannel.send('', { embed: embed });
  promise.then(this.playStream.bind(this, bot, user, song, songMetadata, guildId));
};

var fetchUser = function(bot, userid, guildId, song) {
  if (!song) {
    var djIndex = _.findIndex(this.state[guildId].djs, function(i) { return i.id == userid; });
    this.state[guildId].djs.splice(djIndex, 1);

    if (this.state[guildId].djs[this.state[guildId].currentDj]) {
      this.playNextSong(bot, this.state[guildId].djs[this.state[guildId].currentDj].id, guildId);
    } else {
      // If no DJs left, close voice channel
      this.state[guildId].currentDj = 0;
      this.closeVoiceChannel(bot, guildId);
    }
  }

  // Grab a new reference to the user
  console.log('Fetching user with ID ', userid);
  var userPromise = bot.fetchUser(userid);
  userPromise.then(this.playSong.bind(this, bot, song, guildId));
};

var handleConnect = function(bot, message, guildId, connection) {
  console.log('in promise resolve');
  if (connection) {
    this.connections[guildId] = connection;

    this.playNextSong(bot, message.author.id, guildId);
  } else {
    this.state[guildId] = null;
    return message.reply('please join a voice channel first!');
  }
}

var playNextSong = function(bot, userId, guildId) {
  // Make sure people are actually in the VC

  // Retrieve song data from DB for the current DJ
  this.queueHandler.getQueuedSong(userId, this.fetchUser.bind(this, bot, userId, guildId));
}

var addDj = function(bot, message) {
  var guildId = message.guild.id;

  if (this.state[guildId] && (_.findIndex(this.state[guildId].djs, function(i) { return i.id == message.author.id; }) > -1 ||
    _.findIndex(this.state[guildId].waitingDjs, function(i) { return i.id == message.author.id; }) > -1)) {
    return message.reply('you\'re already DJing!');
  }

  // Verify the user actually has songs in their queue
  this.queueHandler.getQueueLength(message.author.id, this.addDjHelper.bind(this, bot, message, guildId));
};

var addDjHelper = function(bot, message, guildId, songCount) {
  if (songCount > 0) {
    if (this.state[guildId] == null) {
      this.state[guildId] = {
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
    if (this.state[guildId].djs.length < config.turntable.djs) {
      var position = this.state[guildId].djs.length;
      console.log('entering at position', position);
      this.state[guildId].djs[position] = message.author;
      this.state[guildId].djs[position].songsPlayed = 0;

      // If no one's playing, start playing from the new DJ's queue
      if (this.state[guildId].djs.length == 1) {
        this.state[guildId].currentDj = position;

        // Connect to VC
        if (this.connections[guildId] == null) {
          console.log('setting VC and channel for guild');
          this.state[guildId].voiceChannel = message.member.voiceChannel;
          this.state[guildId].textChannel = message.channel;

          if (message.member.voiceChannel) {
            message.reply('you\'ve been added to the DJ booth.');
            var promise = message.member.voiceChannel.join();
            promise.then(this.handleConnect.bind(this, bot, message, guildId));
          } else {
            this.state[guildId] = null;
            return message.reply('please join a voice channel first!');
          }
          
        } else {
          message.reply('you\'ve been added to the DJ booth.');
          this.playNextSong(bot, message.author.id, guildId);
        }
      }
    } else {
      console.log('adding to waiting list');
      this.state[guildId].waitingDjs.push(message.author);
      message.reply('you\'ve been added to the waiting list.');
    }
  } else {
    message.reply('you have no songs in your queue. Add one by typing `/q+ [song name]`!');
  }
};

var removeDj = function(bot, message) {
  var guildId = message.guild.id;

  // 1. If they're the current DJ - set the removeCurrentDj state flag and skip song
  // (Let the end song event handler deal with it)
  if (this.state[guildId] == null) return;

  if (this.state[guildId].djs[this.state[guildId].currentDj] && 
    this.state[guildId].djs[this.state[guildId].currentDj].id == message.author.id && 
    this.activeDispatchers[guildId]) {

    console.log('removing current DJ');
    this.state[guildId].removeCurrentDj = true;
    return this.activeDispatchers[guildId].end();
  }

  // 2. If they're a DJ, remove them, then shift the remaining DJs positions, including the current DJ
  var djIndex = _.findIndex(this.state[guildId].djs, function(i) { return i.id == message.author.id; });

  if (djIndex > -1) {
    // remove DJ
    console.log('DJs before splice', this.state[guildId].djs);

    this.state[guildId].djs.splice(djIndex, 1);

    console.log('DJs after splice', this.state[guildId].djs);

    // reorder remaining DJs
    for (var i = djIndex + 1; i <= this.state[guildId].djs.length; i++) {
      if (this.state[guildId].currentDj == i) {
        this.state[guildId].currentDj -= 1;
      }
    }

    return;
  }

  // 3. If they're on the waiting list, just remove them
  var removed = _.remove(this.state[guildId].waitingDjs, function(i) { return i.id == message.author.id; });

  if (removed.length > 0) {
    message.reply('you\'ve been removed from the DJ waitlist.');
  }
};

var promoteWaitingDj = function() {
  // TODO Implement
};

var stop = function(guildId) {
  this.state[guildId] = null;

  if (this.activeDispatchers[guildId]) {
    this.activeDispatchers[guildId].end();
  }
  
  if (this.connections[guildId]) {
    this.connections[guildId].disconnect();
  }
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
  connections: connections,
  activeDispatchers: activeDispatchers,
  advanceDJs: advanceDJs,
  queueHandler: queueHandler,
  stop: stop,
  getVotesForSong: getVotesForSong,
  addSongHistory: addSongHistory,
  addDjHelper: addDjHelper
};
