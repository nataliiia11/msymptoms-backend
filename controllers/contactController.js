/*
  =========================================================
  * ZINOTRUST ACADEMY 
  =========================================================
  * Email: zinotrust@gmail.com
  * Copyright 2021 AKPAREVA EWOMAZINO
  * 
  =========================================================
  * This code was reviewed and changed by Nataliia Azarnykh
*/

const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const { StatusCodes } = require("http-status-codes");

const contactUs = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found, please signup");
  }

  if (!subject || !message) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Please add subject and message");
  }

  const send_to = process.env.EMAIL_USER;
  const sent_from = user.email;
  const reply_to = user.email;
  name = user.name;
  const template = "contact";
  const link = message;

  try {
    await sendEmail(
      sent_from,
      send_to,
      reply_to,
      subject,
      template,
      name,
      link
    );
    res.status(StatusCodes.OK).json({ success: true, message: "Email Sent" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("Email not sent, please try again");
  }
});

module.exports = {
  contactUs,
};
