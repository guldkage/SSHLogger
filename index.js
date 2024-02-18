const { spawn } = require('child_process');
const axios = require('axios');
const os = require('os');
const yaml = require('js-yaml');
const fs = require('fs');

let config = null;

// load from yaml
try {
  const configContent = fs.readFileSync('./config.yaml', 'utf8');
  config = yaml.load(configContent);
  console.log(config.onReady);
} catch (e) {
  console.log(e);
}

// check if webhook is set
if (config, config.webhook == null) {
  console.error('Could not get discord webhook, exiting..');
  process.exit(1);
}

const discordWebhookUrl = config.webhook;
const tail = spawn('journalctl', ['-f', '-n', '0', '_COMM=sshd']);

// embed
tail.stdout.on('data', async (data) => {
  const logData = data.toString();
  if (logData.includes('Accepted password') || logData.includes('Accepted publickey')) {
    const ipAddressRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const ipAddressMatch = logData.match(ipAddressRegex);
    const ipAddress = ipAddressMatch ? ipAddressMatch[0] : config.ipAddressUnknown;

    const userInfo = parseUserInfo(logData);
    const geoLocation = await getGeoLocation(ipAddress);

    const embed = {
      title: config.webhookTitle,
      description: config.webhookDescription,
      color: config.webhookColor,
      timestamp: new Date(),
      fields: [
        {
          name: config.userInfo,
          value: userInfo.user,
          inline: true,
        },
        {
          name: config.ipAddress,
          value: ipAddress,
          inline: true,
        },
        {
          name: config.serverAffected,
          value: os.hostname(),
          inline: true,
        },      
        {
          name: config.affectedServerOS,
          value: `${os.type()} ${os.release()}`,
          inline: true,
        },
        {
          name: config.clientGeolocation,
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
  console.error(`${config.journalctl}: ${data}`);
});

// error codes
tail.on('exit', (code) => {
  console.log(`${config.journalctlExit} ${code}`);
});

// parsing
function parseUserInfo(logData) {
  const userRegex = /(?:for )?([^\s]+) from/;
  const deviceRegex = /(?:via )?([^\s]+) port/;
  const userMatch = logData.match(userRegex);
  const deviceMatch = logData.match(deviceRegex);
  const user = userMatch ? userMatch[1] : config.unknownUser;
  const device = deviceMatch ? deviceMatch[1] : config.unknownDevice;

  return {
    user,
    device,
  };
}

// get geolocation for client
async function getGeoLocation(ipAddress) {
  try {
    const response = await axios.get(`https://ipinfo.io/${ipAddress}/json`);
    const geoLocation = `${response.data.city}, ${response.data.region}, ${response.data.country}`;
    return geoLocation;
  } catch (error) {
    console.error(config.geolocationFail, error.message);
    return config.unknown;
  }
}

// send json data to webhook
function sendDiscordEmbed(embed) {
  const data = {
    content: '@everyone',
    embeds: [embed],
  };

  // send post request
  axios.post(discordWebhookUrl, data)
    .then(() => console.log(config.embedSent))
    .catch((error) => console.error(config.embedError, error.message));
}
