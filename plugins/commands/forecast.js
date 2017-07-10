const info = {
  name: ['forecast '],
  description: 'Gets the forecast for a given location.',
  usage: '`' + config.discriminator + 'weather [location]`: This command accepts most location identifiers, including town names and postcodes.\n`' + 
  config.discriminator + 'weather`: This command will use the location saved in your profile.',
  type: CommandType.General,
  hidden: false
};

const Discord = require('discord.js');
const moment = require('moment');
require('moment-timezone');
const DarkSky = require('dark-sky');
const forecast = new DarkSky(config.api.darksky);
const countryData = require('country-data');
const userHandler = require(global.paths.lib + 'user-handler');
const gmapsClient = require('@google/maps').createClient({ key: config.api.google });
const tzlookup = require('tz-lookup');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');

const handleMessage = function(bot, message) {
  const serverSettings = serverSettingsManager.getSettings(message.guild.id);

  if (serverSettings.weather && serverSettings.weather.enabled == 'true' && serverSettings.weather.source == 'DarkSky') {
    if (message.content.length <= config.discriminator.length + 9) {
      userHandler.getProfile(message.author, message.guild.id, function(profile) {
        if (profile) {
          const metadata = JSON.parse(profile.metadata);

          if (metadata && metadata.location) {
            retrieveForecast(bot, message, metadata);
          }
        } else {
          message.reply('please provide a city to search for.');
        }
      });
    } else {
      const searchParameters = message.content.substring(config.discriminator.length + 9, message.content.length);

      if (global.locationCache[searchParameters]) {
        retrieveForecast(bot, message, global.locationCache[searchParameters]);
      } else {
        gmapsClient.geocode({
          address: searchParameters
        }, function(err, response) {
          if (err) {
            message.reply('I couldn\'t find that city.');
            console.warn('Geocode error', err);
          }

          const metadata = {};
          metadata.location = {};
          metadata.location.coordinates = {};

          const metadataComponents = {};

          const result = response.json.results[0];

          for (const component of result.address_components) {
            metadataComponents[component.types[0]] = component.long_name;

            if (component.types[0] == 'country') {
              metadata.location.country = component.short_name;
            }
          }

          metadata.location.components = metadataComponents;
          metadata.location.coordinates.latitude = result.geometry.location.lat;
          metadata.location.coordinates.longitude = result.geometry.location.lng;
          metadata.location.formatted_address = result.formatted_address;
          metadata.location.timezone = tzlookup(result.geometry.location.lat, result.geometry.location.lng);

          // Add to cache
          global.locationCache[searchParameters] = metadata;

          retrieveForecast(bot, message, metadata);
        });
      }
    }
  } else {
    message.reply('this command is not enabled on this server.');
  }
};

const retrieveForecast = function(bot, message, metadata) {
  forecast
    .latitude(metadata.location.coordinates.latitude)
    .longitude(metadata.location.coordinates.longitude)
    .units('us')
    .get()
    .then(res => {
      const embed = new Discord.RichEmbed();

      const country = countryData.countries[metadata.location.country];

      let locationString = '';

      if (metadata.location.components) {
        if (metadata.location.components.locality) {
          locationString += metadata.location.components.locality + ', ';
        } else if (metadata.location.components.postal_town) {
          locationString += metadata.location.components.postal_town + ', ';
        }

        if (metadata.location.components.administrative_area_level_1) {
          locationString += metadata.location.components.administrative_area_level_1 + ', ';
        }

        locationString += country.name;
      }

      embed.setTitle(country.emoji + ' Forecast for ' + locationString + ' (' + Utils.formatLatitude(res.latitude) + ', ' + Utils.formatLongitude(res.longitude) + ')');

      for (let i = 0; i < 3; i++) {
        const dailyWeather = res.daily.data[i];

        const day = moment(dailyWeather.time * 1000).tz(res.timezone).format('dddd, MMMM Do YYYY');

        let weatherString = '';

        let weatherIcon = Utils.weatherIconEmoji_DarkSky[dailyWeather.icon];

        if (!weatherIcon) {
          weatherIcon = dailyWeather.icon;
        }

        weatherString += weatherIcon + ' ' + dailyWeather.summary + '\nHigh: ' + 
          dailyWeather.temperatureMax.toFixed(0) + '°F, Low: ' +
          dailyWeather.temperatureMin.toFixed(0) + '°F\nSunrise: ' + 
          moment(dailyWeather.sunriseTime * 1000).tz(res.timezone).format('h:mm a') + ', Sunset: ' +
          moment(dailyWeather.sunsetTime * 1000).tz(res.timezone).format('h:mm a');

        embed.addField(day, weatherString);
      }

      if (res.alerts) {
        let alertText = '';

        for (const alert of res.alerts) {
          switch (alert.severity) {
            case 'advisory':
              alertText += ':large_blue_diamond: ';
              break;
            case 'watch':
              alertText += ':o: ';
              break;
            case 'warning':
              alertText += ':red_circle: ';
              break;
            default:
          }

          alertText += alert.title;

          if (alert.expires) {
            alertText += ' (Until ' + moment(alert.expires * 1000).tz(res.timezone).format('MMMM Do, h:mm a') + ')';
          }

          alertText += '\n';
        }
        embed.addField('Alerts', alertText);
      }

      embed.setFooter('Requested by ' + message.author.username + ' | Dark Sky', message.author.avatarURL);
      embed.setTimestamp(new Date());
      embed.setThumbnail('https://maps.googleapis.com/maps/api/staticmap?center=' + res.latitude + ',' + res.longitude + '&zoom=7&size=110x110&maptype=roadmap&key=' + config.api.google);

      message.channel.send('', { embed: embed });      

    })
    .catch(err => {
      console.warn('Error while retrieving Dark Sky response', err);
    })
}

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'forecast ') || input == config.discriminator + 'forecast';
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
