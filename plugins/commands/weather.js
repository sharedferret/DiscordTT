var name = ['weather '];
var description = 'Gets the current conditions and weather forecast for a given location.';
var usage = '`' + config.discriminator + 'weather [location]`: This command accepts most location identifiers, including town names and postcodes.';
var hidden = true;

var request = require('request');
var Discord = require('discord.js');
var moment = require('moment');

var handleMessage = function(bot, message) {
  var searchParameters = message.content.substring(config.discriminator.length + 8, message.content.length);

  // Form request URL
  // If a US zip is requested, switch API call
  var apiUrl;

  if (/^\d{5}(-\d{4})?$/.test(searchParameters)) {
    apiUrl = 'http://api.openweathermap.org/data/2.5/weather?appid=' + config.api.openweathermap + '&zip=' + searchParameters
  } else {
    apiUrl = 'http://api.openweathermap.org/data/2.5/weather?appid=' + config.api.openweathermap + '&q=' + searchParameters;
  }

  request(apiUrl,
    function (error, response, body) {
      if (error) return console.log(error);
      if (!response.statusCode == 200) return console.log('Non-200 response received', response);

      var weather = JSON.parse(body);

      if (weather.cod != 200) {
        return message.reply('I couldn\'t find that city.');
      }

      var embed = new Discord.RichEmbed();

      // var sunrise = moment(weather.sys.sunrise * 1000).local();
      // var sunset = moment(weather.sys.sunset * 1000).local();

      embed.setTitle(':flag_' + (weather.sys.country).toLowerCase() + ': Weather for ' + weather.name + ', ' + countryForCode[weather.sys.country] + ' (' + formatLatitude(weather.coord.lat) + ', ' + formatLongitude(weather.coord.lon) + ')');
      embed.addField('Conditions', weatherIconEmoji[weather.weather[0].icon] + ' ' + weather.weather[0].main, true);
      embed.addField('Temperature', kelvinToFahrenheit(weather.main.temp).toFixed() + '°F (' + kelvinToCelsius(weather.main.temp).toFixed() + '°C)', true);
      embed.addField('Humidity', weather.main.humidity + '%', true);
      if (weather.visibility) {
        embed.addField('Visibility', metersToMiles(weather.visibility).toFixed(1) + ' miles (' + (weather.visibility / 1000).toFixed() + 'km)', true);
      } else {
        embed.addField('Visibility', 'Unknown', true);
      }
      embed.addField('Wind', emojiForDirection(weather.wind.deg) + ' ' + mpsToMph(weather.wind.speed).toFixed() + ' mph (' + mpsToKph(weather.wind.speed).toFixed() + ' kph)', true);
      embed.addField('Pressure', hpaToInhg(weather.main.pressure).toFixed(2) + ' inches', true);
      
      // TODO: This API is using fucking UTC without providing a local time offset
      // embed.addField('Sunrise', ':sunrise: ' + ' ' + sunrise.format('h:mm a'), true);
      // embed.addField('Sunset', ':city_sunset: ' + ' ' + sunset.format('h:mm a'), true);

      embed.setFooter('Requested by ' + message.author.username + ' | OpenWeatherMap', message.author.avatarURL);
      embed.setTimestamp(new Date());
      embed.setThumbnail('https://maps.googleapis.com/maps/api/staticmap?center=' + weather.coord.lat + ',' + weather.coord.lon + '&zoom=7&size=110x110&maptype=roadmap&key=' + config.api.youtube);

      message.channel.send('', { embed: embed });
    });
};

var kelvinToFahrenheit = function(value) {
  return parseFloat(value) * 1.8 - 459.67;
};

var kelvinToCelsius = function(value) {
  return parseFloat(value) - 273.15;
};

var metersToMiles = function(value) {
  return parseFloat(value) * 0.00062137119223;
};

var mpsToMph = function(value) {
  return parseFloat(value) * 2.236936;
};

var mpsToKph = function(value) {
  return parseFloat(value) * 3.6;
}

var hpaToInhg = function(value) {
  return parseFloat(value) * 0.0295299830714;
};

