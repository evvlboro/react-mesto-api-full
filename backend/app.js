/* eslint-disable no-useless-escape */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { celebrate, Joi, errors } = require('celebrate');
const cors = require('cors');
const DataNotFoundError = require('./errors/DataNotFoundError');
const { requestLogger, errorLogger } = require('./middlewares/logger');

const { PORT = 4000 } = process.env;

const app = express();

const originDev = [
  'http://localhost',
  'http://localhost:3000', // dev
];

const originProd = [
  'http://mestoapp.evvlboro.nomoredomains.sbs',
  'https://mestoapp.evvlboro.nomoredomains.sbs',
];

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? originProd : originDev,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

app.use(bodyParser.json()); // для собирания JSON-формата
app.use(bodyParser.urlencoded({ extended: true })); // для приёма веб-страниц внутри POST-запроса

mongoose.connect('mongodb://localhost:27017/mestodb', {
  useNewUrlParser: true,
});

app.use(requestLogger);

app.get('/crash-test', () => {
  setTimeout(() => {
    throw new Error('Сервер сейчас упадёт');
  }, 0);
});

const {
  createUser, login,
} = require('./controllers/users');

app.post(
  '/signin',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required().min(8),
    }),
  }),
  login,
);
app.post(
  '/signup',
  celebrate({
    body: Joi.object().keys({
      email: Joi.string().required().email(),
      password: Joi.string().required().min(8),
      name: Joi.string().min(2).max(30),
      about: Joi.string().min(2).max(30),
      avatar: Joi.string().regex(/^https?:\/\/(www\.)?[\w\-\.\_\~\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=]*#?$/),
    }),
  }),
  createUser,
);

app.use(require('./middlewares/auth')); // защита авторизации
app.use(require('./routes/users'));
app.use(require('./routes/cards'));

app.use(errorLogger);

app.use(() => {
  throw new DataNotFoundError('Неверный url');
});

app.use(errors()); // обработчик ошибок celebrate

app.use(require('./middlewares/globalErrorHandler'));

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
