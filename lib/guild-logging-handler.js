const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const Discord = require('discord.js');

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

    const embed = new Discord.RichEmbed();
    embed.setTimestamp(new Date());
    
    let logMessage = '';

    switch(eventName) {
      case 'guildMemberAdd':
        embed.setAuthor(`Joined ${data.member.guild.name}`, data.member.user.avatarURL);
        embed.setThumbnail(data.member.user.avatarURL);
        embed.addField('User', data.member.user.tag);
        embed.setColor('GREEN');
        break;
      case 'guildMemberRemove':
        embed.setAuthor(`Left ${data.member.guild.name}`, data.member.user.avatarURL);
        embed.setThumbnail(data.member.user.avatarURL);
        embed.addField('User', data.member.user.tag);
        embed.setColor('RED');
        break;
      case 'messageDelete':
        if (!data.message.author.bot && data.message.channel.id !== settings.logs.logChannel) {
          // Check if channel is excluded
          if (settings.logs.excludedChannels && settings.logs.excludedChannels.indexOf(data.message.channel.id) !== -1) {
            return;
          }

          embed.setAuthor('Message Deleted', data.message.author.avatarURL);
          embed.setThumbnail(data.message.author.avatarURL);
          embed.addField('User', data.message.author.tag, true);
          embed.addField('Channel', `<#${data.message.channel.id}>`, true);
          embed.addField('Message', data.message.content);
          embed.setColor('RED');
        } else {
          return;
        }
        break;
      case 'messageDeleteBulk':
        embed.setTitle(`Messages Deleted`);
        embed.addField('Count', data.messages.size);
        embed.setColor('RED');
        break;
      case 'messageUpdate':
        // Check if channel is excluded
        if (settings.logs.excludedChannels && settings.logs.excludedChannels.indexOf(data.oldMessage.channel.id) !== -1) {
          return;
        }

        if (!data.newMessage.author.bot && data.newMessage.channel.id !== settings.logs.logChannel && data.newMessage.content != data.oldMessage.content) {
          embed.setAuthor('Message Edited', data.newMessage.author.avatarURL);
          embed.setThumbnail(data.newMessage.author.avatarURL);
          embed.setColor('GOLD');
          embed.addField('User', data.newMessage.author.tag, true);
          embed.addField('Channel', `<#${data.newMessage.channel.id}>`, true);
          embed.addField('Old Message', data.oldMessage.content);
          embed.addField('New Message', data.newMessage.content);
        } else {
          return;
        }
        break;
      case 'guildBanAdd':
        embed.setTitle('Banned');
        embed.setThumbnail(data.user.avatarURL);
        embed.setColor('RED');
        embed.addField('User', data.user.tag, true);
        break;
      default:
        return;
        break;
    }
    
    const logChannel = guild.channels.get(settings.logs.logChannel);

    if (logChannel) {
      logChannel.send('', { embed: embed })
        .catch(e => { console.log(e); });
    }
  }
};

module.exports = {
  logEvent: logEvent
}