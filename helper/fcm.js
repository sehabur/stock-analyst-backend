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

    if (!user) {
      return {
        status: 404,
        message: "User not found",
      };
    }

    const payload = {
      notification: {
        title: title,
        body: body,
      },
      token: user.fcmToken || "",
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
