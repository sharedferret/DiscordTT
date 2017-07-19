'use strict';

const path = require('path');
const appRoot = path.resolve(__dirname);

global.config = require('./config');
global._ = require('lodash');

global.paths = {
  root: appRoot,
  assets: appRoot + '/assets/',
  audio: appRoot + '/assets/audio/',
  images: appRoot + '/assets/images/',
  lib: appRoot + '/lib/',
  commands: appRoot + '/plugins/commands/',
  hooks: appRoot + '/plugins/hooks/',
  plugins: appRoot + '/plugins/'
};

global.startTime = new Date();
global.CommandType = require(global.paths.plugins + 'commandtypes');
global.Utils = require(global.paths.lib + 'utils');

// Local cache for Google geocoding responses, better than nothing
// TODO: Replace with redis
global.locationCache = {};
