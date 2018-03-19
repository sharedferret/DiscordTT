const Discord = require('discord.js');
const serverSettingsManager = require(global.paths.lib + 'server-settings-manager');
const moment = require('moment');
const uuid = require('uuid/v4');

// Creates an embed object with the footer and timestamp fields pre-filled
const createEmbed = (message, apiCredit, setAuthor) => {
  const embed = new Discord.RichEmbed();

  const username = (message.member && message.member.displayName) ? message.member.displayName : message.author.username;

  if (setAuthor === true) {
    embed.setAuthor(username, message.author.avatarURL);
  }

  let footerString = 'Requested by ' + username;
  if (apiCredit) {
    footerString += ' | Powered by ' + apiCredit;
  }

  embed.setFooter(footerString, message.author.avatarURL);
  embed.setTimestamp(new Date());

  return embed;
};

const addDarkSkyAlerts = (res, units, embed) => {
  const alertEntryParts = [[]];
  const alertEntryLengths = [0];
  let idx = 0;

  for (const alert of res.alerts) {
    // (US) Auto-hoist Civil Emergency Messages
    if (alert.title == 'Civil Emergency Message') {
      if (alert.description.length > 1000) {
        embed.addField(':red_circle: Civil Emergency Message', alert.description.substring(0, 1000) + '...');
      } else {
        embed.addField(':red_circle: Civil Emergency Message', alert.description);
      }
    } else {
      let alertText = '';

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

      if (alertEntryLengths[idx] + alertText.length > 1000) {
        idx++;
        alertEntryLengths[idx] = 0;
        alertEntryParts[idx] = [];
      }

      alertEntryParts[idx].push(alertText);
      alertEntryLengths[idx] += alertText.length;
    }
  }

  for (const index in alertEntryParts) {
    if (index == 0) {
      embed.addField('Alerts', alertEntryParts[index].join('\n'));
    } else {
      embed.addField('\u200B', alertEntryParts[index].join('\n'));
    }
  }
};

const weatherIconEmoji = {
  '01d': ':sunny:',
  '01n': ':sunny:',
  '02d': ':partly_sunny:',
  '02n': ':partly_sunny:',
  '03d': ':white_sun_cloud:',
  '03n': ':white_sun_cloud:',
  '04d': ':cloud:',
  '04n': ':cloud:',
  '09d': ':white_sun_rain_cloud:',
  '09n': ':white_sun_rain_cloud:',
  '10d': ':cloud_rain:',
  '10n': ':cloud_rain:',
  '11d': ':thunder_cloud_rain:',
  '11n': ':thunder_cloud_rain:',
  '13d': ':cloud_snow:',
  '13n': ':cloud_snow:',
  '50d': ':fog:',
  '50n': ':fog:'
};

const weatherIconEmoji_DarkSky = {
  'clear-day': ':sunny:',
  'clear-night': ':crescent_moon:',
  'rain': ':cloud_rain:',
  'snow': ':cloud_snow:',
  'sleet': ':cloud_snow:',
  'wind': ':dash:',
  'fog': ':fog:',
  'cloudy': ':cloud:',
  'partly-cloudy-day': ':partly_sunny:',
  'partly-cloudy-night': ':partly_sunny:',
  'thunderstorm': ':thunder_cloud_rain:'
};

const getConditionFillColor = (temperature, units) => {
  let color = '#000000';
  switch (units) {
  case 'us':
    if (temperature < 20) color = '#463763';
    else if (temperature < 40) color = '#33426b';
    else if (temperature < 60) color = '#32642e';
    else if (temperature < 80) color = '#7d7d2f';
    else if (temperature < 100) color = '#855d32';
    else color = '#682b2e';
    break;
  default:
    if (temperature < -6) color = '#463763';
    else if (temperature < 5) color = '#33426b';
    else if (temperature < 16) color = '#32642e';
    else if (temperature < 27) color = '#7d7d2f';
    else if (temperature < 38) color = '#855d32';
    else color = '#682b2e';
    break;
  }

  return color;
};

const kelvinToFahrenheit = value => {
  return parseFloat(value) * 1.8 - 459.67;
};

const kelvinToCelsius = value => {
  return parseFloat(value) - 273.15;
};

const metersToMiles = value => {
  return parseFloat(value) * 0.00062137119223;
};

const mpsToMph = value => {
  return parseFloat(value) * 2.236936;
};

const mpsToKph = value => {
  return parseFloat(value) * 3.6;
}

const hpaToInhg = value => {
  return parseFloat(value) * 0.0295299830714;
};

