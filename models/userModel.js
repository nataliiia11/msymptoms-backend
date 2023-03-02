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

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Symptom = require("./symptomModel");
const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: "Please add a name",
    },
    email: {
      type: String,
      required: "Please add an email",
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: "Please add a password",
    },
    bio: {
      type: String,
      default: "bio",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    userAgent: {
      type: Array,
      required: true,
      default: [],
    },
    symptoms: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// associating user with symptoms
// when a user is deleted, also delete any associated symptoms
userSchema.associate = function (models) {
  userSchema.hasMany(models.Symptom, {
    onDelete: "cascade",
  });
};

// Encrypt password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
