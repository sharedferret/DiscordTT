'use strict';

require('./globals');

const Discord = require('discord.js');
const bot = new Discord.Client();

const messageHandler = require(global.paths.lib + 'message-handler');
const dbClient = require(global.paths.lib + 'database-client');
const redisClient = require(global.paths.lib + 'redis-client');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const userHandler = require(global.paths.lib + 'user-handler');
require(global.paths.lib + 'turntable-handler');

bot.on('message', message => {
  messageHandler.handleMessage(bot, message);

  // Add a chatMessage point (bots can't earn points)
  if (!message.author.bot) {
    userHandler.addPoints(message.author.id, { chatMessage: 1 });
  }
});

bot.on('ready', data => {
  // Try to disconnect from any active voice channels
  for (let connection of bot.voiceConnections) {
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

bot.on('guildCreate', guild => {
  serverSettingsManager.registerServer(guild.id);
  serverSettingsManager.loadSettings(guild.id);

  // Create database entries for new users
  for (const [ userId, user ] of guild.members) {
    userHandler.createUser(user.user, guild.id);
  }
});

bot.on('guildDelete', guild => {
  serverSettingsManager.deregisterServer(guild.id);
});

bot.on('guildMemberAdd', member => {
  const settings = serverSettingsManager.getSettings(member.guild.id);

  // Welcome user, if joinMessage is enabled
  if (settings.announcements.announcementChannel && settings.announcements.userJoin.enabled && 
    settings.announcements.userJoin.message) {

    let joinMessage = settings.announcements.userJoin.message;
    joinMessage = joinMessage.replace(/\${username}/g, '<@' + member.id + '>');

    const joinChannel = member.guild.channels.get(settings.announcements.announcementChannel)
    
    if (joinChannel) {
      joinChannel.send(joinMessage)
        .catch(e => { console.log(e); })
    }
  }

  // Log event if logging enabled for this server
  // TODO: Make generic logging handler file
  // TODO: Don't log if it's in an excluded role/channel
  if (settings.logs.enabled && settings.logs.logChannel) {
    const logMessage = `**${member.user.tag}** joined ${member.guild.name}.`;
    const logChannel = member.guild.channels.get(settings.logs.logChannel)
    
    if (logChannel) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }

  // If autorole is enabled, add the default role to this user
  if (settings.autorole.enabled && settings.autorole.defaultRole) {
    member.addRole(settings.autorole.defaultRole)
      .catch(err => {
        // TODO: This will likely be a permission error - the bot needs to remove the role
        // and fire an alert to a logging channel
        console.warn(err);
      });
  }

  userHandler.createUser(member.user, member.guild.id);
});

bot.on('guildMemberRemove', member => {
  const settings = serverSettingsManager.getSettings(member.guild.id);
  
  // Announce member's departure, if leaveMessage is enabled
  if (settings.announcements.announcementChannel && settings.announcements.userLeave.enabled && 
    settings.announcements.userLeave.message) {

    let leaveMessage = settings.announcements.userLeave.message;
    leaveMessage = leaveMessage.replace(/\${username}/g, member.user.username);

    try {
      member.guild.channels.get(settings.announcements.announcementChannel).send(leaveMessage);
    } catch (e) {
      console.log(e);
    }
  }

  // Log event if logging enabled for this server
  if (settings.logs.enabled && settings.logs.logChannel) {
    const logMessage = `**${member.user.tag}** left ${member.guild.name}.`;
    const logChannel = member.guild.channels.get(settings.logs.logChannel);
    
    if (logChannel) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }
});

bot.on('messageDelete', message => {
  const settings = serverSettingsManager.getSettings(message.guild.id);

  // Log event if logging enabled for this server
  if (settings.logs.enabled && settings.logs.logChannel && !message.author.bot && message.channel.id !== settings.log.logChannel) {
    const logMessage = `A message by **${message.author.tag}** was deleted from <#${message.channel.id}>.\n\`\`\`\n${message.content}\n\`\`\``;
    const logChannel = message.guild.channels.get(settings.logs.logChannel);
    
    if (logChannel) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }
});

bot.on('messageDeleteBulk', messages => {
  const settings = serverSettingsManager.getSettings(messages.first().guild.id);

  // Log event if logging enabled for this server
  if (settings.logs.enabled && settings.logs.logChannel) {
    const logMessage = `${messages.size} messages were deleted.`
    const logChannel = messages.first().guild.channels.get(settings.logs.logChannel);
    
    if (logChannel) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }
});

bot.on('messageUpdate', (oldMessage, newMessage) => {
  const settings = serverSettingsManager.getSettings(newMessage.guild.id);

  // Log event if logging enabled for this server
  if (settings.logs.enabled && settings.logs.logChannel && !newMessage.author.bot && message.channel.id !== settings.log.logChannel) {
    const logMessage = `A message by **${newMessage.author.tag}** was edited in <#${newMessage.channel.id}>.\n_Old message_\n\`\`\`\n${oldMessage.content}\n\`\`\`\n_New message_\n\`\`\`\n${newMessage.content}\n\`\`\``;
    const logChannel = newMessage.guild.channels.get(settings.logs.logChannel);
    
    if (logChannel) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }
});

bot.on('guildBanAdd', (guild, user) => {
  const settings = serverSettingsManager.getSettings(guild.id);

  // Log event if logging enabled for this server
  if (settings.logs.enabled && settings.logs.logChannel) {
    const logMessage = `**${user.tag}** was banned from ${guild.name}.`;
    const logChannel = guild.channels.get(settings.logs.logChannel);
    
    if (logChannel) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }
});

// TODO: I hope I don't have to, but TT votes might need to be handled via this
bot.on('messageReactionAdd', (messageReaction, user) => {

});

bot.on('reconnecting', () => {
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
  dbClient.closeDb();

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
