require('./globals');

const util = require('util');

const Discord = require('discord.js');
const bot = new Discord.Client();

const messageHandler = require(global.paths.lib + 'message-handler');
const hookHandler = require(global.paths.lib + 'hook-handler');
const databaseHandler = require(global.paths.lib + 'database-handler');
const tt = require(global.paths.lib + 'turntable-handler');
 
bot.on('message', function(message) {
	messageHandler.handleMessage(bot, message);
});

bot.on('ready', function(data) {
  // Try to disconnect from any active voice channels
  console.log('VCs: ', bot.voiceConnections);
  for (let connection of bot.voiceConnections) {
    console.log('disconnecting from ' + connection);
    bot.voiceConnections[connection].disconnect();
  }

	// Load commands
	messageHandler.loadCommands();

	// Load hooks
	hookHandler.loadHooks(bot);

  // Set game to welcome message
  bot.user.setGame('/help');
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

  bot.voiceConnections.every(function(i) {
    return i.disconnect();
  });

  if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null, { exit: false }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
