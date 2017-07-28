const redis = require('redis');
const client = redis.createClient();

client.on('error', function(err) {
  console.warn('Redis error', err);
});

client.on('ready', function() {
  console.log('Redis ready');
});

const exit = function() {
  client.quit();
}

module.exports = {
  client: client,
  exit: exit
}
