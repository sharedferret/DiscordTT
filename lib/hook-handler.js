const fs = require('fs');

let hooks = [];

const loadHooks = function(bot) {
  try {
    console.log('Loading hooks...');
    const filenames = fs.readdirSync(global.paths.hooks);

    for (let index in filenames) {
      console.log(' -Loading ' + filenames[index]);
      const hook = require(global.paths.hooks + filenames[index]);
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
