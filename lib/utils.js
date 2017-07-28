const Discord = require('discord.js');

// Creates an embed object with the footer and timestamp fields pre-filled
const createEmbed = function(message, apiCredit, setAuthor) {
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
}

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

const kelvinToFahrenheit = function(value) {
  return parseFloat(value) * 1.8 - 459.67;
};

const kelvinToCelsius = function(value) {
  return parseFloat(value) - 273.15;
};

const metersToMiles = function(value) {
  return parseFloat(value) * 0.00062137119223;
};

const mpsToMph = function(value) {
  return parseFloat(value) * 2.236936;
};

const mpsToKph = function(value) {
  return parseFloat(value) * 3.6;
}

const hpaToInhg = function(value) {
  return parseFloat(value) * 0.0295299830714;
};

const kpaToInhg = function(value) {
  return parseFloat(value) * 0.295299830714;
}

const formatLatitude = function(value) {
  const hemisphere = value >= 0 ? '°N' : '°S';
  return Math.abs(value).toFixed(2) + hemisphere;
};

const formatLongitude = function(value) {
  const hemisphere = value >= 0 ? '°E' : '°W';
  return Math.abs(value).toFixed(2) + hemisphere;
}

const emojiForDirection = function(value) {
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

// TODO: Possibly make this less ugly
const emojiForTime = function(time) {
  let minutes = time.hours() * 60 + time.minutes();

  if (minutes > 720) minutes = minutes - 720;

  if (minutes < 15) return ':clock12:';
  if (minutes < 45) return ':clock1230:';
  if (minutes < 75) return ':clock1:';
  if (minutes < 105) return ':clock130:';
  if (minutes < 135) return ':clock2:';
  if (minutes < 165) return ':clock230:';
  if (minutes < 195) return ':clock3:';
  if (minutes < 225) return ':clock330:';
  if (minutes < 255) return ':clock4:';
  if (minutes < 285) return ':clock430:';
  if (minutes < 315) return ':clock5:';
  if (minutes < 345) return ':clock530:';
  if (minutes < 375) return ':clock6:';
  if (minutes < 405) return ':clock630:';
  if (minutes < 435) return ':clock7:';
  if (minutes < 465) return ':clock730:';
  if (minutes < 495) return ':clock8:';
  if (minutes < 525) return ':clock830:';
  if (minutes < 555) return ':clock9:';
  if (minutes < 585) return ':clock930:';
  if (minutes < 615) return ':clock10:';
  if (minutes < 645) return ':clock1030:';
  if (minutes < 675) return ':clock11:';
  if (minutes < 705) return ':clock1130:';
  return ':clock12:';
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

const calculateUserLevel = function(pointsArray) {
  if (!pointsArray) return { level: 0, points: 0 };

  let totalPoints = 0;

  totalPoints += (pointsArray.chatMessage * 1);
  totalPoints += (pointsArray.botCommand * 3);
  totalPoints += (pointsArray.songPlay * 10);
  totalPoints += (pointsArray.songVote * 5);
  totalPoints += (pointsArray.songPointEarned * 4);

  let level = 0;

  if (totalPoints < 100) level = 1;
  else if (totalPoints < 500) level = 2;
  else if (totalPoints < 1000) level = 3;
  else if (totalPoints < 10000) level = 4;
  else level = Math.floor(totalPoints / 20000);

  return { level: level, points: totalPoints };
};

// Fisher-Yates shuffle, from https://www.frankmitchell.org/2015/01/fisher-yates/
const shuffle = function(array) {
  let i = 0
    , j = 0
    , temp = null

  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1))
    temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}

module.exports = {
  Subreddit: Subreddit,
  createEmbed: createEmbed,
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
  emojiForDirection: emojiForDirection,
  emojiForTime: emojiForTime,
  calculateUserLevel: calculateUserLevel,
  shuffle: shuffle
};
