const pool = require("../config/db");

// Daily report
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Please provide a valid date in YYYY-MM-DD format",
      });
    }

    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS count,
         MAX(glucose_value) AS high,
         MIN(glucose_value) AS low,
         ROUND(AVG(glucose_value)::numeric, 1) AS average
       FROM readings
       WHERE user_id = $1 AND reading_date = $2`,
      [req.user.id, date],
    );

    const readings = await pool.query(
      `SELECT id, reading_date, time_slot, glucose_value
       FROM readings
       WHERE user_id = $1 AND reading_date = $2
       ORDER BY
         CASE time_slot
           WHEN 'Morning' THEN 1
           WHEN 'After breakfast' THEN 2
           WHEN 'After lunch' THEN 3
           WHEN 'After dinner' THEN 4
         END`,
      [req.user.id, date],
    );

    const summary = result.rows[0];

    res.json({
      message:
        summary.count === 0
          ? "No readings found for this date."
          : "Daily report generated successfully",
      summary,
      readings: readings.rows,
    });
  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ message: "Failed to generate daily report" });
  }
};

// Month-to-date report
const getMonthToDateReport = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS count,
         MAX(glucose_value) AS high,
         MIN(glucose_value) AS low,
         ROUND(AVG(glucose_value)::numeric, 1) AS average
       FROM readings
       WHERE user_id = $1
         AND reading_date >= date_trunc('month', CURRENT_DATE)::date
         AND reading_date <= CURRENT_DATE`,
      [req.user.id],
    );

    const summary = result.rows[0];

    res.json({
      message:
        summary.count === 0
          ? "No readings found for this month."
          : "Month-to-date report generated successfully",
      summary,
    });
  } catch (error) {
    console.error("Month-to-date report error:", error);
    res.status(500).json({ message: "Failed to generate monthly report" });
  }
};

// Previous full month report
const getPreviousMonthReport = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS count,
         MAX(glucose_value) AS high,
         MIN(glucose_value) AS low,
         ROUND(AVG(glucose_value)::numeric, 1) AS average
       FROM readings
       WHERE user_id = $1
         AND reading_date >=
           (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
         AND reading_date <
           date_trunc('month', CURRENT_DATE)::date`,
      [req.user.id],
    );

    const summary = result.rows[0];

    res.json({
      message:
        summary.count === 0
          ? "No readings found for the previous month."
          : "Previous-month report generated successfully",
      summary,
    });
  } catch (error) {
    console.error("Previous-month report error:", error);
    res
      .status(500)
      .json({ message: "Failed to generate previous-month report" });
  }
};

module.exports = {
  getDailyReport,
  getMonthToDateReport,
  getPreviousMonthReport,
};