const kpaToInhg = value => {
  return parseFloat(value) * 0.295299830714;
}

const formatLatitude = value => {
  const hemisphere = value >= 0 ? '°N' : '°S';
  return Math.abs(value).toFixed(2) + hemisphere;
};

const formatLongitude = value => {
  const hemisphere = value >= 0 ? '°E' : '°W';
  return Math.abs(value).toFixed(2) + hemisphere;
}

const degreesToHeading = value => {
  if (value < 22.5) return 'N';
  if (value < 67.5) return 'NE';
  if (value < 112.5) return 'E';
  if (value < 157.5) return 'SE';
  if (value < 202.5) return 'S';
  if (value < 247.5) return 'SW';
  if (value < 292.5) return 'W';
  if (value < 337.5) return 'NW';
  return 'N';
}

const emojiForDirection = value => {
  if (value < 22.5) return ':arrow_up:';
  if (value < 67.5) return ':arrow_upper_right:';
  if (value < 112.5) return ':arrow_right:';
  if (value < 157.5) return ':arrow_lower_right:';
  if (value < 202.5) return ':arrow_down:';
  if (value < 247.5) return ':arrow_lower_left:';
  if (value < 292.5) return ':arrow_left:';
  if (value < 337.5) return ':arrow_upper_left:';
  return ':arrow_up:';
};

const Subreddit = {
  awwnime         : { id: 1, sfw: true },
  pantsu          : { id: 2, sfw: false },
  kitsunemimi     : { id: 7, sfw: true },
  melanime        : { id: 8, sfw: true },
  ecchi           : { id: 9, sfw: false },
  zettairyouiki   : { id: 11, sfw: true },
  imouto          : { id: 13, sfw: true },
  pokeporn        : { id: 14, sfw: false },
  moescape        : { id: 15, sfw: true },
  patchuu         : { id: 17, sfw: true },
  tsunderes       : { id: 19, sfw: true },
  kemonomimi      : { id: 20, sfw: true },
  homura          : { id: 21, sfw: true },
  sukebei         : { id: 22, sfw: false },
  twodeeart       : { id: 23, sfw: true },
  gunime          : { id: 24, sfw: true },
  bishounen       : { id: 25, sfw: true },
  kanmusu         : { id: 26, sfw: true },
  kanmusunights   : { id: 27, sfw: false },
  hatsune         : { id: 28, sfw: true },
  monstergirl     : { id: 29, sfw: false },
  onodera         : { id: 30, sfw: true },
  twgok           : { id: 32, sfw: true },
  onetrueidol     : { id: 33, sfw: true },
  twintails       : { id: 34, sfw: true },
  thericegoddess  : { id: 35, sfw: true },
  fujojoshi       : { id: 36, sfw: true },
  tourabu         : { id: 37, sfw: true },
  cutelittlefangs : { id: 38, sfw: true },
  chinadress      : { id: 39, sfw: true },
  animelegwear    : { id: 40, sfw: true },
  k_on            : { id: 41, sfw: true },
  animelegs       : { id: 42, sfw: true },
  headpats        : { id: 43, sfw: true },
  animewallpaper  : { id: 44, sfw: true },
  animeponytails  : { id: 45, sfw: true },
  lovelive        : { id: 46, sfw: true },
  honkers         : { id: 47, sfw: true },
  megane          : { id: 48, sfw: true },
  ahoge           : { id: 49, sfw: true },
  araragigirls    : { id: 50, sfw: true },
  awwcoholics     : { id: 51, sfw: false },
  inumimi         : { id: 52, sfw: true },
  awenime         : { id: 53, sfw: true },
  moestash        : { id: 54, sfw: true },
  theforgottenidol: { id: 55, sfw: true },
  animesidetails  : { id: 56, sfw: true },
  animesnowscapes : { id: 57, sfw: true },
  kpics           : { id: 58, sfw: true },
  hentiny         : { id: 59, sfw: false },
  animefeet       : { id: 60, sfw: false },
  chibi           : { id: 61, sfw: true },
  oddeye          : { id: 62, sfw: true }
};

const calculateUserLevel = pointsArray => {
  if (!pointsArray) return { level: 0, points: 0 };

  let totalPoints = 0;

  totalPoints += (pointsArray.chatMessage * 1);
  totalPoints += (pointsArray.botCommand * 3);
  totalPoints += (pointsArray.songPlay * 10);
  totalPoints += (pointsArray.songVote * 5);
  totalPoints += (pointsArray.songPointEarned * 4);

  let level = 0;

  if (totalPoints < 50) level = 1;
  else if (totalPoints < 100) level = 2;
  else if (totalPoints < 200) level = 3;
  else if (totalPoints < 457) level = 4;
  else level = Math.floor(totalPoints / 457) + 4;

  return { level: level, points: totalPoints };
};

