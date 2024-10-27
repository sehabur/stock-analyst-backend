const mongoose = require("mongoose");

const aiContentSchema = mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
    },
    weaknessEn: { type: Object },
    weaknessBn: { type: Object },
    strengthEn: { type: Object },
    strengthBn: { type: Object },
    technicalEn: { type: Object },
    technicalBn: { type: Object },
    financialEn: { type: Object },
    financialBn: { type: Object },
    fairValueEn: { type: Object },
    fairValueBn: { type: Object },
  },
  {
    timestamps: true,
  }
);

const AiContent = mongoose.model("Ai_content", aiContentSchema);

module.exports = AiContent;
