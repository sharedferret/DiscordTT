const connections = {};
const ytdl = require('ytdl-core');
const activeDispatchers = {};

const queueHandler = require(global.paths.lib + 'queue-handler');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const userHandler = require(global.paths.lib + 'user-handler');
const Discord = require('discord.js');

const db = require(global.paths.lib + 'database-client').db;

// Holds the current state of the player, including the current song and any
// active connections or dispatchers. Segmented by guild ID.
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

const ttPluginEnabled = function(guildId) {
  const serverSettings = serverSettingsManager.getSettings(guildId);
  return serverSettings.ttPlugin && serverSettings.ttPlugin.enabled;
};

const maxDjs = guildId => {
  const settings = serverSettingsManager.getSettings(guildId);

  if (settings.ttPlugin.maxDjs) {
    return settings.ttPlugin.maxDjs;
  } else {
    return config.turntable.maxDjs;
  }
};

const closeVoiceChannel = (bot, guildId) => {
  log.info(`[TT] [${guildId}] Closing voice channel`);
  if (activeDispatchers[guildId]) {
    activeDispatchers[guildId].end();
  }
  
  if (connections[guildId]) {
    connections[guildId].disconnect();
  }
  
  connections[guildId] = null;
  activeDispatchers[guildId] = null;
};

const skipSong = (guildId) => {
  if (activeDispatchers[guildId]) {
    activeDispatchers[guildId].end();
  }
};

const stop = (guildId) => {
  log.debug(`[TT][${guildId}] Stopping plugin`);

  state[guildId] = null;

  if (activeDispatchers[guildId]) {
    activeDispatchers[guildId].end();
  }
  
  if (connections[guildId]) {
    connections[guildId].disconnect();
  }
};

const advanceDJs = (bot, guildId) => {
  let next = state[guildId].currentDj + 1;

  // Check if the most recent DJ exceeded the song limit
  const settings = serverSettingsManager.getSettings(guildId);
  if (settings.ttPlugin.songsPerDj && state[guildId].djs[state[guildId].currentDj].songsPlayed >= settings.ttPlugin.songsPerDj) {
    state[guildId].removeCurrentDj = true;
  }

  if (state[guildId].removeCurrentDj) {
    state[guildId].removeCurrentDj = false;
    removeDj(guildId, state[guildId].currentDj);
    next = state[guildId].currentDj;
  }

  if (next >= maxDjs(guildId) || next >= state[guildId].djs.length) {
    next = 0;
  }

  log.debug(`[TT] [${guildId}] Setting next DJ to ${next}`);

  if (state[guildId].djs[next]) {
    state[guildId].currentDj = next;
  } else {
    // If no DJs left, close voice channel
    state[guildId].currentDj = 0;
    closeVoiceChannel(bot, guildId);
  }
};

const removeDj = (guildId, djIndex) => {
  state[guildId].djs.splice(djIndex, 1);

  // If there's a user in the waitingDjs list, add them to the decks
  if (state[guildId].waitingDjs.length > 0) {
    const position = state[guildId].djs.length;
    state[guildId].djs[position] = state[guildId].waitingDjs.shift();
  }
};

