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
const countryData = require('country-data');
const userHandler = require(global.paths.lib + 'user-handler');

const handleMessage = function(bot, message) {
  if (message.content.length <= config.discriminator.length + 8) {
    userHandler.getProfile(message.author, message.guild.id, function(profile) {
      if (profile) {
        const metadata = JSON.parse(profile.metadata);

        if (metadata && metadata.location && metadata.location.formatted_address) {
          return retrieveWeather(bot, message, metadata.location.formatted_address);
        }
      }

      message.reply('please provide a city to search for.');
    });
  } else {
    const searchParameters = message.content.substring(config.discriminator.length + 8, message.content.length);
    retrieveWeather(bot, message, searchParameters);
  }
};

const retrieveWeather = function(bot, message, searchParameters) {
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

const matches = function(input) {
  return _.startsWith(input, config.discriminator + 'weather ') || input == config.discriminator + 'weather';
};

module.exports = {
  info: info,
  handleMessage: handleMessage,
  matches: matches
};
