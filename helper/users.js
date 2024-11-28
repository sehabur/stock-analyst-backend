const axios = require("axios");

const isDateTimeSmallerThanToday = (date) => {
  if (!date) return false;

  const now = new Date();

  const nowInGMT6 = new Date(now);
  nowInGMT6.setUTCHours(now.getUTCHours() + 6);

  const inputDateInGMT6 = new Date(date);
  inputDateInGMT6.setUTCHours(inputDateInGMT6.getUTCHours() + 6);

  return inputDateInGMT6 > nowInGMT6;
};

const checkIsPremiumEligible = (isPremium, premiumExpireDate) => {
  return isPremium && isDateTimeSmallerThanToday(premiumExpireDate);
};

function addDaysToToday(days) {
  const today = new Date();
  const resultDate = new Date(today);
  resultDate.setDate(today.getDate() + days);
  resultDate.setUTCHours(17, 59, 0, 0); // 23:59 at GMT+6 corresponds to 17:59 UTC
  return resultDate;
}

function generateSixDigitRandomNumber() {
  return Math.floor(100000 + Math.random() * 900000);
}

/*
  Function for bulksmsbd
*/
const sendOtpToUser = async (phone, message) => {
  try {
    const url = process.env.SMS_GW_URL;
    const apiKey = process.env.SMS_GW_API_KEY;

    const response = await axios.post(url, {
      api_key: apiKey,
      type: "text",
      number: "88" + phone,
      senderid: "8809617620371",
      message: message,
    });

    if (response?.data?.response_code == 202) {
      return { status: "success" };
    } else {
      return { status: "fail" };
    }
  } catch (error) {
    return { status: "fail" };
  }
};

/*
  Function for sms.net.bd
*/
// const sendOtpToUser = async (phone, message) => {
//   try {
//     const url = process.env.SMS_GW_URL;
//     const apiKey = process.env.SMS_GW_API_KEY;

//     const response = await axios.post(url, {
//       api_key: apiKey,
//       msg: message,
//       to: phone,
//     });

//     if (response?.data?.error == 0) {
//       return { status: "success" };
//     } else {
//       return { status: "fail" };
//     }
//   } catch (error) {
//     return { status: "fail" };
//   }
// };

module.exports = {
  // isDateTimeSmallerThanToday,
  checkIsPremiumEligible,
  addDaysToToday,
  generateSixDigitRandomNumber,
  sendOtpToUser,
};
