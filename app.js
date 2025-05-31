const express = require('express');
const userAPI = require('./io/userApi');
const errorHandler = require('./middlewares/errorHandler');
const { NotFoundError } = require('./utils/appError');
const { PORT } = require('./config/environment');
const restAPI = require('./io/api'); // New blockchain routes
const authAPI = require('./io/authAPI'); // New blockchain routes
const { protect } = require('./middlewares/authMiddleware');

const app = express();


app.use(express.urlencoded({ extended: false }));
// Middlewares
app.use(express.json()); // Body parser for JSON requests
app.use(protect);
app.use('/api', restAPI); // Mount blockchain routes
// Routes
app.use('/api/auth', authAPI);
app.use('/api/users', userAPI);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});
app.use(errorHandler);

module.exports = app;