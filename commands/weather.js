const request = require('request');
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
  if (input.input) {
    retrieveWeather(bot, message, input, null);
  } else {
    userHandler.getProfile(message.author, message.guild ? message.guild.id : null, function(profile) {
      if (profile) {
        const metadata = JSON.parse(profile.metadata);

        if (metadata && metadata.location && metadata.location.formatted_address) {
          input.input = metadata.location.formatted_address;
          return retrieveWeather(bot, message, input, metadata);
        }
      }

      message.reply('please provide a city to search for.');
    });
  }
};

const retrieveWeather = function(bot, message, input, metadata) {
  const serverSettings = message.guild ? serverSettingsManager.getSettings(message.guild.id) : null;
  const searchParameters = input.input;

  let source = 'OpenWeatherMap';

  if (serverSettings && serverSettings.weather && serverSettings.weather.source) {
    source = serverSettings.weather.source;
  }

  if (input.flags && input.flags.owm === '') {
    source = 'OpenWeatherMap';
  }

  if (input.flags && input.flags.darksky === '') {
    source = 'DarkSky';
  }

  // TODO: Quota management, fallback to OWM if DS quota reached
  // TODO: Shared code with forecast.js
  if (source == 'DarkSky') {
    if (!metadata) {
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
            console.warn('Geocode error', err);
          }

          const metadata = {};
          metadata.location = {};
          metadata.location.coordinates = {};

          const metadataComponents = {};

          if (response.json.status == 'ZERO_RESULTS') {
            return message.reply('I couldn\'t find that city.');
          }

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

          retrieveWeather_DarkSky(bot, message, input, metadata);
        }
      );
    } else {
      retrieveWeather_DarkSky(bot, message, input, metadata);
    }
  } else {
    retrieveWeather_OpenWeatherMap(bot, message, searchParameters);
  }
};

const retrieveWeather_OpenWeatherMap = function(bot, message, searchParameters) {
  // Form request URL
  // If a US zip is requested, switch API call
  let apiUrl;

  console.log('looking for ' + searchParameters);

  if (/^\d{5}(-\d{4})?$/.test(searchParameters)) {
    apiUrl = 'http://api.openweathermap.org/data/2.5/weather?appid=' + config.api.openweathermap + '&zip=' + searchParameters
  } else {
    apiUrl = 'http://api.openweathermap.org/data/2.5/weather?appid=' + config.api.openweathermap + '&q=' + searchParameters;
  }

  cacheManager.makeCachedApiCall(
    `OpenWeatherMap:${apiUrl}`,
    900,
    (callback) => {
      request(apiUrl, callback);
    },
    (callback, err, response, body) => {
      callback.apply(this, [err, body]);
    },
    (error, body) => {
      if (error) return console.log(error);

      try {
        const weather = JSON.parse(body);

        if (weather.cod != 200) {
          return message.reply('I couldn\'t find that city.');
        }

        const embed = Utils.createEmbed(message, 'OpenWeatherMap');

        const country = countryData.countries[weather.sys.country];

        embed.setTitle(country.emoji + ' Weather for ' + weather.name + ', ' + country.name + ' (' + Utils.formatLatitude(weather.coord.lat) + ', ' + Utils.formatLongitude(weather.coord.lon) + ')');
        embed.addField('Conditions', Utils.weatherIconEmoji[weather.weather[0].icon] + ' ' + weather.weather[0].main, true);
        embed.addField('Temperature', Utils.kelvinToFahrenheit(weather.main.temp).toFixed() + '°F (' + Utils.kelvinToCelsius(weather.main.temp).toFixed() + '°C)', true);
        embed.addField('Humidity', weather.main.humidity + '%', true);
        if (weather.visibility) {
          embed.addField('Visibility', Utils.metersToMiles(weather.visibility).toFixed(1) + ' miles (' + (weather.visibility / 1000).toFixed() + 'km)', true);
        } else {
          embed.addField('Visibility', 'Unknown', true);
        }
        embed.addField('Wind', Utils.emojiForDirection(weather.wind.deg) + ' ' + Utils.mpsToMph(weather.wind.speed).toFixed() + ' mph (' + Utils.mpsToKph(weather.wind.speed).toFixed() + ' kph)', true);
        embed.addField('Pressure', Utils.hpaToInhg(weather.main.pressure).toFixed(2) + ' inches', true);

        embed.setThumbnail('https://maps.googleapis.com/maps/api/staticmap?center=' + weather.coord.lat + ',' + weather.coord.lon + '&zoom=7&size=110x110&maptype=roadmap&key=' + config.api.google);

        message.channel.send('', { embed: embed });
      } catch (e) {
        return message.reply('I couldn\'t get a forecast at this time.');
      }
    }
  );
};

const retrieveWeather_DarkSky = function(bot, message, input, metadata) {
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
        console.warn('Error while retrieving Dark Sky response', err);
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

      embed.setTitle(country.emoji + ' Weather for ' + locationString + ' (' + Utils.formatLatitude(res.latitude) + ', ' + Utils.formatLongitude(res.longitude) + ')');
      
      let icon = Utils.weatherIconEmoji_DarkSky[res.currently.icon];

      if (!icon) {
        icon = res.currently.icon;
      }

      embed.addField('Conditions', `${icon} ${res.currently.summary}`, true);
      embed.addField('Temperature', `${Math.round(res.currently.temperature)}${Utils.unitSymbols[units].temperature} (Feels Like ${Math.round(res.currently.apparentTemperature)}${Utils.unitSymbols[units].temperature})`, true);
      embed.addField('Humidity', `${(res.currently.humidity * 100).toFixed(0)}%`, true);

      if (res.currently.visibility) {
        embed.addField('Visibility', `${res.currently.visibility} ${Utils.unitSymbols[units].distance}`, true);
      }

      embed.addField('Wind', `${Utils.emojiForDirection(res.currently.windBearing)} ${res.currently.windSpeed.toFixed(1)} ${Utils.unitSymbols[units].speed}`, true);

      switch (units) {
        case 'us':
          embed.addField('Pressure', `${Utils.hpaToInhg(res.currently.pressure).toFixed(2)} inHg`, true);
          break;
        case 'ca':
        embed.addField('Pressure', `${(res.currently.pressure / 10).toFixed(2)} kPa`, true);
          break;
        case 'uk2':
        embed.addField('Pressure', `${res.currently.pressure.toFixed(2)} mb`, true);
          break;
        case 'si':
        embed.addField('Pressure', `${res.currently.pressure.toFixed(2)} hPa`, true);
          break;
        default:
          break;
      }

      if (res.currently.nearestStormDistance && res.currently.nearestStormBearing && res.currently.nearestStormDistance < 100) {
        embed.addField('Nearest Storm', `${Utils.emojiForDirection(res.currently.nearestStormBearing)} ${res.currently.nearestStormDistance} ${Utils.unitSymbols[units].distance}`, true);
      }

      if (res.currently.uvIndex) {
        embed.addField('UV Index', res.currently.uvIndex, true);
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
    }
  );
};

const limiter = RateLimiter({
  namespace: 'UserRateLimit:weather:',
  interval: 180000,
  maxInInterval: 5,
  minDifference: 3000,
  storeBlocked: false
});

const info = {
  name: ['weather', 'wx'],
  description: 'Gets the current conditions for a given location.',
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
        owm: 'Use data from the OpenWeatherMap API.',
        darksky: 'Use data from the Dark Sky API (if available/permitted).'
      }
    }
  },
  rateLimiter: limiter
};

module.exports = {
  info: info
};
