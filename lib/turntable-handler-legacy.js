const connections = {};
const ytdl = require('ytdl-core');
const activeDispatchers = {};

const queueHandler = require(global.paths.lib + 'queue-handler');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const userHandler = require(global.paths.lib + 'user-handler');
const Discord = require('discord.js');

const db = require(global.paths.lib + 'database-client').db;

// Holds the current state of the player, including the current song and any
// active connections or dispatchers.
// Segmented by guild ID
const state = {};

const networkUsage = {
  dataIn: 0,
  streams: 0
};

const ytBaseOpts = {
  // quality: 'lowest',
  quality: '171',
  filter: 'audioonly',
  retries: 5,
  highWaterMark: 65536
};

const maxDjs = guildId => {
  const settings = serverSettingsManager.getSettings(guildId);

  if (settings.ttPlugin.maxDjs) {
    return settings.ttPlugin.maxDjs;
  } else {
    return config.turntable.maxDjs;
  }
};

const setState = function(state, guildId) {
  this.state[guildId] = state;
};

const getState = function(guildId) {
  return this.state[guildId];
};

const closeVoiceChannel = function(bot, guildId) {
  console.log('closing channel for guild ' + guildId);
  if (this.activeDispatchers[guildId]) {
    this.activeDispatchers[guildId].end();
  }
  
  if (this.connections[guildId]) {
    this.connections[guildId].disconnect();
  }
  
  this.connections[guildId] = null;
  this.activeDispatchers[guildId] = null;
};

const skipSong = function(guildId) {
  if (this.activeDispatchers[guildId]) {
    this.activeDispatchers[guildId].end();
  }
};

const getVotesForSong = function(bot, guildId, songEnd) {
  if (this.state[guildId] && this.state[guildId].botMessage) {
    let upvotes = 0;
    let downvotes = 0;

    // TODO [#1]: Replace vote collecting method with code below
    // const msgId = this.state[guildId].botMessage.id;
    // this.state[guildId].botMessage.channel.fetchMessage(msgId)
    //   .then(message => {
    //     const upvotes = message.reactions.get('%F0%9F%91%8D').users;
    //     const downvotes = message.reactions.get('%F0%9F%91%8E').users;
    //   });

    if (this.state[guildId].botMessage.reactions.get('%F0%9F%91%8D')) {
      for (const [ id, user ] of this.state[guildId].botMessage.reactions.get('%F0%9F%91%8D').users) {
        // Votes by bots should not be counted
        if (!user.bot) {
          upvotes += 1;

          if (songEnd) {
            // Add a songVote point
            userHandler.addPoints(user.id, { songVote: 1 });
          }
        }
      }
    }

    if (this.state[guildId].botMessage.reactions.get('%F0%9F%91%8E')) {
      for (const [ id, user ] of this.state[guildId].botMessage.reactions.get('%F0%9F%91%8E').users) {
        // Votes by bots should not be counted
        if (!user.bot) {
          downvotes += 1;

          if (songEnd) {
            // Add a songVote point
            userHandler.addPoints(user.id, { songVote: 1 });
          }
        }
      }
    }

    this.state[guildId].upvotes = upvotes;
    this.state[guildId].downvotes = downvotes;
  }
};

const addSongHistory = function(bot, user, song, guildId, upvotes, downvotes) {
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
    let points = upvotes - downvotes;
    if (points < 0) points = 0;

    // Provide an additional point for playing the song
    points += 1;

    db.run('UPDATE User SET points=points+? WHERE id=?',
      [
        points,
        user.id
      ]);
    
    userHandler.addPoints(user.id, { songPlay: 1, songPointEarned: points });
  });
};

