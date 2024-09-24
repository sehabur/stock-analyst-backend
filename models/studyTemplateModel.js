const mongoose = require("mongoose");

const studyTemplateSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    content: {
      type: String,
    },
    meta_info: {
      type: Object,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isPremium: {
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

const StudyTemplate = mongoose.model("Saved_template", studyTemplateSchema);

module.exports = StudyTemplate;
