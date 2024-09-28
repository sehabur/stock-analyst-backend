const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema(
  {
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    tradingCode: {
      type: String,
    },
    isNew: {
      type: Boolean,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    fcmToken: {
      type: String,
    },
    // url: {
    //   type: String,
    // },
    // image: {
    //   type: String,
    // },
    firebaseResponse: {
      type: String,
    },
    deliveryTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
