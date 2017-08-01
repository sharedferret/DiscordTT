const moment = require('moment');
require('moment-timezone');
const DarkSky = require('dark-sky');
const forecast = new DarkSky(config.api.darksky);
const countryData = require('country-data');
const userHandler = require(global.paths.lib + 'user-handler');
const gmapsClient = require('@google/maps').createClient({ key: config.api.google });
const tzlookup = require('tz-lookup');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const RateLimiter = require(global.paths.lib + 'rate-limiter');

const handleMessage = function(bot, message, input) {
  if (requestIsEligible(message)) {
    if (input.input) {
      const searchParameters = input.input;

      if (global.locationCache[searchParameters]) {
        retrieveForecast(bot, message, input, global.locationCache[searchParameters]);
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

          retrieveForecast(bot, message, input, metadata);
        });
      }
    } else {
      userHandler.getProfile(message.author, null, function(profile) {
        if (profile) {
          const metadata = JSON.parse(profile.metadata);

          if (metadata && metadata.location) {
            retrieveForecast(bot, message, input, metadata);
          } else {
            message.reply('your profile doesn\'t have a location. Set one by typing `' + Utils.getPrefix(message.guild ? message.guild.id : null) + 'profile set location YOUR_LOCATION`.');
          }
        } else {
          message.reply('please provide a city to search for.');
        }
      });
    }
  } else {
    message.reply('this command is not enabled on this server.');
  }
};

const retrieveForecast = function(bot, message, input, metadata) {
  let units = 'auto';

  if (input.flags && input.flags.units) {
    if (input.flags.units == 'local') units = 'auto';
    if (input.flags.units == 'us') units = 'us';
    if (input.flags.units == 'uk') units = 'uk2';
    if (input.flags.units == 'ca') units = 'ca';
    if (input.flags.units == 'si') units = 'si';
  }

  forecast
    .latitude(metadata.location.coordinates.latitude)
    .longitude(metadata.location.coordinates.longitude)
    .units(units)
    .get()
    .then(res => {
      units = res.flags.units;

      const embed = Utils.createEmbed(message, 'Dark Sky');

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

      let days = 3;

      if (input.flags && input.flags.days && input.flags.days > 0 && input.flags.days <= 7) {
        days = input.flags.days;
      }

      for (let i = 0; i < days; i++) {
        const dailyWeather = res.daily.data[i];

        const day = moment(dailyWeather.time * 1000).tz(res.timezone).format(Utils.unitSymbols[units].date);

        let weatherString = '';

        let weatherIcon = Utils.weatherIconEmoji_DarkSky[dailyWeather.icon];

        if (!weatherIcon) {
          weatherIcon = dailyWeather.icon;
        }

        weatherString += `${weatherIcon} ${dailyWeather.summary}\n`;
        weatherString += `High: ${dailyWeather.temperatureMax.toFixed(0)}${Utils.unitSymbols[units].temperature}, Low: ${dailyWeather.temperatureMin.toFixed(0)}${Utils.unitSymbols[units].temperature}\n`;
        weatherString += `Sunrise: ${moment(dailyWeather.sunriseTime * 1000).tz(res.timezone).format(Utils.unitSymbols[units].time)}, Sunset: ${moment(dailyWeather.sunsetTime * 1000).tz(res.timezone).format(Utils.unitSymbols[units].time)}`;

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
            alertText += ' (Until ' + moment(alert.expires * 1000).tz(res.timezone).format(Utils.unitSymbols[units].dateShort + ', ' + Utils.unitSymbols[units].time) + ')';
          }

          alertText += '\n';
        }
        embed.addField('Alerts', alertText);
      }

      embed.setThumbnail('https://maps.googleapis.com/maps/api/staticmap?center=' + res.latitude + ',' + res.longitude + '&zoom=7&size=110x110&maptype=roadmap&key=' + config.api.google);

      message.channel.send('', { embed: embed });      

    })
    .catch(err => {
      console.warn('Error while retrieving Dark Sky response', err);
    })
};

const requestIsEligible = function(message) {
  if (!message.guild) {
    return true;
  }

  const serverSettings = serverSettingsManager.getSettings(message.guild.id);
  return serverSettings.weather && serverSettings.weather.enabled && serverSettings.weather.source === 'DarkSky';
};

const limiter = RateLimiter({
  namespace: 'UserRateLimit:forecast:',
  interval: 180000,
  maxInInterval: 5,
  minDifference: 3000,
  storeBlocked: false
});

const info = {
  name: ['forecast'],
  description: 'Gets the forecast for a given location.',
  type: CommandType.General,
  hidden: false,
  operations: {
    _default: {
      handler: handleMessage,
      usage: {
        '[location]': 'This command accepts most location identifiers, including town names and postcodes.',
        '': 'This command will use the location saved in your profile.'
      },
      flags: {
        units: 'Specify what units this command should use: local/us/uk/ca/si',
        days: 'How many days should be displayed (1-7)'
      }
    }
  },
  rateLimiter: limiter
};

module.exports = {
  info: info
};
