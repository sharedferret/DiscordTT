var fs = require('fs');

var hooks = [];

var loadHooks = function(bot) {
  try {
    console.log('Loading hooks...');
    var filenames = fs.readdirSync(global.paths.hooks);

    for (var index in filenames) {
      console.log(' -Loading ' + filenames[index]);
      var hook = require(global.paths.hooks + filenames[index]);
      hooks.push(hook);

      hook.init(bot);
    }

    console.log('Hooks loaded!');
  } catch (err) {
    console.error('Unable to load hook.', err);
  }
};

module.exports = {
  loadHooks: loadHooks
};
