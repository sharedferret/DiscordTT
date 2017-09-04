const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const Discord = require('discord.js');
const moment = require('moment');

const handleGuildMemberAdd = (embed, data) => {
  embed.setAuthor(`Joined ${data.member.guild.name}`, data.member.user.avatarURL);
  embed.setThumbnail(data.member.user.avatarURL);
  embed.addField('User', `<@${data.member.user.id}>`);

  const userJoinDate = moment(data.member.user.createdAt);
  embed.addField('User Creation Date', userJoinDate.format('dddd, MMMM Do YYYY, h:mm a (UTC)'));

  embed.setColor('GREEN');
};

const handleGuildMemberRemove = (embed, data) => {
  embed.setAuthor(`Left ${data.member.guild.name}`, data.member.user.avatarURL);
  embed.setThumbnail(data.member.user.avatarURL);
  embed.addField('User', `<@${data.member.user.id}>`);

  const guildJoinDate = moment(data.member.joinedAt);
  embed.addField('Guild Join Date', guildJoinDate.format('dddd, MMMM Do YYYY, h:mm a (UTC)'));
  embed.addField('Time on Server', moment.preciseDiff(guildJoinDate, moment()));

  if (data.member.lastMessage) {
    embed.addField('Last Message', `[<#${data.member.lastMessage.channel.id}>] ${data.member.lastMessage.content}`);
  }

  embed.setColor('RED');
};

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
        handleGuildMemberAdd(embed, data);
        break;
      case 'guildMemberRemove':
        handleGuildMemberRemove(embed, data);
        break;
      case 'messageDelete':
        if (!data.message.author.bot && data.message.channel.id !== settings.logs.logChannel) {
          // Check if channel is excluded
          if (settings.logs.excludedChannels && settings.logs.excludedChannels.indexOf(data.message.channel.id) !== -1) {
            return;
          }

          embed.setAuthor('Message Deleted', data.message.author.avatarURL);
          embed.setThumbnail(data.message.author.avatarURL);
          embed.addField('User', `<@${data.message.author.id}>`, true);
          embed.addField('Channel', `<#${data.message.channel.id}>`, true);
          embed.addField('Message', data.message.content ? data.message.content : '_No content_');
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
          embed.addField('User', `<@${data.newMessage.author.id}>`, true);
          embed.addField('Channel', `<#${data.newMessage.channel.id}>`, true);
          embed.addField('Old Message', data.oldMessage.content ? data.oldMessage.content : '_No content_');
          embed.addField('New Message', data.newMessage.content ? data.newMessage.content : '_No content_');
        } else {
          return;
        }
        break;
      case 'guildBanAdd':
        embed.setTitle('Banned');
        embed.setThumbnail(data.user.avatarURL);
        embed.setColor('RED');
        embed.addField('User', `<@${data.user.tag}>`, true);
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