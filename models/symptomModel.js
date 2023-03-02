const mongoose = require("mongoose");

const symptomSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    bodyPart: {
      type: String,
      required: false,
      trim: true,
    },
    intensity: {
      type: String,
      required: false,
      trim: true,
    },
    note: {
      type: String,
      required: false,
      trim: true,
    },
    date: Date,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Symptom = mongoose.model("Symptom", symptomSchema);
module.exports = Symptom;
