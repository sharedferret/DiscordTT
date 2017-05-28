require('./globals');

var util = require('util');

var Discord = require('discord.js');
var bot = new Discord.Client();

var messageHandler = require(global.paths.lib + 'message-handler');
var hookHandler = require(global.paths.lib + 'hook-handler');
var databaseHandler = require(global.paths.lib + 'database-handler');
var tt = require(global.paths.lib + 'turntable-handler');
// var gameSessionHandler = require(global.paths.lib + 'game-session-handler');
 
bot.on('message', function(message) {
  /**
  console.log('Message: ', {
		id: message.id,
		channel: message.channel.name,
		server: message.channel.server.name,
		tts: message.tts,
		timestamp: message.timestamp,
		author: message.author.username,
		content: message.cleanContent,
		mentions: _.map(message.mentions, 'username')
	}); */

	// console.log('[' + message.author.username + '] ' + message.cleanContent);
	messageHandler.handleMessage(bot, message);
});

bot.on('ready', function(data) {
  // Try to disconnect from any active voice channels
  console.log('VCs: ', bot.voiceConnections);
  for (var channel of bot.voiceConnections) {
    console.log('disconnecting from ' + channel);
    channel.destroy();
  }

	// Load commands
	messageHandler.loadCommands();

	// Load hooks
	hookHandler.loadHooks(bot);

  // Set game to welcome message
  bot.user.setGame('/help');

  // Populate game sessions object 
  // gameSessionHandler.populateGameSessions(bot);

  // Create watcher loop
  // TODO: Replace this with something sane/more robust
  /** 
  setTimeout(function() {
    bot.fetchUser(bot.user.id)
      .then(function(user) {
        user.sendMessage('/healthcheck')
          .then(function(message) {
            console.log('deleting');
            message.delete();
          }).catch(function(e) {
            console.log(e);
        });
    });

  }, 5000);
  */
});

bot.on('presence', function(staleUser, user) {
  // gameSessionHandler.presenceUpdated(staleUser, user);
});

bot.on('reconnecting', function() {
  console.log('attempting to reconnect @ ' + new Date());
})

try {
  bot.login(config.discord.credentials.token);
} catch (e) {
  console.log('login failed', e);
}

function exitHandler(options, err) {

  if (err) console.log(err.stack);

  console.log('VC count: ', bot.voiceConnections.length);

  for (var i in bot.voiceConnections) {
    bot.voiceConnections[i].disconnect();
  }

  // Try to disconnect from any active voice channels 
  for (var channel of bot.voiceConnections) {
    console.log('disconnecting from ' + channel);
    channel.disconnect();
  }

  if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null, { exit: false }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
