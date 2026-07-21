const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const i18n = require('i18n');

const app = express();

const configPath = path.resolve(__dirname, '../config.json');
let config = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (process.env.TOKEN) {
      config.TOKEN = process.env.TOKEN;
    } else if ((!config.TOKEN || config.TOKEN === 'YOUR_DISCORD_BOT_TOKEN') && config.TOKEN_B64) {
      try {
        config.TOKEN = Buffer.from(config.TOKEN_B64, 'base64').toString('utf-8');
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error reading config.json:', err);
  }
}

i18n.configure({
  locales: ['en', 'ar'],
  directory: path.join(__dirname, '../src/dashboard/locales'),
  defaultLocale: config.language || 'ar',
  queryParameter: 'lang',
  objectNotation: true,
  syncFiles: false,
  autoReload: false,
});

app.use(i18n.init);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../src/dashboard/views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../src/dashboard/public')));

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const username = config.dashboard ? config.dashboard.username : 'wick';
  const password = config.dashboard ? config.dashboard.password : 'wick123';

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required.');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [inputUsername, inputPassword] = credentials.split(':');

  if (inputUsername === username && inputPassword === password) {
    req.admin = username;
    return next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required.');
  }
};

app.use(auth);

// Mock client for Vercel serverless environment
const clientMock = {
  config,
  locale: new Map(),
  db: {
    get: async () => null,
    set: async () => {},
    all: async () => [],
  },
};

const indexRoute = require('../src/dashboard/routes/index')(clientMock);
const settingsRoute = require('../src/dashboard/routes/settings')(clientMock);
const sectionsRoute = require('../src/dashboard/routes/sections')(clientMock);

app.use('/', indexRoute);
app.use('/settings', settingsRoute);
app.use('/sections', sectionsRoute);

module.exports = app;
