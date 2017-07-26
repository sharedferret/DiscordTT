'use strict';

require('./globals');

const Discord = require('discord.js');
const bot = new Discord.Client();

const messageHandler = require(global.paths.lib + 'message-handler');
const hookHandler = require(global.paths.lib + 'hook-handler');
const databaseHandler = require(global.paths.lib + 'database-handler');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const userHandler = require(global.paths.lib + 'user-handler');
require(global.paths.lib + 'turntable-handler');

bot.on('message', function(message) {
  messageHandler.handleMessage(bot, message);

  // Add a chatMessage point (bots can't earn points)
  if (!message.author.bot) {
    userHandler.addPoints(message.author.id, { chatMessage: 1 });
  }
});

bot.on('ready', function(data) { // jshint ignore:line
  // Try to disconnect from any active voice channels
  console.log('VCs: ', bot.voiceConnections);
  for (let connection of bot.voiceConnections) {
    console.log('disconnecting from ' + connection);
    bot.voiceConnections[connection].disconnect();
  }

  // Load commands
  messageHandler.loadCommands();

  // Set game to welcome message
  bot.user.setGame('/help');

  // Register any new servers since last startup
  for (const [ guildId, guild ] of bot.guilds) {
    serverSettingsManager.registerServer(guild.id);
    serverSettingsManager.loadSettings(guild.id);

    // Create database entries for new users
    for (const [ userId, user ] of guild.members) {
      userHandler.createUser(user.user, guild.id);
    }
  };
});

bot.on('guildCreate', function(guild) {
  serverSettingsManager.registerServer(guild.id);
});

bot.on('reconnecting', function() {
  console.log('attempting to reconnect @ ' + new Date());
});

try {
  bot.login(config.discord.credentials.token);
} catch (e) {
  console.log('login failed', e);
}

function exitHandler(options, err) {
  if (err) {
    console.log(err.stack);
  }

  // Close database connection
  databaseHandler.closeDb();

  // Disconnect from any active voice channels
  bot.voiceConnections.every(function(i) {
    i.disconnect();
    return true;
  });

  if (options.exit) {
    process.exit();
  }
}

process.on('exit', exitHandler.bind(null, { exit: false }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
