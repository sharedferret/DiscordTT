const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');

// data contains the event-specific data passed to the original event
const logEvent = (eventName, guild, member, data) => {
  if (!guild) return;
  
  const settings = serverSettingsManager.getSettings(guild.id);

  if (settings.logs.enabled && settings.logs.logChannel) {

    // Check if user is in an excluded role
    if (member && settings.logs.excludedRoles) {
      if (!member.roles.every(i => { return settings.logs.excludedRoles.indexOf(i) === -1; })) {
        return;
      }
    }
    
    let logMessage = '';

    switch(eventName) {
      case 'guildMemberAdd':
        logMessage = `**${data.member.user.tag}** joined ${data.member.guild.name}.`;
        break;
      case 'guildMemberRemove':
        logMessage = `**${data.member.user.tag}** left ${data.member.guild.name}.`;
        break;
      case 'messageDelete':
        if (!data.message.author.bot && data.message.channel.id !== settings.log.logChannel) {
          // Check if channel is excluded
          if (settings.logs.excludedChannels && settings.logs.excludedChannels.indexOf(data.message.channel.id) !== -1) {
            return;
          }

          logMessage = `A message by **${data.message.author.tag}** was deleted from <#${data.message.channel.id}>.\n\`\`\`\n${data.message.content}\n\`\`\``;
        }
        break;
      case 'messageDeleteBulk':
        logMessage = `${data.messages.size} messages were deleted.`;
        break;
      case 'messageUpdate':
        // Check if channel is excluded
        if (settings.logs.excludedChannels && settings.logs.excludedChannels.indexOf(data.oldMessage.channel.id) !== -1) {
          return;
        }

        if (!data.newMessage.author.bot && data.newMessage.channel.id !== settings.logs.logChannel && data.newMessage.content != data.oldMessage.content) {
          logMessage = `A message by **${data.newMessage.author.tag}** was edited in <#${data.newMessage.channel.id}>.\n_Old message_\n\`\`\`\n${data.oldMessage.content}\n\`\`\`\n_New message_\n\`\`\`\n${data.newMessage.content}\n\`\`\``;
        }
        break;
      case 'guildBanAdd':
        logMessage = `**${data.user.tag}** was banned from ${guild.name}.`;
        break;
      default:
        break;
    }
    
    const logChannel = guild.channels.get(settings.logs.logChannel);

    if (logChannel && logMessage) {
      logChannel.send(logMessage)
        .catch(e => { console.log(e); });
    }
  }
};

module.exports = {
  logEvent: logEvent
}