const isDateTimeSmallerThanToday = (date) => {
  if (!date) return false;

  const now = new Date();

  const nowInGMT6 = new Date(now);
  nowInGMT6.setUTCHours(now.getUTCHours() + 6);

  const inputDateInGMT6 = new Date(date);
  inputDateInGMT6.setUTCHours(inputDateInGMT6.getUTCHours() + 6);

  return inputDateInGMT6 > nowInGMT6;
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

module.exports = {
  isDateTimeSmallerThanToday,
  addDaysToToday,
  generateSixDigitRandomNumber,
};
