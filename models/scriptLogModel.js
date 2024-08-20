const mongoose = require("mongoose");

const ScriptLogSchema = mongoose.Schema(
  {
    script: {
      type: String,
    },
    message: {
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

const ScriptLog = mongoose.model("Data_script_log", ScriptLogSchema);

module.exports = ScriptLog;
