// External imports //
var express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Internal imports //
const priceRoute = require("./routes/priceRoute");
const userRoute = require("./routes/userRoute");
const tvchartRoute = require("./routes/tvchartRoute");
const dataInsertRoute = require("./routes/dataInsertRoute");
const paymentRoute = require("./routes/paymentRoute");
const adminRoute = require("./routes/adminRoute");

const {
  NotFoundHanlder,
  ErrorHanlder,
} = require("./middlewares/errorHandlingMiddleware");

dotenv.config({ path: `.env.${process.env.NODE_ENV || "production"}` });

var app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // For devlopment purpose //
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

app.use("/api/prices", priceRoute);
app.use("/api/users", userRoute);
app.use("/api/tvcharts", tvchartRoute);
app.use("/api/dataInsert", dataInsertRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/admin", adminRoute);

// Catch 404 and forward to NotFoundHanlder //
app.use(NotFoundHanlder);

// Error handler
app.use(ErrorHanlder);

module.exports = app;
