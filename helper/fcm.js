const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendNotificationToFcmToken = async (fcmToken, title, body) => {
  try {
    const payload = {
      token: fcmToken,
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

    // console.log(response);

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

const saveNotificationToDb = async (
  userId,
  title,
  body,
  fcmToken,
  tradingCode,
  firebaseResponse = ""
) => {
  try {
    await Notification.create({
      title,
      body,
      tradingCode,
      user: userId,
      fcmToken,
      firebaseResponse,
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
  saveNotificationToDb,
};
