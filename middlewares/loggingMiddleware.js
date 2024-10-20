const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, "0"); // getMonth() is zero-indexed
const day = String(today.getDate()).padStart(2, "0");

// Combine the parts into "YYYY-MM-DD" format
const formattedDate = `${year}-${month}-${day}`;

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs", formattedDate + "_access.log"),
  { flags: "a" }
);

app.use(morgan("combined", { stream: accessLogStream }));
