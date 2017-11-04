const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const request = require('request');
const cacheManager = require(global.paths.lib + 'cache-manager');
const extraLifeApi = require('extra-life-api');
const Discord = require('discord.js');

const teams = {};

const getTeamId = (message, input) => {
  let teamId = 0;

  // If a team ID was passed in, use it
  if (input.input) {
    teamId = parseInt(input.input);
  } else {
    const serverSettings = serverSettingsManager.getSettings(message.guild.id);
    if (serverSettings.extraLife && serverSettings.extraLife.teamId) {
      teamId = parseInt(serverSettings.extraLife.teamId);
    }
  }

  return teamId;
};

const showTeamData = (bot, message, input) => {
  const teamId = getTeamId(message, input);

  extraLifeApi.getTeamInfo(teamId)
    .then(data => {
      const embed = Utils.createEmbed(message, 'Extra Life');

      embed.setTitle(data.name);
      embed.setDescription(`_Donate to this team here: https://www.extra-life.org/index.cfm?fuseaction=donorDrive.team&teamID=${teamId}_`);
      embed.setThumbnail(data.avatarImageURL);
      embed.addField('Amount Raised', `$${data.totalRaisedAmount.toFixed(2)}`, true);
      embed.addField('Fundraising Goal', `$${data.fundraisingGoal.toFixed(2)}`, true);

      const teamCaptains = data.members.filter(i => { return i.isTeamCaptain === true; });

      embed.addField(`Team Captain${teamCaptains.length > 1 ? 's' : ''}`, teamCaptains.map(i => { return `${i.displayName} - _Raised $${i.totalRaisedAmount.toFixed(2)}_`; }).join('\n'));

      const teamMembers = data.members.filter(i => { return i.isTeamCaptain !== true; });

      embed.addField('Team Members', teamMembers.map(i => { return `${i.displayName} - _Raised $${i.totalRaisedAmount.toFixed(2)}_`; }).join('\n'));

      message.channel.send('', { embed: embed });
    })
};

const showDonationLink = (bot, message, input) => {

  message.reply(`donate to this team here: https://www.extra-life.org/index.cfm?fuseaction=donorDrive.team&teamID=${teamId}_`);
};

const handleWatch = (bot, message, input) => {
  const serverSettings = serverSettingsManager.getSettings(message.guild.id);
  if (serverSettings.extraLife && serverSettings.extraLife.teamId) {
    teamId = parseInt(serverSettings.extraLife.teamId);
  }

  if (input.input === 'enable') {
    console.log('enabling watcher')

    if (!teams[teamId]) {
      teams[teamId] = {};
      teams[teamId].channel = message.channel;
    }

    if (!teams[teamId].watcher) {
      teams[teamId].watcher = setInterval(() => {
        extraLifeApi.getTeamDonations(teamId)
          .then(data => {
            if (!teams[teamId].donations) {
              teams[teamId].donations = {};
              for (const donation of data.recentDonations) {
                const id = donation.donorName + ':' + donation.createdOn;
                teams[teamId].donations[id] = donation;
              }
            }

            for (const donation of data.recentDonations) {
              const id = donation.donorName + ':' + donation.createdOn;
              if (!teams[teamId].donations[id]) {
                // Add donation
                teams[teamId].donations[id] = donation;

                // Send message
                const embed = new Discord.RichEmbed();

                embed.setTitle('New Donation');
                embed.setThumbnail('http:' + donation.avatarImageURL);

                embed.addField('For Participant', donation.participantDisplayName);
                embed.addField('Donor', donation.donorName ? donation.donorName : 'Anonymous', true);
                embed.addField('Amount', donation.donationAmount ? `$${donation.donationAmount.toFixed(2)}` : 'Undisclosed', true);
                if (donation.message) embed.addField('Message', donation.message);
                embed.setTimestamp(new Date(donation.timestamp));

                teams[teamId].channel.send('', { embed: embed });
              }
            }
          })
      }, 60000);
    }
  } else if (input.input === 'disable') {
    console.log('disabling watcher');
    clearInterval(teams[teamId].watcher);
    teams[teamId].watcher = undefined;
    teams[teamId].donations = undefined;
  }
};

const showUserProfile = (bot, message, input) => {

};

const info = {
  name: ['extralife', 'extra'],
  description: 'Extra Life commands.',
  operations: {
    _default: {
      handler: showTeamData,
    },
    team: {
      handler: showTeamData,
      usage: {
        '': 'Show information about this server\'s Extra Life team.'
      }
    },
    donate: {
      handler: showDonationLink,
      usage: {
        '[role]': 'Get the donation link for this server\'s Extra Life team.'
      }
    },
    watch: {
      handler: handleWatch,
      usage: {
        '[role]': 'Removes the specified role.'
      }
    },
    profile: {
      handler: showUserProfile,
      usage: {
        '': 'Show your profile.'
      }
    }
  },
  type: CommandType.Other
};

module.exports = {
  info: info
};
