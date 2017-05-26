var path = require('path');
var appRoot = path.resolve(__dirname);

global.config = require('./config');
global._ = require('lodash');

global.paths = {
  root: appRoot,
  assets: appRoot + '/assets/',
  audio: appRoot + '/assets/audio/',
  images: appRoot + '/assets/images/',
  lib: appRoot + '/lib/',
  commands: appRoot + '/plugins/commands/',
  hooks: appRoot + '/plugins/hooks/'
};

global.startTime = new Date();