const removeDjRequest = (bot, message) => {
  const guildId = message.guild.id;

  // 1. If they're the current DJ - set the removeCurrentDj state flag and skip song
  // (Let the end song event handler deal with it)
  if (state[guildId] == null) return;

  if (state[guildId].djs[state[guildId].currentDj] && 
    state[guildId].djs[state[guildId].currentDj].id == message.author.id && 
    activeDispatchers[guildId]) {

    log.debug(`[TT] [${guildId}] Removing current DJ`);
    state[guildId].removeCurrentDj = true;
    return activeDispatchers[guildId].end();
  }

  // 2. If they're a DJ, remove them, then shift the remaining DJs positions, including the current DJ
  const djIndex = _.findIndex(state[guildId].djs, function(i) { return i.id == message.author.id; });

  if (djIndex > -1) {
    // remove DJ
    removeDj(guildId, djIndex);

    // reorder remaining DJs
    for (let i = djIndex + 1; i <= state[guildId].djs.length; i++) {
      if (state[guildId].currentDj == i) {
        state[guildId].currentDj -= 1;
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

const createNowPlayingEmbed = (bot, user, song, songMetadata) => {
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

  return embed;
};

const addSongHistory = (bot, user, song, guildId, upvotes, downvotes) => {
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
}

const getVotesForSong = (bot, guildId, songEnd) => {
  const promise = new Promise((resolve, reject) => {
    if (state[guildId] && state[guildId].botMessage) {
    
    const msgId = state[guildId].botMessage.id;
    state[guildId].botMessage.channel.messages.fetch(msgId)
      .then(message => {
        const votes = { up: 0, down: 0 };
        const upvoteReacts = message.reactions.get('👍');
        const downvoteReacts = message.reactions.get('👎');

        if (upvoteReacts) {
          for (const [id, user] of upvoteReacts.users) {
            // Votes by bots should not be counted
            if (!user.bot) {
              votes.up += 1;

              if (songEnd) userHandler.addPoints(user.id, { songVote: 1 });
            }
          }
        }

        if (downvoteReacts) {
          for (const [id, user] of downvoteReacts.users) {
            // Votes by bots should not be counted
            if (!user.bot) {
              votes.down += 1;

              if (songEnd) userHandler.addPoints(user.id, { songVote: 1 });
            }
          }
        }

        state[guildId].upvotes = votes.up;
        state[guildId].downvotes = votes.down;

        resolve(votes);
      })
    } else {
      resolve({ up: 0, down: 0 });
    }
  });

  return promise;
};

const endSongHandler = (bot, user, song, guildId) => {
  activeDispatchers[guildId] = null;

  if (state[guildId] == null) {
    return closeVoiceChannel(bot, guildId);
  }

  // Increase user's songs played (if it's not the bot playing)
  if (user.id != bot.user.id) {
    state[guildId].djs[state[guildId].currentDj].songsPlayed += 1;
  }

  getVotesForSong(bot, guildId, true)
    .then(votes => {
      // Write out song history
      if (user.id == bot.user.id) {
        addSongHistory(bot, song.originalDJ, song, guildId, votes.up, votes.down);
      } else {
        addSongHistory(bot, user, song, guildId, votes.up, votes.down);
      }
      
      // Update original Now Playing message with final vote tally
      const embed = createNowPlayingEmbed(bot, user, song, JSON.parse(song.metadata));
      embed.addField('Votes', `**${votes.up}**👍  **${votes.down}**👎`);
      embed.setTitle('Song Played');
      state[guildId].botMessage.edit('', { embed: embed });

      // Advance to next DJ
      advanceDJs(bot, guildId);

      log.info(`[TT] [${guildId}] Next dj slot: ${state[guildId].currentDj}`);

      if (state[guildId].djs[state[guildId].currentDj]) {
        log.debug(`[TT] [${guildId}] Playing next song`);
        playNextSong(bot, state[guildId].djs[state[guildId].currentDj].id, guildId);
      } else {
        // No more DJs, clean up TT plugin
        log.debug(`[TT] [${guildId}] Closing at getVotesForSong`);
        state[guildId] = null;
        closeVoiceChannel(bot, guildId);
      }
  })
};

const handleYtdlInfo = (bot, guildId, info, format) => {
  networkUsage.streams += 1;

  // Volume data at this point
  try {
    const baseVolume = parseInt(config.turntable.baseVolume != null ? config.turntable.baseVolume : -13);

    let intendedVolume = parseFloat(info.loudness) - baseVolume;
    intendedVolume = baseVolume - intendedVolume;

    if (intendedVolume) {
      // Sanity check
      if (intendedVolume > 10.0) {
        intendedVolume = 10.0;
      }

      activeDispatchers[guildId].setVolumeDecibels(intendedVolume); 
    } else {
      activeDispatchers[guildId].setVolumeDecibels(-13);
    }
    
    log.debug(`[TT] [${guildId}] Playing stream at ${intendedVolume}dB (loudness: ${info.loudness}`)
  } catch (e) { log.info('error', e); };
};

const handleYtdlProgress = (bot, chunk, downloaded, downloadLength) => {
  networkUsage.dataIn += chunk;
};

const handleYtdlResponse = (bot, response) => {
  log.debug('YT returned ' + response.statusCode + '/' + response.statusMessage);
};

/**
 * Plays a song via ytdl
 * @param {*} bot 
 * @param {*} song 
 * @param {*} guildId 
 * @param {*} user 
 */
const playSong = (bot, song, guildId, user) => {
  log.debug(`[TT][${guildId}] Entering playSong`);

  const songMetadata = JSON.parse(song.metadata);
  
  // Create a Now Playing message
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

  state[guildId].textChannel.send('', { embed, embed })
    .then(nowPlayingMessage => {
      // Invoke song player
      state[guildId].nowPlaying = song;
      state[guildId].botMessage = nowPlayingMessage;

      if (connections[guildId] && !activeDispatchers[guildId]) {
        const ytOpts = _.cloneDeep(ytBaseOpts);

        const serverSettings = serverSettingsManager.getSettings(guildId);

        if (serverSettings.ttPlugin && serverSettings.ttPlugin.youtubeQuality) {
          log.debug('setting to quality ' + serverSettings.ttPlugin.youtubeQuality);
          ytOpts.quality = serverSettings.ttPlugin.youtubeQuality;
        }

        const stream = ytdl(song.url, ytOpts);

        activeDispatchers[guildId] = connections[guildId].playStream(stream, { seek: 0, volume: 0.25 });

        stream.on('info', handleYtdlInfo.bind(this, bot, guildId));
        stream.on('progress', handleYtdlProgress.bind(this, bot));
        stream.on('response', handleYtdlResponse.bind(this, bot));

        // The dispatcher end event marks the end of a song - hook here for endSong events
        activeDispatchers[guildId].once('end', endSongHandler.bind(this, bot, user, song, guildId));

        // Cycle current DJ's playlist
        if (user.id == bot.user.id) {
          state[guildId].unqueuedSongs.shift();
        } else {
          queueHandler.cycleQueue(user.id);
        }
      }

      nowPlayingMessage.react('👍')
        .then((messageReaction) => {
          messageReaction.message.react('👎');
      });
    })
    .catch(error => {
      log.warn(error);
    })
};

/**
 * Queues the next song from the play queue for the bot to play.
 * @param {*} bot 
 * @param {*} userId 
 * @param {*} guildId 
 */
const queueBotSong = (bot, userId, guildId) => {
  if (state[guildId].unqueuedSongs[0]) {
    playSong(bot, state[guildId].unqueuedSongs[0], guildId, bot.user);
  } else {
    // Remove the bot from the decks
    const djIndex = _.findIndex(state[guildId].djs, i => { return i.id == userId });

    if (djIndex !== undefined) state[guildId].textChannel.send('Play queue completed.');
    
    removeDj(guildId, djIndex);

    if (state[guildId].djs[state[guildId].currentDj]) {
      playNextSong(bot, state[guildId].djs[state[guildId].currentDj].id, guildId);
    } else {
      // If no DJs left, close voice channel
      state[guildId] = null;
      closeVoiceChannel(bot, guildId);
    }
  }
};

/**
 * Main loop for playing music.
 * @param {*} bot 
 * @param {*} userId 
 * @param {*} guildId 
 */
const playNextSong = (bot, userId, guildId) => {
  // If the current DJ is the bot, use song data from state.unqueuedSongs and immediately jump to playSong()
  if (userId === bot.user.id) {
    queueBotSong(bot, userId, guildId);
  } else {
    // Make sure the DJ is actually in the VC
    const member = connections[guildId].channel.members.get(userId);

    if (member) {
      // Retrieve song data from DB for the current DJ
      queueHandler.getQueuedSong(userId)
        .then(song => {
          // If the user has no music, skip them
          if (!song) {
            const djIndex = _.findIndex(state[guildId].djs, (i) => { return i.id == userId; });
            removeDj(guildId, djIndex);

            if (state[guildId].djs[state[guildId].currentDj]) {
              playNextSong(bot, state[guildId].djs[state[guildId].currentDj].id, guildId);
            } else {
              // If no DJs left, close voice channel
              state[guildId].currentDj = 0;
              closeVoiceChannel(bot, guildId);
            }
          } else {
            // Grab a new reference to the user
            bot.users.fetch(userId)
              .then(user => {
                playSong(bot, song, guildId, user);
            });
          };
        })
        .catch(error => {
          log.warn(error);
      });
    } else {
      // Kick this user off the decks
      const djIndex = _.findIndex(state[guildId].djs, function(i) { return i.id == userId; });
      state[guildId].textChannel.send(state[guildId].djs[djIndex].name + '\'s song was skipped since they weren\'t in the voice channel.');
      removeDj(guildId, djIndex);

      if (state[guildId].djs[state[guildId].currentDj]) {
        playNextSong(bot, state[guildId].djs[state[guildId].currentDj].id, guildId);
      } else {
        // If no DJs left, close voice channel
        state[guildId].currentDj = 0;
        closeVoiceChannel(bot, guildId);
      }
    }
  }
};

/**
 * Adds a new DJ to the DJ list.
 * @param {*} bot 
 * @param {*} message 
 */
const addDj = (bot, message) => {
  const guildId = message.guild.id;

  if (state[guildId] && (_.findIndex(state[guildId].djs, function(i) { return i.id == message.author.id; }) > -1 ||
    _.findIndex(state[guildId].waitingDjs, function(i) { return i.id == message.author.id; }) > -1)) {
    return message.reply('you\'re already DJing!');
  }

  // Verify the user actually has songs in their queue
  queueHandler.getQueueLength(message.author.id)
    .then(queueLength => {
      if (queueLength > 0) {
        if (state[guildId] == null) {
          state[guildId] = {
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

        // If there's room, immediately step up
        log.debug(`[TT] [${guildId}] Entering addDj`);
        if (state[guildId].djs.length < maxDjs(guildId)) {
          const position = state[guildId].djs.length;
          log.debug(`[TT] [${guildId}] entering at position ${position}`);
          state[guildId].djs[position] = message.author;
          state[guildId].djs[position].songsPlayed = 0;

          // If no one's playing, start playing from the new DJ's queue
          if (state[guildId].djs.length == 1) {
            state[guildId].currentDj = position;

            // Connect to VC
            if (connections[guildId] == null) {
              state[guildId].voiceChannel = message.member.voiceChannel;
              state[guildId].textChannel = message.channel;

              if (message.member.voiceChannel) {
                message.reply('you\'ve been added to the DJ booth.');

                // TODO Chain
                message.member.voiceChannel.join()
                  .then(voiceConnection => {
                    if (voiceConnection) {
                      connections[guildId] = voiceConnection;
                      playNextSong(bot, state[guildId].djs[0].id, guildId);
                    } else {
                      state[guildId] = null;
                      return message.reply('please join a voice channel first!');
                    }
                })
              } else {
                this.state[guildId] = null;
                return message.reply('please join a voice channel first!');
              }
            } else {
              message.reply('you\'ve been added to the DJ booth.');
              playNextSong(bot, message.author.id, guildId);
            }
          } else {
            message.reply('you\'ve been added to the DJ booth.');
          }
        } else {
          state[guildId].waitingDjs.push(message.author);
          message.reply('you\'ve been added to the waiting list.');
        }
      } else {
        message.reply('you have no songs in your queue. Add one by typing `/q+ [song name]`!');
      }
    })
    .catch(err => {
      log.warn(err);
    });
};

const playUnqueuedSong = (bot, guildId, message, song) => {
  log.debug(`[TT][${guildId}] Entering playUnqueuedSong`);

  // Create state if no one's playing
  if (!state[guildId]) {
    state[guildId] = {
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

  song.id = song.id.videoId ? song.id.videoId : song.id;

  // Add song to DB immediately
  // Since Youtube is our only provider, we're using the Youtube ID as a unique PK
  // Replace since we want any updated metadata
  db.run('INSERT OR REPLACE INTO Song (id, type, url, title, metadata) VALUES (?, ?, ?, ?, ?)',
    [
      song.id,
      'youtube',
      'https://www.youtube.com/watch?v=' + song.id,
      song.snippet.title,
      JSON.stringify(song)
    ]);

  // Transform song to match database response, add user as originalDJ
  song.metadata = JSON.stringify(song);
  song.originalDJ = message.author;
  song.artist = null;
  song.title = song.snippet.title;
  song.type = 'youtube';
  song.url = 'https://www.youtube.com/watch?v=' + song.id;
  state[guildId].unqueuedSongs.push(song);

  // If there are unqueued songs, that means the bot is already playing
  if (_.findIndex(state[guildId].djs, (i) => { return i.id == bot.user.id; }) == -1) {
    log.debug(`[TT][${guildId}] Adding the bot as a DJ`);

    const position = state[guildId].djs.length;

    // Add the bot as a DJ
    state[guildId].djs[position] = bot.user;
    state[guildId].djs[position].songsPlayed = 0;

    log.debug(`[TT][${guildId}] Current DJs: ${state[guildId].djs}`);

    // If no one's playing, start playing from the new DJ's queue
    if (state[guildId].djs.length == 1) {
      state[guildId].currentDj = position;

      // Connect to VC
      if (connections[guildId] == null) {
        state[guildId].voiceChannel = message.member.voiceChannel;
        state[guildId].textChannel = message.channel;

        if (message.member.voiceChannel) {
          message.member.voiceChannel.join()
            .then(voiceConnection => {
              if (voiceConnection) {
                connections[guildId] = voiceConnection;
                playNextSong(bot, state[guildId].djs[0].id, guildId);
              } else {
                state[guildId] = null;
                return message.reply('please join a voice channel first!');
              }
            })
            .catch(err => {
              log.warn(err);
            });
        } else {
          state[guildId] = null;
          return message.reply('please join a voice channel first!');
        }
      } else {
        playNextSong(bot, bot.user.id, guildId);
      }
    } else {
      message.reply('your song has been queued.');
    }
  } else {
    message.reply('your song has been queued.');
  }
};

const clearPlayQueue = (guildId) => {
  if (state[guildId]) {
    state[guildId].unqueuedSongs = [];
  }
};

const getState = (guildId) => {
  return state[guildId];
};

const getNetworkUsage = () => {
  return networkUsage;
}

module.exports = {
  addDj: addDj,
  removeDjRequest: removeDjRequest,
  playUnqueuedSong: playUnqueuedSong,
  clearPlayQueue: clearPlayQueue,
  getVotesForSong: getVotesForSong,
  skipSong: skipSong,
  stop: stop,
  getState: getState,
  getNetworkUsage: getNetworkUsage
}