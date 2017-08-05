# DiscordTT
DiscordTT (Tohru) is a Discord bot with an extensive list of commands, including server moderation and a music DJing feature based on Turntable.fm. The bot is still in active development, and some features may not work as expected.

The bot itself is built in node.js, and uses the [discord.js](https://github.com/hydrabolt/discord.js) library to interface with Discord.

## Discord info
* [Tohru invite link](http://invite.tohru.club/)
* [Tohru/DiscordTT development server](http://discord.tohru.club/)

## Installation
To install the bot:
1. Clone/fork this project.
1. Install required external dependencies (see below).
1. Run `npm install` in the project's base directory.
1. Add a `config.json` file to the project's base directory (see below).
1. Run `npm start` to start the bot.

### External dependencies
The bot requires the following external dependencies to be installed:
* node.js >= 8.0.0
* npm
* Redis
* ffmpeg

### API dependencies
To use all of the bot's features, you will need to obtain an API key for the following services:
* [Discord](https://discordapp.com/developers/applications/me)
* [Google](https://console.cloud.google.com/apis/dashboard) - Google Static Maps API, YouTube Data API, Google Maps Geocoding API
* [OpenWeatherMap](https://openweathermap.org/appid)
* [Dark Sky](https://darksky.net/dev/)
* MyAnimeList.net - Does not provide API keys. Create an account for your bot and use those credentials.

### Configuration
The bot reads config values from the `config.json` file in the project's root directory. A sample config file is provided below.

```JSON
{
  "discord": {
    "credentials: {
      "token": "YourBotToken"
    }
  },
  "api": {
    "google": "",
    "openweathermap": "",
    "darksky": "",
    "myanimelist": {
      "username": "",
      "password": ""
    }
  },
  "turntable": {
    "maxDjs": "3",
    "songsPerDj": null,
    "baseVolume": "-13"
  },
  "prefix": "/",
  "admins": ["YourDiscordID"]
}
```
