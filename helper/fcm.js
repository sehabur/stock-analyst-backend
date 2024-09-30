const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendNotificationToFcmToken = async (userId, title, body, tradingCode) => {
  try {
    const user = await User.findById(userId);

    if (!user?.fcmToken) {
      return {
        status: 404,
        message: "User not found",
      };
    }

    const payload = {
      token: user.fcmToken,
      notification: {
        title: title,
        body: body,
      },
      android: {
        ttl: 86400,
        notification: {
          priority: "high", // Notification priority (high, low, max, min)
          // click_action: "OPEN_ACTIVITY_1",
          // icon: "ic_launcher", // This refers to an icon in res/drawable
          // color: "#f5f7f9", // Notification accent color (in #rrggbb format)
          // sound: "default", // Custom sound or 'default'
          // notification_count: 1, // The number of notifications displayed on the badge
          // visibility: "public", // Notification visibility (public, private, secret)
          // vibrate_timings: ["0.5s", "1s"], // Vibration pattern in seconds
        },
      },
      // apns: {
      //   headers: {
      //     "apns-priority": "1",
      //   },
      //   payload: {
      //     aps: {
      //       category: "NEW_MESSAGE_CATEGORY",
      //     },
      //   },
      // },
      // webpush: {
      //   headers: {
      //     TTL: "86400",
      //   },
      // },
    };

    const response = await admin.messaging().send(payload);

    await Notification.create({
      title,
      body,
      tradingCode,
      user: userId,
      fcmToken: user.fcmToken,
      firebaseResponse: response || "",
      deliveryTime: new Date(),
      isNew: true,
    });

    return {
      status: 200,
      message: response,
    };
  } catch (err) {
    return {
      status: 500,
      message: "Something went wrong",
    };
  }
};

module.exports = {
  sendNotificationToFcmToken,
};