var formatLatitude = function(value) {
  var hemisphere = value >= 0 ? '°N' : '°S';
  return Math.abs(value).toFixed(2) + hemisphere;
};

var formatLongitude = function(value) {
  var hemisphere = value >= 0 ? '°E' : '°W';
  return Math.abs(value).toFixed(2) + hemisphere;
}

var emojiForDirection = function(value) {
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

var emojiForTime = function(time) {
  var minutes = time.hours() * 60 + time.minutes();

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

// Convert ISO 3166-2 to readable country name
var countryForCode = {
  AC: 'Ascension',
  AD: 'Andorra',
  AE: 'United Arab Emirates',
  AF: 'Afghanistan',
  AG: 'Antigua and Barbuda',
  AI: 'Anguilla',
  AL: 'Albania',
  AM: 'Armenia',
  AN: 'Netherlands Antilles',
  AO: 'Angola',
  AQ: 'Antarctica',
  AR: 'Argentina',
  AS: 'American Samoa',
  AT: 'Austria',
  AU: 'Australia',
  AW: 'Aruba',
  AX: 'Aland',
  AZ: 'Azerbaijan',
  BA: 'Bosnia and Herzegovina',
  BB: 'Barbados',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BF: 'Burkina Faso',
  BG: 'Bulgaria',
  BH: 'Bahrain',
  BI: 'Burundi',
  BJ: 'Benin',
  BL: 'Saint Barthelemy',
  BM: 'Bermuda',
  BN: 'Brunei',
  BO: 'Bolivia',
  BQ: 'Bonaire, Sint Eustatius and Saba',
  BR: 'Brazil',
  BS: 'The Bahamas',
  BT: 'Bhutan',
  BV: 'Bouvet Island',
  BW: 'Botswana',
  BY: 'Belarus',
  BZ: 'Belize',
  CA: 'Canada',
  CC: 'Cocos Islands',
  CD: 'Congo',
  CF: 'Central African Republic',
  CG: 'Congo',
  CH: 'Switzerland',
  CI: 'Cote d\'Ivoire',
  CK: 'Cook Islands',
  CL: 'Chile',
  CM: 'Cameroon',
  CN: 'China',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  CV: 'Cape Verde',
  CW: 'Curaçao',
  CX: 'Christmas Island',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DJ: 'Djibouti',
  DK: 'Denmark',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  DZ: 'Algeria',
  EC: 'Ecuador',
  EE: 'Estonia',
  EG: 'Egypt',
  EH: 'Western Sahara',
  ER: 'Eritrea',
  ES: 'Spain',
  ET: 'Ethiopia',
  FI: 'Finland',
  FJ: 'Fiji',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  FO: 'Faroe Islands',
  FR: 'France',
  GA: 'Gabon',
  GB: 'United Kingdom',
  GD: 'Grenada',
  GE: 'Georgia',
  GF: 'French Guiana',
  GG: 'Guernsey',
  GH: 'Ghana',
  GI: 'Gibraltar',
  GL: 'Greenland',
  GM: 'The Gambia',
  GN: 'Guinea',
  GP: 'Saint Martin',
  GQ: 'Equatorial Guinea',
  GR: 'Greece',
  GS: 'South Georgia & South Sandwich Islands',
  GT: 'Guatemala',
  GU: 'Guam',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HK: 'Hong Kong',
  HM: 'Heard Island and McDonald Islands',
  HN: 'Honduras',
  HR: 'Croatia',
  HT: 'Haiti',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IM: 'Isle of Man',
  IN: 'India',
  IO: 'British Indian Ocean Territory',
  IQ: 'Iraq',
  IR: 'Iran',
  IS: 'Iceland',
  IT: 'Italy',
  JE: 'Jersey',
  JM: 'Jamaica',
  JO: 'Jordan',
  JP: 'Japan',
  KE: 'Kenya',
  KG: 'Kyrgyzstan',
  KH: 'Cambodia',
  KI: 'Kiribati',
  KM: 'Comoros',
  KN: 'Saint Kitts and Nevis',
  KP: 'North Korea',
  KR: 'South Korea',
  KW: 'Kuwait',
  KY: 'Cayman Islands',
  KZ: 'Kazakhstan',
  LA: 'Laos',
  LB: 'Lebanon',
  LC: 'Saint Lucia',
  LI: 'Liechtenstein',
  LK: 'Sri Lanka',
  LR: 'Liberia',
  LS: 'Lesotho',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  LY: 'Libya',
  MA: 'Morocco',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MF: 'Saint Martin',
  MG: 'Madagascar',
  MH: 'Marshall Islands',
  MK: 'Macedonia',
  ML: 'Mali',
  MM: 'Myanmar',
  MN: 'Mongolia',
  MO: 'Macau',
  MP: 'Northern Mariana Islands',
  MQ: 'Martinique',
  MR: 'Mauritania',
  MS: 'Montserrat',
  MT: 'Malta',
  MU: 'Mauritius',
  MV: 'Maldives',
  MW: 'Malawi',
  MX: 'Mexico',
  MY: 'Malaysia',
  MZ: 'Mozambique',
  NA: 'Namibia',
  NC: 'New Caledonia',
  NE: 'Niger',
  NF: 'Norfolk Island',
  NG: 'Nigeria',
  NI: 'Nicaragua',
  NL: 'The Netherlands',
  NO: 'Norway',
  NP: 'Nepal',
  NR: 'Nauru',
  NU: 'Niue',
  NZ: 'New Zealand',
  OM: 'Oman',
  PA: 'Panama',
  PE: 'Peru',
  PF: 'French Polynesia',
  PG: 'Papua New Guinea',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PM: 'Saint Pierre and Miquelon',
  PN: 'Pitcairn Islands',
  PR: 'Puerto Rico',
  PS: 'Palestine',
  PT: 'Portugal',
  PW: 'Palau',
  PY: 'Paraguay',
  QA: 'Qatar',
  RE: 'Reunion',
  RO: 'Romania',
  RS: 'Serbia',
  RU: 'Russia',
  RW: 'Rwanda',
  SA: 'Saudi Arabia',
  SB: 'Solomon Islands',
  SC: 'Seychelles',
  SD: 'Sudan',
  SE: 'Sweden',
  SG: 'Singapore',
  SH: 'Saint Helena',
  SI: 'Slovenia',
  SJ: 'Svalbard',
  SK: 'Slovakia',
  SL: 'Sierra Leone',
  SM: 'San Marino',
  SN: 'Senegal',
  SO: 'Somalia',
  SR: 'Suriname',
  SS: 'South Sudan',
  ST: 'Sao Tome and Principe',
  SV: 'El Salvador',
  SX: 'Sint Maarten',
  SY: 'Syria',
  SZ: 'Swaziland',
  TA: 'Tristan da Cunha',
  TC: 'Turks and Caicos Islands',
  TD: 'Chad',
  TF: 'French Southern and Antarctic Lands',
  TG: 'Togo',
  TH: 'Thailand',
  TJ: 'Tajikistan',
  TK: 'Tokelau',
  TL: 'Timor-Leste',
  TM: 'Turkmenistan',
  TN: 'Tunisia',
  TO: 'Tonga',
  TR: 'Turkey',
  TT: 'Trinidad and Tobago',
  TV: 'Tuvalu',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  UA: 'Ukraine',
  UG: 'Uganda',
  UM: 'Midway Islands',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VA: 'Vatican City',
  VC: 'Saint Vincent and the Grenadines',
  VE: 'Venezuela',
  VG: 'British Virgin Islands',
  VI: 'U.S. Virgin Islands',
  VN: 'Vietnam',
  VU: 'Vanuatu',
  WF: 'Wallis and Futuna',
  WS: 'Samoa',
  XK: 'Kosovo',
  YE: 'Yemen',
  YT: 'Mayotte',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe'
};

var weatherIconEmoji = {
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

var matches = function(input) {
  return _.startsWith(input, config.discriminator + 'weather ') || input == config.discriminator + 'weather';
};

module.exports = {
  name: name,
  description: description,
  usage: usage,
  hidden: hidden,
  handleMessage: handleMessage,
  matches: matches
};
