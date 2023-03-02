const Symptom = require("../models/symptomModel");
const User = require("../models/userModel");
var ObjectId = require("mongodb").ObjectID;
const jwt = require("jsonwebtoken");
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.CRYPTR_KEY);
const { StatusCodes } = require("http-status-codes");

const createSymptom = async (req, res) => {
  try {
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);

    const newSymptom = new Symptom({
      name: cryptr.encrypt(req.body.name),
      date: new Date(),
      bodyPart: req.body.bodyPart,
      intensity: req.body.intensity,
    });

    const symptom = await User.updateOne(
      { _id: decodedId.id },
      { $push: { symptoms: newSymptom } }
    );
    res.status(StatusCodes.OK).json({
      symptom,
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const getSymptoms = async (req, res) => {
  try {
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedId.id);
    if (!user) {
      throw new Error("User does not exist");
    } else {
      const symptoms = user.symptoms;
      const arr = [];

      for (const symptom of symptoms) {
        if (symptom) {
          symptom.name = cryptr.decrypt(symptom.name);
          if (symptom.name) {
            arr.push(symptom);
          }
        }
      }
      res.status(StatusCodes.OK).json(arr);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSymptom = async (req, res) => {
  try {
    const { id } = req.params;
    const symptomObject = await User.findOne(
      { symptoms: { $elemMatch: { _id: ObjectId(id) } } },
      { "symptoms.$": 1, _id: 0 }
    );
    res.status(StatusCodes.OK).json(symptomObject);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const deleteSymptom = async (req, res) => {
  try {
    const { id } = req.params;

    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedId) return res.status(401).send({ error: "Invalid token" });

    const user = await User.findOneAndUpdate(
      { _id: decodedId.id, "symptoms._id": ObjectId(id) },
      { $pull: { symptoms: { _id: ObjectId(id) } } },
      { new: true }
    );

    res.status(StatusCodes.OK).json(user);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const updateSymptom = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    const encryptedName = cryptr.encrypt(req.body.name);
    const updatedSymptom = new Symptom({
      name: encryptedName,
      intensity: req.body.intensity,
      bodyPart: req.body.bodyPart,
      date: req.body.date,
    });

    const update = await User.updateOne(
      { _id: decodedId.id, "symptoms._id": ObjectId(id) },
      {
        $set: {
          "symptoms.$.name": encryptedName,
          "symptoms.$.intensity": req.body.intensity,
          "symptoms.$.bodyPart": req.body.bodyPart,
        },
      }
    );
    if (!update) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(`No Symptom with id: ${id}`);
    }

    res.status(StatusCodes.OK).json(updatedSymptom);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const getSymptomsWithDate = async (req, res) => {
  try {
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    const endDate = new Date(req.body.data.endDate);
    const startDate = new Date(req.body.data.startDate);

    const user = await User.findById(decodedId.id);
    const symptoms = user.symptoms;
    const arr = [];
    for (const symptom of symptoms) {
      if (symptom) {
        symptom.name = cryptr.decrypt(symptom.name);

        if (symptom.name) {
          arr.push(symptom);
        }
      }
    }
    const result = arr.filter((symptom) => {
      const symptomDate = new Date(symptom.date);
      return symptomDate <= endDate && symptomDate >= startDate;
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const getSymptomsToday = async (req, res) => {
  try {
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    const ms2 = new Date().getTime() - 86400000 * 2;
    const yesterday = new Date(ms2);
    const user = await User.findById(decodedId.id);
    const symptoms = user.symptoms;
    const arr = [];
    for (const symptom of symptoms) {
      if (symptom) {
        symptom.name = cryptr.decrypt(symptom.name);

        if (symptom.name) {
          arr.push(symptom);
        }
      }
    }
    const result = arr.filter((symptom) => {
      const symptomDate = new Date(symptom.date);
      return symptomDate >= yesterday;
    });
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
  }
};

const getSymptomsByName = async (req, res) => {
  try {
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedId.id);
    const symptoms = user.symptoms;
    const arr = [];

    for (const symptom of symptoms) {
      if (symptom) {
        symptom.name = cryptr.decrypt(symptom.name);

        if (symptom.name) {
          arr.push(symptom);
        }
      }
    }
    const result = arr.filter((symptom) => {
      const symptomName = symptom.name;
      return symptomName === req.body.name;
    });

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
  }
};

const getSymptomsByBodyPart = async (req, res) => {
  try {
    const token = req.cookies["token"];
    const decodedId = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedId.id);
    const symptoms = user.symptoms;
    const arr = [];

    for (const symptom of symptoms) {
      if (symptom) {
        symptom.bodyPart = cryptr.decrypt(symptom.bodyPart);
        if (symptom.bodyPart) {
          arr.push(symptom);
        }
      }
    }
    const result = arr.filter((symptom) => {
      const symptomBodyPart = symptom.bodyPart;
      return symptomBodyPart === req.body.bodyPart;
    });
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
  }
};

module.exports = {
  createSymptom,
  getSymptoms,
  getSymptom,
  deleteSymptom,
  updateSymptom,
  getSymptomsWithDate,
  getSymptomsToday,
  getSymptomsByName,
  getSymptomsByBodyPart,
};
