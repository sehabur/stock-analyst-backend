// External imports //
var express = require('express');
const dotenv = require('dotenv');

// Internal imports //
const priceRoute = require('./routes/priceRoute');
const dataInsertRoute = require('./routes/dataInsertRoute');

const {
  NotFoundHanlder,
  ErrorHanlder,
} = require('./middlewares/errorHandlingMiddleware');

dotenv.config();

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // For devlopment purpose //
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, PUT, DELETE, OPTIONS'
  );
  next();
});

app.use('/api/prices', priceRoute);
app.use('/api/dataInsert', dataInsertRoute);

// Catch 404 and forward to NotFoundHanlder //
app.use(NotFoundHanlder);

// Error handler
app.use(ErrorHanlder);

module.exports = app;
