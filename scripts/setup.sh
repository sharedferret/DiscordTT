#!/bin/bash
sudo apt-get install -y ffmpeg redis-server
npm install
node ./db-setup.js