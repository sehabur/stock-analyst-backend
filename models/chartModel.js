const mongoose = require("mongoose");

const chartSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    content: {
      type: String,
    },
    resolution: {
      type: String,
    },
    symbol: {
      type: String,
    },
    id: {
      type: Object,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Chart = mongoose.model("Saved_chart", chartSchema);

module.exports = Chart;
