const db = require(global.paths.lib + 'database-client').db;
const userHandler = require(global.paths.lib + 'user-handler');
const countryData = require('country-data');
const gmapsClient = require('@google/maps').createClient({ key: config.api.google });
const tzlookup = require('tz-lookup');
const moment = require('moment');
require('moment-timezone');
const cacheManager = require(global.paths.lib + 'cache-manager');


const displayProfile = function(bot, message, input) {
  if (message.mentions.users.size > 0) {
    displayProfileForUser(bot, message, message.mentions.users.first());
  } else if (input.input) {
    // TODO: Accept uid, tags
    displayProfileForUser(bot, message, message.author);
  } else {
    displayProfileForUser(bot, message, message.author);
  }
};

const displayProfileForUser = function(bot, message, user) {
  const embed = Utils.createEmbed(message, null, true);

  embed.setAuthor(user.username, user.avatarURL);
  embed.setTimestamp(new Date());
  embed.setThumbnail(user.avatarURL);
  embed.setFooter('Requested by ' + message.author.username, message.author.avatarURL);

  userHandler.getProfile(user, message.guild ? message.guild.id : null, function(profile) {
    if (!profile || !profile.id) return message.reply('I couldn\'t find a profile for that user!');
    
    const metadata = JSON.parse(profile.metadata);

    if (metadata) {
      if (metadata.description) {
        embed.setDescription(metadata.description);
      }

      // Create Location and Timezone fields
      if (metadata.location) {
        const country = countryData.countries[metadata.location.country];

        let locationString = country.emoji + ' ';

        if (metadata.location.components) {
          if (metadata.location.components.locality) {
            locationString += metadata.location.components.locality + ', ';
          } else if (metadata.location.components.postal_town) {
            locationString += metadata.location.components.postal_town + ', ';
          }

          if (metadata.location.components.administrative_area_level_1) {
            locationString += metadata.location.components.administrative_area_level_1 + ', ';
          }
        }

        locationString += country.name;

        embed.addField('Location', locationString);

        if (metadata.location.timezone) {
          // embed.addField('Time Zone', metadata.location.timezone);
          const localTime = moment().tz(metadata.location.timezone);
          embed.addField('Current Time', localTime.format('MMMM Do, h:mm a') + ' (' + metadata.location.timezone + ')');
        }
      } else {
        embed.addField('Location', '_No location set._');
      }

      // Create Accounts fields
      if (metadata.accounts && metadata.accounts.battlenet) {
        embed.addField('Battle.net Tag', metadata.accounts.battlenet);
      }
    } else {
      embed.addField('Location', '_No location set._');
    }

    // Create Points field
    const userLevel = Utils.calculateUserLevel(profile.userPoints);
    // embed.addField('Points', `:pound: 0\t:cd: ${profile.points} \t:star: Level ${userLevel.level} (${userLevel.points} pts)`, true);
    
    // embed.addField('Level', `:star: Level ${userLevel.level} (${userLevel.points} pts)`, true);
    // embed.addField('DJ Points', `:cd: ${profile.points}`, true);
    // embed.addField('Money', ':pound: 0', true);

    embed.addField('Points', `:star: Level ${userLevel.level} (${userLevel.points} pts)\t:cd: ${profile.points}`, true);
    
    embed.addField('Money', ':pound: 0', true);

    message.channel.send('', { embed: embed });
  });
}

const profileSetCountry = function(bot, message, input) {
  const country = input.input;

  // First, try lookup by emoji
  let dataForCountry = countryData.lookup.countries({ emoji: country })[0];

  if (!dataForCountry) {
    // Next, by 2-digit ISO code
    dataForCountry = countryData.lookup.countries({ alpha2: country })[0];

    if (!dataForCountry) {
      // Next, by name
      dataForCountry = countryData.lookup.countries({ name: country })[0];
      if (!dataForCountry) {
        return message.reply('I couldn\'t find that country. Try using the flag emoji for your country instead!');
      }
    }
  }

  userHandler.updateProfileData(message.author.id, {
    'location.country': dataForCountry.alpha2
  });
};

const profileSetLocation = function(bot, message, input) {
  const inputLocation = input.input;

  cacheManager.makeCachedApiCall(
    `Geocode:${inputLocation}`,
    1209600, // 14 days
    (callback) => {
      gmapsClient.geocode({
        address: inputLocation
      }, callback);
    },
    (callback, err, response) => {
      callback.apply(this, [err, response]);
    },
    (err, response) => {
      if (err) {
        message.reply('I couldn\'t find that city.');
        log.info('Geocode error', err);
      }

      if (response.json.status == 'ZERO_RESULTS') {
        return message.reply('I couldn\'t find that city.');
      }

      const result = response.json.results[0];

      const metadata = {};
      const metadataComponents = {};

      for (const component of result.address_components) {
        metadataComponents[component.types[0]] = component.long_name;

        if (component.types[0] == 'country') {
          metadata['location.country'] = component.short_name;
        }
      }

      metadata['location.components'] = metadataComponents;

      metadata['location.coordinates.latitude'] = result.geometry.location.lat;
      metadata['location.coordinates.longitude'] = result.geometry.location.lng;
      metadata['location.formatted_address'] = result.formatted_address;
      metadata['location.timezone'] = tzlookup(result.geometry.location.lat, result.geometry.location.lng);

      userHandler.updateProfileData(message.author.id, metadata);
      message.reply('I\'ve added the location `' + result.formatted_address + '` to your profile.');
    }
  );
};

const profileSetBattletag = function(bot, message, input) {
  const tag = input.input;

  // TODO: Validate btag
  userHandler.updateProfileData(message.author.id, 
    { 'accounts.battlenet': tag });
  message.reply('I\'ve added `' + tag + '` to your profile.');
};

const profileSetDescription = function(bot, message, input) {
  const description = input.input;
  
  userHandler.updateProfileData(message.author.id,
    { 'description': description });
  message.reply('I\'ve updated your description.');
};

const info = {
  name: ['profile'],
  description: 'View your profile.',
  type: CommandType.Profile,
  hidden: false,
  operations: {
    _default: {
      handler: displayProfile,
      usage: {
        '': 'View your profile.',
        '@[user]': 'View another user\'s profile by tag.',
//        '[user:####]': 'View another user\'s profile by username and Discord hash.'
      }
    },
    'set location': {
      handler: profileSetLocation,
      usage: {
        '[location]': 'Set your location.'
      }
    },
    'set country': {
      handler: profileSetCountry,
      usage: {
        '[country emoji]': 'Set your country.'
      }
    },
    'set description': {
      handler: profileSetDescription,
      usage: {
        '[description]': 'Add a profile description.'
      }
    },
    'set battletag': {
      handler: profileSetBattletag,
      usage: {
        '[Battle.net tag]': 'Set your Blizzard battletag.'
      }
    }
  },
  examples: [
    'profile set location Seattle, WA',
    'profile @Tohru'
  ]
};

module.exports = {
  info: info
};
