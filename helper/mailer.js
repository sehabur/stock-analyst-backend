const nodemailer = require("nodemailer");

const smtpTransport = require("nodemailer-smtp-transport");

const sendMailToUser = (mailTo, mailBody, subject) => {
  const transporter = nodemailer.createTransport(
    smtpTransport({
      host: "mail.privateemail.com",
      port: "465",
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    })
  );

  try {
    return transporter.sendMail({
      from: {
        name: "Stocksupporter",
        address: process.env.MAIL_USER,
      },
      to: mailTo,
      subject,
      html: mailBody,
    });
  } catch (err) {
    return err;
  }
};

module.exports = {
  sendMailToUser,
};
