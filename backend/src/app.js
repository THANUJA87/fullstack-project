const express = require('express');
const cors = require('cors');
const { frontendUrl } = require('./config');
const routes = require('./routes');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: frontendUrl }));
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
