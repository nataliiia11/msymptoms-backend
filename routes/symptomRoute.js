const express = require("express");
const {
  createSymptom,
  getSymptoms,
  getSymptom,
  deleteSymptom,
  updateSymptom,
  getSymptomsWithDate,
  getSymptomsToday,
  getSymptomsByName,
  getSymptomsByBodyPart,
} = require("../controllers/symptomController");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getSymptoms).post(protect, createSymptom);
router.route("/filter").post(protect, getSymptomsWithDate);
router.route("/today").get(protect, getSymptomsToday);
router.route("/name").post(protect, getSymptomsByName);
router.route("/bodyPart").post(protect, getSymptomsByBodyPart);
router
  .route("/:id")
  .get(protect, getSymptom)
  .delete(protect, deleteSymptom)
  .put(protect, updateSymptom);

module.exports = router;
