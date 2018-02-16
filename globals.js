'use strict';

const path = require('path');
const git = require('git-rev');
const appRoot = path.resolve(__dirname);

global.config = require('./config');
global._ = require('lodash');

global.paths = {
  root: appRoot,
  assets: appRoot + '/assets/',
  audio: appRoot + '/assets/audio/',
  images: appRoot + '/assets/images/',
  lib: appRoot + '/lib/',
  commands: appRoot + '/commands/'
};

global.startTime = new Date();
global.CommandType = require(global.paths.lib + 'commandtypes');
global.Utils = require(global.paths.lib + 'utils');

global.gitRev = '';
git.short(rev => { if (rev) global.gitRev = rev; });
