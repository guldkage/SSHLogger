# SSHLogger
Get notified when someone logs into SSH on a server, easily through a Discord Webhook.
This works with both password and ssh key logins.

By default, it pings everyone when someone has logged in. However, this can be changed in the config.

# Features
- Awareness. You know when someone has logged in, so you can react quickly if it wasn't you.
- You can change the discord webhook message easily.

# Requirements
- A server running [NodeJS](https://nodejs.org/en/download/), [NPM](https://www.npmjs.com/package/npm) and [Git](https://git-scm.com/downloads)
- A discord server, account and webhook.
- For this guide, you need a Debian based system. This will work on other distros too, though.

# Installation
```sh
# Install required packages
sudo apt install nodejs npm git

# Clone files
git clone https://github.com/guldkage/SSHLogger/
cd SSHLogger

# Install requirements
npm i

# Edit the config (any editor)
nano config.json

# Start SSHLogger
node index.js
```

# Run in background
To run SSHLogger in background, it can be created in a systemd service to run in the background and start automatically at machine startup.
```sh
cp sshlogger.service /etc/systemd/system/sshlogger.service

# You might need to change WorkingDirectory, unless SSHLogger is in root directory.
nano /etc/systemd/system/sshlogger.service

systemctl daemon-reload
systemctl enable sshlogger --now
```
