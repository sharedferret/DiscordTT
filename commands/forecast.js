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
const cacheManager = require(global.paths.lib + 'cache-manager');

const handleMessage = function(bot, message, input) {
  if (requestIsEligible(message)) {
    if (input.input) {
      const searchParameters = input.input;

      cacheManager.makeCachedApiCall(
        `Geocode:${searchParameters}`,
        1209600, // 14 days
        (callback) => {
          gmapsClient.geocode({
            address: searchParameters
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

          retrieveForecast(bot, message, input, metadata);
        }
      );
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

  cacheManager.makeCachedApiCall(
    `DarkSky:${metadata.location.coordinates.latitude},${metadata.location.coordinates.longitude},${units}`,
    900,
    (callback) => {
      forecast
      .latitude(metadata.location.coordinates.latitude)
      .longitude(metadata.location.coordinates.longitude)
      .units(units)
      .get()
      .then(callback.bind(this, null))
      .catch(callback)
    },
    (callback, err, res) => {
      callback.apply(this, [err, res]);
    },
    (err, res) => {
      if (err) {
        log.warn('Error while retrieving Dark Sky response', err);
        return message.reply('I couldn\'t get a forecast at this time.');
      }

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
        Utils.addDarkSkyAlerts(res, units, embed);
      }

      embed.setThumbnail('https://maps.googleapis.com/maps/api/staticmap?center=' + res.latitude + ',' + res.longitude + '&zoom=7&size=110x110&maptype=roadmap&key=' + config.api.google);

      message.channel.send('', { embed: embed });
    }
  );
};

const requestIsEligible = function(message) {
  if (!message.guild) {
    return true;
  }

  const serverSettings = serverSettingsManager.getSettings(message.guild.id);
  return serverSettings.weather && serverSettings.weather.enabled && serverSettings.weather.source === 'DarkSky';
};

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
  }
};

module.exports = {
  info: info
};
