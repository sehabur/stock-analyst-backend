// External imports //
var express = require("express");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

// Internal imports //
const priceRoute = require("./routes/priceRoute");
const userRoute = require("./routes/userRoute");
const tvchartRoute = require("./routes/tvchartRoute");
const dataInsertRoute = require("./routes/dataInsertRoute");
const paymentRoute = require("./routes/paymentRoute");
const adminRoute = require("./routes/adminRoute");
const aiRoute = require("./routes/aiRoute");

const {
  NotFoundHanlder,
  ErrorHanlder,
} = require("./middlewares/errorHandlingMiddleware");
const { formatDate } = require("./helper/price");

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

// morgan.token('ip', (req) => req.ip);

app.set("trust proxy", true);

app.use(
  morgan("combined", {
    stream: fs.createWriteStream(
      path.join(__dirname, "logs", formatDate() + "_access.log"),
      { flags: "a" }
    ),
  })
);

app.use("/api/prices", priceRoute);
app.use("/api/users", userRoute);
app.use("/api/tvcharts", tvchartRoute);
app.use("/api/dataInsert", dataInsertRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/admin", adminRoute);
app.use("/api/ai", aiRoute);

// Catch 404 and forward to NotFoundHanlder //
app.use(NotFoundHanlder);

// Error handler
app.use(ErrorHanlder);

module.exports = app;
