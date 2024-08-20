const mongoose = require("mongoose");

const ScriptErrorSchema = mongoose.Schema(
  {
    script: {
      type: String,
    },
    message: {
      type: String,
    },
    tradingCode: {
      type: String,
    },
    time: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const ScriptError = mongoose.model("Data_script_error", ScriptErrorSchema);

module.exports = ScriptError;
