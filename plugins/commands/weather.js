const info = {
  name: ['weather '],
  description: 'Gets the current conditions for a given location.',
  usage: '`' + config.discriminator + 'weather [location]`: This command accepts most location identifiers, including town names and postcodes.\n`' + 
  config.discriminator + 'weather`: This command will use the location saved in your profile.',
  type: CommandType.General,
  hidden: false
};

const request = require('request');
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
  if (message.content.length <= config.discriminator.length + 8) {
    userHandler.getProfile(message.author, message.guild.id, function(profile) {
      if (profile) {
        const metadata = JSON.parse(profile.metadata);

        if (metadata && metadata.location && metadata.location.formatted_address) {
          return retrieveWeather(bot, message, metadata.location.formatted_address, metadata);
        }
      }

      message.reply('please provide a city to search for.');
    });
  } else {
    const searchParameters = message.content.substring(config.discriminator.length + 8, message.content.length);

    retrieveWeather(bot, message, searchParameters, null);
  }
};

const retrieveWeather = function(bot, message, searchParameters, metadata) {
  const serverSettings = serverSettingsManager.getSettings(message.guild.id);

  // TODO: Quota management, fallback to OWM if DS quota reached
  // TODO: Shared code with forecast.js
  if (serverSettings.weather && serverSettings.weather.enabled == 'true') {
    if (serverSettings.weather.source == 'DarkSky') {
      if (!metadata) {
        if (global.locationCache[searchParameters]) {
          console.log('Using cached location data');
          retrieveWeather_DarkSky(bot, message, global.locationCache[searchParameters]);
        } else {
          console.log('Calling Google for geocode');

          // TODO: Cache this result
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

            retrieveWeather_DarkSky(bot, message, metadata);
          });
        }
      } else {
        retrieveWeather_DarkSky(bot, message, metadata);
      }
    } else {
      retrieveWeather_OpenWeatherMap(bot, message, searchParameters);
    }
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

  request(apiUrl,
    function (error, response, body) {
      if (error) return console.log(error);
      if (!response.statusCode == 200) return console.log('Non-200 response received', response);

      const weather = JSON.parse(body);

      if (weather.cod != 200) {
        return message.reply('I couldn\'t find that city.');
      }

      const embed = new Discord.RichEmbed();

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
      
      // TODO: This API is using fucking UTC without providing a local time offset
      // embed.addField('Sunrise', ':sunrise: ' + ' ' + sunrise.format('h:mm a'), true);
      // embed.addField('Sunset', ':city_sunset: ' + ' ' + sunset.format('h:mm a'), true);

      embed.setFooter('Requested by ' + message.author.username + ' | OpenWeatherMap', message.author.avatarURL);
      embed.setTimestamp(new Date());
      embed.setThumbnail('https://maps.googleapis.com/maps/api/staticmap?center=' + weather.coord.lat + ',' + weather.coord.lon + '&zoom=7&size=110x110&maptype=roadmap&key=' + config.api.google);

      message.channel.send('', { embed: embed });
    });
};

const retrieveWeather_DarkSky = function(bot, message, metadata) {
  forecast
    .latitude(metadata.location.coordinates.latitude)
    .longitude(metadata.location.coordinates.longitude)
    .units('us')
    .get()
    .then(res => {
      const embed = new Discord.RichEmbed();

      // TODO: Fix this once we add alternate ways of geocoding
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

      embed.addField('Conditions', icon + ' ' + res.currently.summary, true);
      embed.addField('Temperature', Math.round(res.currently.temperature) + '°F (Feels Like ' + Math.round(res.currently.apparentTemperature) + '°F)', true);
      embed.addField('Humidity', (res.currently.humidity * 100).toFixed(0) + '%', true);
      embed.addField('Visibility', res.currently.visibility + ' miles', true);
      embed.addField('Wind', Utils.emojiForDirection(res.currently.windBearing) + ' ' + res.currently.windSpeed + ' mph', true);
      embed.addField('Pressure', Utils.hpaToInhg(res.currently.pressure).toFixed(2) + ' inHg', true);

      if (res.currently.nearestStormDistance && res.currently.nearestStormBearing) {
        embed.addField('Nearest Storm', Utils.emojiForDirection(res.currently.nearestStormBearing) + ' ' + res.currently.nearestStormDistance + ' miles', true);
      }

      if (res.currently.uvIndex) {
        embed.addField('UV Index', res.currently.uvIndex, true);
      }

      // TODO: Alerts
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
      console.warn('Error while retrieving DarkSky response', err);
    });
}

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'weather ') || input == config.discriminator + 'weather';
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
