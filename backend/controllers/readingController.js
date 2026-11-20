const pool = require("../config/db");

const VALID_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

// Validate reading input
const validateReading = (reading_date, time_slot, glucose_value) => {
  if (!reading_date || !time_slot || glucose_value === undefined) {
    return "Date, time slot and glucose value are required";
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reading_date)) {
    return "Date must be in YYYY-MM-DD format";
  }

  const date = new Date(`${reading_date}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== reading_date
  ) {
    return "Invalid reading date";
  }

  if (!VALID_SLOTS.includes(time_slot)) {
    return "Invalid time slot";
  }

  if (
    !Number.isInteger(glucose_value) ||
    glucose_value < 40 ||
    glucose_value > 600
  ) {
    return "Glucose value must be an integer between 40 and 600";
  }

  return null;
};

// ADD READING
const addReading = async (req, res) => {
  const client = await pool.connect();

  try {
    const { reading_date, time_slot, glucose_value } = req.body;
    const userId = req.user.id;

    const validationError = validateReading(
      reading_date,
      time_slot,
      glucose_value,
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    await client.query("BEGIN");

    // Lock user row to prevent concurrent daily-limit violations
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [
      userId,
    ]);

    const futureCheck = await client.query(
      "SELECT $1::date > CURRENT_DATE AS is_future",
      [reading_date],
    );

    if (futureCheck.rows[0].is_future) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Future dates are not allowed",
      });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
             FROM readings
             WHERE user_id = $1 AND reading_date = $2`,
      [userId, reading_date],
    );

    if (countResult.rows[0].total >= 4) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Maximum four readings allowed per day",
      });
    }

    const result = await client.query(
      `INSERT INTO readings
             (user_id, reading_date, time_slot, glucose_value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
      [userId, reading_date, time_slot, glucose_value],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Glucose reading added successfully",
      reading: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A reading already exists for this time slot and date",
      });
    }

    console.error("Add reading error:", error);

    res.status(500).json({
      message: "Server error while adding reading",
    });
  } finally {
    client.release();
  }
};

// GET ALL READINGS
const getReadings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM readings
             WHERE user_id = $1
             ORDER BY reading_date DESC, id DESC`,
      [req.user.id],
    );

    res.status(200).json({
      count: result.rows.length,
      readings: result.rows,
    });
  } catch (error) {
    console.error("Get readings error:", error);

    res.status(500).json({
      message: "Server error while fetching readings",
    });
  }
};

// GET SINGLE READING
const getReadingById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM readings
             WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Reading not found",
      });
    }

    res.status(200).json({
      reading: result.rows[0],
    });
  } catch (error) {
    console.error("Get reading error:", error);

    res.status(500).json({
      message: "Server error while fetching reading",
    });
  }
};

// UPDATE READING
const updateReading = async (req, res) => {
  const client = await pool.connect();

  try {
    const { reading_date, time_slot, glucose_value } = req.body;
    const userId = req.user.id;
    const readingId = req.params.id;

    const validationError = validateReading(
      reading_date,
      time_slot,
      glucose_value,
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    await client.query("BEGIN");

    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [
      userId,
    ]);

    const existing = await client.query(
      `SELECT id FROM readings
             WHERE id = $1 AND user_id = $2
             FOR UPDATE`,
      [readingId, userId],
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Reading not found",
      });
    }

    const futureCheck = await client.query(
      "SELECT $1::date > CURRENT_DATE AS is_future",
      [reading_date],
    );

    if (futureCheck.rows[0].is_future) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Future dates are not allowed",
      });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
             FROM readings
             WHERE user_id = $1
             AND reading_date = $2
             AND id <> $3`,
      [userId, reading_date, readingId],
    );

    if (countResult.rows[0].total >= 4) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Maximum four readings allowed per day",
      });
    }

    const result = await client.query(
      `UPDATE readings
             SET reading_date = $1,
                 time_slot = $2,
                 glucose_value = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
      [reading_date, time_slot, glucose_value, readingId, userId],
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "Reading updated successfully",
      reading: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A reading already exists for this time slot and date",
      });
    }

    console.error("Update reading error:", error);

    res.status(500).json({
      message: "Server error while updating reading",
    });
  } finally {
    client.release();
  }
};

// DELETE READING
const deleteReading = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM readings
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Reading not found",
      });
    }

    res.status(200).json({
      message: "Reading deleted successfully",
    });
  } catch (error) {
    console.error("Delete reading error:", error);

    res.status(500).json({
      message: "Server error while deleting reading",
    });
  }
};

module.exports = {
  addReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
};
