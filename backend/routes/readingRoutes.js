const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  addReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
} = require("../controllers/readingController");

// All reading routes require authentication
router.use(authMiddleware);

// Add glucose reading
router.post("/", addReading);

// Get all readings
router.get("/", getReadings);

// Get a single reading
router.get("/:id", getReadingById);

// Update reading
router.put("/:id", updateReading);

// Delete reading
router.delete("/:id", deleteReading);

module.exports = router;
