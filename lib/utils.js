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

module.exports = {
  weatherIconEmoji: weatherIconEmoji,
  kelvinToFahrenheit: kelvinToFahrenheit,
  kelvinToCelsius: kelvinToCelsius,
  metersToMiles: metersToMiles,
  mpsToMph: mpsToMph,
  mpsToKph: mpsToKph,
  hpaToInhg: hpaToInhg,
  formatLatitude: formatLatitude,
  formatLongitude: formatLongitude,
  emojiForDirection: emojiForDirection,
  emojiForTime: emojiForTime
};
