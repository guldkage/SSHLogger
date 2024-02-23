const { spawn } = require('child_process');
const axios = require('axios');
const os = require('os');
const yaml = require('js-yaml');
const fs = require('fs');
const config = require('./config.json');

// check if webhook is set
if (config, config.webhookUrl == null) {
  console.error('Could not get discord webhook, exiting..');
  process.exit(1);
}

console.log(config.readyMessage);

const tail = spawn('journalctl', ['-f', '-n', '0', '_COMM=sshd']);

// embed
tail.stdout.on('data', async (data) => {
  const logData = data.toString();
  if (logData.includes('Accepted password') || logData.includes('Accepted publickey')) {
    const ipAddressMatch = logData.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);

    const userInfo = parseUserInfo(logData);
    let geoLocation = config.embed.fields.unknown;
    if (ipAddressMatch) {
      geoLocation = await getGeoLocation(ipAddressMatch[0]);
    }

    const embed = {
      title: config.embed.title,
      description: config.embed.description,
      color: config.embed.color,
      timestamp: new Date(),
      fields: [
        {
          name: config.embed.fields.userInfo,
          value: userInfo.user,
          inline: true,
        },
        {
          name: config.embed.fields.ipAddress,
          value: ipAddress,
          inline: true,
        },
        {
          name: config.embed.fields.serverAffected,
          value: os.hostname(),
          inline: true,
        },
        {
          name: config.embed.fields.serverAffectedOS,
          value: `${os.type()} ${os.release()}`,
          inline: true,
        },
        {
          name: config.embed.fields.clientGeolocation,
          value: geoLocation,
          inline: true,
        },
      ],
    };

    sendDiscordEmbed(embed);
  }
});

// error codes
tail.stderr.on('data', (data) => {
  console.error(`${config.journalctlError}: ${data}`);
});

// error codes
tail.on('exit', (code) => {
  console.log(`${config.journalctlExit} ${code}`);
});

// parsing
function parseUserInfo(logData) {
  const userRegex = /(?:for )?([^\s]+) from/;
  const userMatch = logData.match(userRegex);
  const user = userMatch ? userMatch[1] : config.unknownUser;

  return {
    user
  };
}

// get geolocation for client
async function getGeoLocation(ipAddress) {
  try {
    const response = await axios.get(`https://ipinfo.io/${ipAddress}/json`);
    const geoLocation = `${response.data.city}, ${response.data.region}, ${response.data.country}`;
    return geoLocation;
  } catch (error) {
    console.error(config.geolocationError, error.message);
    return config.embed.fields.unknown;
  }
}

// send json data to webhook
function sendDiscordEmbed(embed) {
  const data = {
    content: config.ping,
    embeds: [embed],
  };

  // send post request
  axios.post(config.webhookUrl, data)
    .then(() => console.log(config.embed.sentMessage))
    .catch((error) => console.error(config.embed.errorMessage, error.message));
}