// Fisher-Yates shuffle, from https://www.frankmitchell.org/2015/01/fisher-yates/
const shuffle = array => {
  let i = 0
    , j = 0
    , temp = null

  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1))
    temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
};

const getPrefix = guildId => {
  const serverSettings = serverSettingsManager.getSettings(guildId);

  if (serverSettings && serverSettings.prefix && serverSettings.prefix.custom) {
    return serverSettings.prefix.custom;
  } else {
    return config.prefix;
  }
};

const createCommandWithPrefix = (command, guildId, omitTrailingBacktick = false) => {
  let prefix = getPrefix(guildId);

  if (prefix.match(/<:.+:[0-9]+>/)) {
    prefix = prefix.replace(/<:.+:[0-9]+>/g, '`$&`');
  }

  let cmd = '`' + prefix + command + (omitTrailingBacktick ? '' : '`');
  cmd = cmd.replace(/``/g, '');

  return cmd;
}

const unitSymbols = {
  us: {
    temperature: ' °F',
    distance: 'miles',
    pressure: 'inHg',
    speed: 'mph',
    time: 'h:mm A',
    dateShort: 'MMMM Do',
    date: 'dddd, MMMM Do, YYYY',
    dateTiny: 'ddd M/D'
  },
  ca: {
    temperature: ' °C',
    distance: 'km',
    pressure: 'kPa',
    speed: 'km/h',
    time: 'h:mm A',
    dateShort: 'MMMM Do',
    date: 'dddd, MMMM Do, YYYY',
    dateTiny: 'ddd M/D'
  },
  uk2: {
    temperature: ' °C',
    distance: 'miles',
    pressure: 'mb',
    speed: 'mph',
    time: 'HH:mm',
    dateShort: 'D MMMM',
    date: 'dddd, D MMMM YYYY',
    dateTiny: 'ddd DD/MM'
  },
  si: {
    temperature: ' °C',
    distance: 'km',
    pressure: 'hPa',
    speed: 'm/s',
    time: 'HH:mm',
    dateShort: 'D MMMM',
    date: 'dddd, D MMMM YYYY',
    dateTiny: 'ddd DD/MM'
  }
};

/**
 * @param {string} ytDuration 
 * @return {moment} moment duration
 */
const convertYoutubeDuration = (ytDuration) => {
  const parts = ytDuration.match(/PT([0-9]+H)*([0-9]+M)*([0-9]+S)*/);

  const hours = parts[1] ? parseInt(parts[1].substring(0, parts[1].length - 1), 10) : 0
  const minutes = parts[2] ? parseInt(parts[2].substring(0, parts[2].length - 1), 10) : 0
  const seconds = parts[3] ? parseInt(parts[3].substring(0, parts[3].length - 1), 10) : 0

  const duration = moment.duration({
    hours: hours,
    minutes: minutes,
    seconds: seconds
  });

  return duration;
};

const isGuildAdmin = member => {
  return member.hasPermission('ADMINISTRATOR') || member.hasPermission('MANAGE_GUILD');
}

const createRequestId = () => {
  return uuid();
}

module.exports = {
  Subreddit: Subreddit,
  createEmbed: createEmbed,
  addDarkSkyAlerts: addDarkSkyAlerts,
  weatherIconEmoji: weatherIconEmoji,
  weatherIconEmoji_DarkSky: weatherIconEmoji_DarkSky,
  kelvinToFahrenheit: kelvinToFahrenheit,
  kelvinToCelsius: kelvinToCelsius,
  metersToMiles: metersToMiles,
  mpsToMph: mpsToMph,
  mpsToKph: mpsToKph,
  hpaToInhg: hpaToInhg,
  kpaToInhg: kpaToInhg,
  formatLatitude: formatLatitude,
  formatLongitude: formatLongitude,
  degreesToHeading: degreesToHeading,
  emojiForDirection: emojiForDirection,
  calculateUserLevel: calculateUserLevel,
  shuffle: shuffle,
  getPrefix: getPrefix,
  createCommandWithPrefix: createCommandWithPrefix,
  unitSymbols: unitSymbols,
  convertYoutubeDuration: convertYoutubeDuration,
  isGuildAdmin: isGuildAdmin,
  createRequestId: createRequestId,
  getConditionFillColor: getConditionFillColor
};
