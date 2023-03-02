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
const bcrypt = require("bcryptjs");
var parser = require("ua-parser-js");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const Cryptr = require("cryptr");
const { StatusCodes, getReasonPhrase } = require("http-status-codes");
const { generateToken, hashToken } = require("../utils/UtilsMethods");
const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(getReasonPhrase(StatusCodes.BAD_REQUEST));
  }
  if (password.length < 6) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Password must be at least 6 characters.");
  }
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("User already exist. Please try to login.");
  }
  // Get UserAgent - the information about browswe, operation system, etc
  //We can grab it from the headers
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  const user = await User.create({
    name,
    email,
    password,
    userAgent,
  });

  const token = generateToken(user._id);

  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });
  if (user) {
    const { _id, name, email, bio, isVerified, symptoms } = user;

    return res.status(StatusCodes.CREATED).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      isVerified: user.isVerified,
      symptoms: user.symptoms,
      token,
    });
  } else {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid user data");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Please add email and password");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found, please signup");
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  if (!passwordIsCorrect) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid email or password");
  }

  // Trgger 2FA for unknow UserAgent
  const ua = parser(req.headers["user-agent"]);
  const thisUserAgent = ua.ua;
  const allowedAgent = user.userAgent.includes(thisUserAgent);

  if (!allowedAgent) {
    // Genrate 6 digit code
    const loginCode = Math.floor(100000 + Math.random() * 900000);

    // Encrypt login code before saving to DB
    const encryptedLoginCode = cryptr.encrypt(loginCode.toString());

    // Delete Token if it exists in DB
    let userToken = await Token.findOne({ _id: user._id });
    if (userToken) {
      await userToken.deleteOne();
    }

    // Save Token to DB
    await new Token({
      _id: user._id,
      loginToken: encryptedLoginCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
    }).save();

    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("New browser or device detected");
  }

  const token = generateToken(user._id);

  if (user && passwordIsCorrect) {
    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, bio, isVerified, symptoms } = user;

    res.status(200).json({
      _id,
      name,
      email,
      bio,
      isVerified,
      symptoms,
      token,
    });
  } else {
    res.status(500);
    throw new Error("Something went wrong, please try again");
  }
});

const sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }

  let userToken = await Token.findOne({
    _id: user._id,
    expiresAt: { $gt: Date.now() },
  });
  if (!userToken) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Invalid or Expired token, please login again");
  }

  const loginCode = userToken.loginToken;
  const decryptedLoginCode = cryptr.decrypt(loginCode);

  // Send Login Code
  const subject = "MSymptoms Login Access Code";
  const send_to = email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = process.env.EMAIL_USER;
  const name = user.name;
  const link = decryptedLoginCode;
  const template = "loginCode";

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
    res
      .status(StatusCodes.OK)
      .json({ message: `Access code sent to ${email}` });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("Email not sent, please try again");
  }
});

const loginWithCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { loginCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }

  // Find user Login Token
  const userToken = await Token.findOne({
    _id: user._id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Invalid or Expired Token, please login again");
  }

  const decryptedLoginCode = cryptr.decrypt(userToken.loginToken);

  if (loginCode !== decryptedLoginCode) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Incorrect login code, please try again");
  } else {
    // Register userAgent
    const ua = parser(req.headers["user-agent"]);
    const thisUserAgent = ua.ua;
    user.userAgent.push(thisUserAgent);
    await user.save();

    const token = generateToken(user._id);

    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, bio, isVerified } = user;

    res.status(StatusCodes.OK).json({
      _id,
      name,
      email,
      bio,
      isVerified,
      symptoms,
      token,
    });
  }
});

const sendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("User already verified");
  }

  // Delete Token if it exists in DB
  let token = await Token.findOne({ _id: user._id });
  if (token) {
    await token.deleteOne();
  }

  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;

  const hashedToken = hashToken(verificationToken);
  await new Token({
    _id: user._id,
    verificationToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
  }).save();

  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

  // Send Email
  const subject = "Verify Your Account in MSymptoms";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = process.env.EMAIL_USER;
  const template = "verifyEmail";
  const name = user.name;
  const link = verificationUrl;

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
    res.status(StatusCodes.OK).json({ message: "Verification Email Sent" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("Email not sent, please try again");
  }
});

const verifyUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = hashToken(verificationToken);

  const userToken = await Token.findOne({
    verificationToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Invalid or Expired Token");
  }

  const user = await User.findOne({ _id: userToken._id });
  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
  if (user.isVerified) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("User is already verified");
  }
  user.isVerified = true;
  await user.save();

  res
    .status(StatusCodes.OK)
    .json({ message: "Account Verification Successful" });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(StatusCodes.OK).json({ message: "Logout successful" });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { _id, name, email, bio, isVerified, symptoms } = user;
    res.status(StatusCodes.OK).json({
      _id,
      name,
      email,
      bio,
      isVerified,
      symptoms,
    });
  } else {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { name, email, bio, isVerified, symptoms } = user;

    user.email = email;
    user.name = req.body.name || name;
    user.bio = req.body.bio || bio;
    user.symptoms = req.user.symptoms || symptoms;
    const updatedUser = await user.save();

    res.status(StatusCodes.OK).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      isVerified: updatedUser.isVerified,
      symptoms: updatedUser.symptoms,
    });
  } else {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  await user.remove();
  res.status(StatusCodes.OK).json({
    message: "User deleted successfully",
  });
});

const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }

  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

const sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, reply_to, template, url } = req.body;

  if (!subject || !send_to || !reply_to || !template) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("Missing email parameter");
  }

  const user = await User.findOne({ email: send_to });

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }

  const sent_from = process.env.EMAIL_USER;
  const name = user.name;
  const link = `${process.env.FRONTEND_URL}/${url}`;

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
    res.status(StatusCodes.OK).json({ message: "Email Sent" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("Email not sent, please try again");
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("No user with this email");
  }

  // Delete Token if it exists in DB
  let token = await Token.findOne({ _id: user._id });
  if (token) {
    await token.deleteOne();
  }

  //   Create Verification Token and Save
  const resetToken = crypto.randomBytes(32).toString("hex") + user._id;

  // Hash token and save
  const hashedToken = hashToken(resetToken);
  await new Token({
    _id: user._id,
    resetToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
  }).save();

  // Construct Reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;

  // Send Email
  const sent_from = process.env.EMAIL_USER;
  const send_to = user.email;
  const reply_to = process.env.EMAIL_USER;
  const subject = "MSymptoms Password Reset Request";
  const template = "forgotPassword";
  const name = user.name;
  const link = resetUrl;

  await sendEmail(sent_from, send_to, reply_to, subject, template, name, link);
  res.status(StatusCodes.OK).json({ message: "Password Reset Email Sent" });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const password = req.body.password;

  const hashedToken = hashToken(resetToken);
  const userToken = await Token.findOne({
    resetToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Invalid or Expired Token");
  }
  const user = await User.findOne({ _id: userToken._id });
  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
  user.password = password;
  await user.save();
  res.status(StatusCodes.OK).json({ message: "Reset Successful" });
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }

  if (!oldPassword || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Please enter old and new password");
  }
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  if (user && passwordIsCorrect) {
    user.password = password;
    await user.save();

    res
      .status(StatusCodes.OK)
      .json({ message: "Password change successful, please re-login" });
  } else {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Old password is incorrect");
  }
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  loginStatus,
  sendAutomatedEmail,
  sendVerificationEmail,
  verifyUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendLoginCode,
  loginWithCode,
};