const endSongHandler = function(bot, user, song, guildId) {
  this.activeDispatchers[guildId] = null;

  if (this.state[guildId] == null) {
    console.log('state is null, closing');
    return this.closeVoiceChannel(bot, guildId);
  }

  // Increase user's songs played (if it's not the bot playing)
  if (user.id != bot.user.id) {
    this.state[guildId].djs[this.state[guildId].currentDj].songsPlayed += 1;
  }

  this.getVotesForSong(bot, guildId, true);

  // Write out song history
  if (user.id == bot.user.id) {
    this.addSongHistory(bot, song.originalDJ, song, guildId, this.state[guildId].upvotes, this.state[guildId].downvotes);
  } else {
    this.addSongHistory(bot, user, song, guildId, this.state[guildId].upvotes, this.state[guildId].downvotes);
  }
  

  // Update original Now Playing message with final vote tally
  // TODO: "Now Playing" creation needs to be pulled out to its own function
  const songMetadata = JSON.parse(song.metadata);

  // Stuff from play and playStream - start song stream, send Now Playing message
  // Send back a Now Playing message
  const embed = new Discord.RichEmbed();

  embed.setThumbnail(songMetadata.snippet.thumbnails.medium.url);

  if (user.id == bot.user.id) {
    embed.setFooter('Queued by DJ ' + song.originalDJ.username, song.originalDJ.avatarURL);
  } else {
    embed.setFooter('Queued by DJ ' + user.username, user.avatarURL);
  }
  
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

const advanceDJs = function(bot, guildId) {
  let next = this.state[guildId].currentDj + 1;

  // Check if the most recent DJ exceeded the song limit
  const settings = serverSettingsManager.getSettings(guildId);
  if (settings.ttPlugin.songsPerDj && this.state[guildId].djs[this.state[guildId].currentDj].songsPlayed >= settings.ttPlugin.songsPerDj) {
    this.state[guildId].removeCurrentDj = true;
  }

  if (this.state[guildId].removeCurrentDj) {
    this.state[guildId].removeCurrentDj = false;
    // this.state[guildId].djs.splice(this.state[guildId].currentDj, 1);
    this.removeDj(guildId, this.state[guildId].currentDj);
    next = this.state[guildId].currentDj;
  }

  if (next >= maxDjs(guildId) || next >= this.state[guildId].djs.length) {
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
};

const removeDj = function(guildId, djIndex) {
  this.state[guildId].djs.splice(djIndex, 1);

  // If there's a user in the waitingDjs list, add them to the decks
  if (this.state[guildId].waitingDjs.length > 0) {
    const position = this.state[guildId].djs.length;
    this.state[guildId].djs[position] = this.state[guildId].waitingDjs.shift();
  }
};

const playStream = function(bot, user, song, songMetadata, guildId, nowPlaying) {
  // Invoke song player
  console.log('attempting to play stream, url', song.url);

  this.state[guildId].nowPlaying = song;
  this.state[guildId].botMessage = nowPlaying;

  if (this.connections[guildId] && !this.activeDispatchers[guildId]) {
    const ytOpts = _.cloneDeep(ytBaseOpts);

    const serverSettings = serverSettingsManager.getSettings(guildId);

    if (serverSettings.ttPlugin && serverSettings.ttPlugin.youtubeQuality) {
      console.log('setting to quality ' + serverSettings.ttPlugin.youtubeQuality);
      ytOpts.quality = serverSettings.ttPlugin.youtubeQuality;
    }

    const stream = ytdl(song.url, ytOpts);

    this.activeDispatchers[guildId] = this.connections[guildId].playStream(stream, { seek: 0, volume: 0.25 });

    stream.on('info', this.handleYtdlInfo.bind(this, bot, guildId));
    stream.on('progress', this.handleYtdlProgress.bind(this, bot));
    stream.on('response', this.handleYtdlResponse.bind(this, bot));

    // The dispatcher end event marks the end of a song - hook here for endSong events
    this.activeDispatchers[guildId].once('end', this.endSongHandler.bind(this, bot, user, song, guildId));

    // Cycle current DJ's playlist
    if (user.id == bot.user.id) {
      this.state[guildId].unqueuedSongs.shift();
    } else {
      this.queueHandler.cycleQueue(user.id);
    }
  }

  const upvotePromise = nowPlaying.react('👍');
  upvotePromise.then(function(messageReaction) {
    messageReaction.message.react('👎');
  });
};

const handleYtdlInfo = function(bot, guildId, info, format) {
  this.networkUsage.streams += 1;

  // Volume data at this point
  try {
    console.log('\nStream data');
    if (info) {
      console.log('- Loudness: ' + info.loudness);
    }

    const baseVolume = parseInt(config.turntable.baseVolume != null ? config.turntable.baseVolume : -13);

    let intendedVolume = parseFloat(info.loudness) - baseVolume;
    intendedVolume = baseVolume - intendedVolume;

    console.log('- Playing at ' + intendedVolume + 'dB');

    if (intendedVolume) {
      // Sanity check
      if (intendedVolume > 10.0) {
        intendedVolume = 10.0;
      }

      this.activeDispatchers[guildId].setVolumeDecibels(intendedVolume); 
    } else {
      this.activeDispatchers[guildId].setVolumeDecibels(-13);
    }
    
    
  } catch (e) { console.log('error', e); };
};

const handleYtdlProgress = function(bot, chunk, downloaded, downloadLength) {
  // console.log('- Progress: ' + chunk + ' bytes, ' + downloaded + '/' + downloadLength);
  this.networkUsage.dataIn += chunk;
};

const handleYtdlResponse = function(bot, response) {
  console.log('yt returned ' + response.statusCode + '/' + response.statusMessage);
}

const playSong = function(bot, song, guildId, user) {
  const songMetadata = JSON.parse(song.metadata);

  // Stuff from play and playStream - start song stream, send Now Playing message
  // Send back a Now Playing message
  const embed = new Discord.RichEmbed();

  embed.setThumbnail(songMetadata.snippet.thumbnails.medium.url);

  if (user.id == bot.user.id) {
    embed.setFooter('Queued by DJ ' + song.originalDJ.username, song.originalDJ.avatarURL);
  } else {
    embed.setFooter('Queued by DJ ' + user.username, user.avatarURL);
  }
  
  embed.setTimestamp(new Date());
  embed.setAuthor(user.username, user.avatarURL);
  embed.setTitle('Now Playing');
  embed.setDescription(song.title);

  const promise = this.state[guildId].textChannel.send('', { embed: embed });
  promise.then(this.playStream.bind(this, bot, user, song, songMetadata, guildId));
};

const fetchUser = function(bot, userid, guildId, song) {
  // If the user has no music, skip them
  if (!song) {
    const djIndex = _.findIndex(this.state[guildId].djs, function(i) { return i.id == userid; });
    // this.state[guildId].djs.splice(djIndex, 1);
    this.removeDj(guildId, djIndex);

    if (this.state[guildId].djs[this.state[guildId].currentDj]) {
      this.playNextSong(bot, this.state[guildId].djs[this.state[guildId].currentDj].id, guildId);
    } else {
      // If no DJs left, close voice channel
      this.state[guildId].currentDj = 0;
      this.closeVoiceChannel(bot, guildId);
    }
  } else {
    // Grab a new reference to the user
    console.log('Fetching user with ID ', userid);
    const userPromise = bot.fetchUser(userid);
    userPromise.then(this.playSong.bind(this, bot, song, guildId));
  }
};

const handleConnect = function(bot, message, guildId, connection) {
  console.log('in promise resolve');
  if (connection) {
    this.connections[guildId] = connection;

    this.playNextSong(bot, this.state[guildId].djs[0].id, guildId);
  } else {
    this.state[guildId] = null;
    return message.reply('please join a voice channel first!');
  }
}

const playNextSong = function(bot, userId, guildId) {
  // If the current DJ is the bot, use song data from state.unqueuedSongs and immediately jump to playSong()
  if (userId === bot.user.id) {
    if (this.state[guildId].unqueuedSongs[0]) {
      this.playSong(bot, this.state[guildId].unqueuedSongs[0], guildId, bot.user);
    } else {
      // Remove the bot from the decks
      const djIndex = _.findIndex(this.state[guildId].djs, i => { return i.id == userId });
      if (djIndex) {
        this.state[guildId].textChannel.send('Play queue completed.');
      }
      
      // this.state[guildId].djs.splice(djIndex, 1);
      this.removeDj(guildId, djIndex);

      if (this.state[guildId].djs[this.state[guildId].currentDj]) {
        this.playNextSong(bot, this.state[guildId].djs[this.state[guildId].currentDj].id, guildId);
      } else {
        // If no DJs left, close voice channel
        this.state[guildId].currentDj = 0;
        this.closeVoiceChannel(bot, guildId);
      }
    }
  } else {
    // Make sure the DJ is actually in the VC
    const member = this.connections[guildId].channel.members.get(userId);

    if (member) {
      // Retrieve song data from DB for the current DJ
      this.queueHandler.getQueuedSong(userId, this.fetchUser.bind(this, bot, userId, guildId));
    } else {
      // Kick this user off the decks
      const djIndex = _.findIndex(this.state[guildId].djs, function(i) { return i.id == userId; });

      this.state[guildId].textChannel.send(this.state[guildId].djs[djIndex].name + '\'s song was skipped since they weren\'t in the voice channel.');

      // this.state[guildId].djs.splice(djIndex, 1);
      this.removeDj(guildId, djIndex);

      if (this.state[guildId].djs[this.state[guildId].currentDj]) {
        this.playNextSong(bot, this.state[guildId].djs[this.state[guildId].currentDj].id, guildId);
      } else {
        // If no DJs left, close voice channel
        this.state[guildId].currentDj = 0;
        this.closeVoiceChannel(bot, guildId);
      }
    }
  }
};

const addDj = function(bot, message) {
  const guildId = message.guild.id;

  if (this.state[guildId] && (_.findIndex(this.state[guildId].djs, function(i) { return i.id == message.author.id; }) > -1 ||
    _.findIndex(this.state[guildId].waitingDjs, function(i) { return i.id == message.author.id; }) > -1)) {
    return message.reply('you\'re already DJing!');
  }

  // Verify the user actually has songs in their queue
  this.queueHandler.getQueueLength(message.author.id, this.addDjHelper.bind(this, bot, message, guildId));
};

const addDjHelper = function(bot, message, guildId, songCount) {
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
    if (this.state[guildId].djs.length < maxDjs(guildId)) {
      const position = this.state[guildId].djs.length;
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
            const promise = message.member.voiceChannel.join();
            promise.then(this.handleConnect.bind(this, bot, message, guildId));
          } else {
            this.state[guildId] = null;
            return message.reply('please join a voice channel first!');
          }
        } else {
          message.reply('you\'ve been added to the DJ booth.');
          this.playNextSong(bot, message.author.id, guildId);
        }
      } else {
        message.reply('you\'ve been added to the DJ booth.');
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

const removeDjRequest = function(bot, message) {
  const guildId = message.guild.id;

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
  const djIndex = _.findIndex(this.state[guildId].djs, function(i) { return i.id == message.author.id; });

  if (djIndex > -1) {
    // remove DJ
    // this.state[guildId].djs.splice(djIndex, 1);
    this.removeDj(guildId, djIndex);

    // reorder remaining DJs
    for (let i = djIndex + 1; i <= this.state[guildId].djs.length; i++) {
      if (this.state[guildId].currentDj == i) {
        this.state[guildId].currentDj -= 1;
      }
    }

    return;
  }

  // 3. If they're on the waiting list, just remove them
  const removed = _.remove(this.state[guildId].waitingDjs, function(i) { return i.id == message.author.id; });

  if (removed.length > 0) {
    message.reply('you\'ve been removed from the DJ waitlist.');
  }
};

const promoteWaitingDj = function() {
  // TODO [#57]: Implement
};

const stop = function(guildId) {
  this.state[guildId] = null;

  if (this.activeDispatchers[guildId]) {
    this.activeDispatchers[guildId].end();
  }
  
  if (this.connections[guildId]) {
    this.connections[guildId].disconnect();
  }
};

const ttPluginEnabled = function(guildId) {
  const serverSettings = serverSettingsManager.getSettings(guildId);
  return serverSettings.ttPlugin && serverSettings.ttPlugin.enabled;
};

const playUnqueuedSong = function(bot, guildId, message, song) {
  // Create state if no one's playing
  if (!this.state[guildId]) {
    this.state[guildId] = {
      textChannel: null,
      voiceChannel: null,
      nowPlaying: null,
      upvotes: 0,
      downvotes: 0,
      currentDj: 0,
      removeCurrentDj: false,
      djs: [],
      waitingDjs: [],
      unqueuedSongs: []
    };
  }

  // Transform song to match database response, add user as originalDJ
  song.metadata = JSON.stringify(song);
  song.originalDJ = message.author;
  song.artist = null;
  song.id = song.id.videoId ? song.id.videoId : song.id;
  song.title = song.snippet.title;
  song.type = 'youtube';
  song.url = 'https://www.youtube.com/watch?v=' + song.id;
  
  this.state[guildId].unqueuedSongs.push(song);

  // If there are unqueued songs, that means the bot is already playing
  if (this.state[guildId].unqueuedSongs.length == 1) {
    const position = this.state[guildId].djs.length;

    // Add the bot as a DJ
    this.state[guildId].djs[position] = bot.user;
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
          const promise = message.member.voiceChannel.join();
          promise.then(this.handleConnect.bind(this, bot, message, guildId));
        } else {
          this.state[guildId] = null;
          return message.reply('please join a voice channel first!');
        }
      } else {
        this.playNextSong(bot, bot.user.id, guildId);
      }
    } else {
      message.reply('your song has been queued.');
    }
  } else {
    message.reply('your song has been queued.');
  }
};

const clearPlayQueue = function(guildId) {
  if (this.state[guildId]) {
    this.state[guildId].unqueuedSongs = [];
  }
}

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
  removeDjRequest: removeDjRequest,
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
  addDjHelper: addDjHelper,
  networkUsage: networkUsage,
  handleYtdlInfo: handleYtdlInfo,
  handleYtdlProgress: handleYtdlProgress,
  handleYtdlResponse: handleYtdlResponse,
  ttPluginEnabled: ttPluginEnabled,
  playUnqueuedSong: playUnqueuedSong,
  clearPlayQueue: clearPlayQueue
};
