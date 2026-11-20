
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function seedDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create demo user
    const email = "demo@sweety.com";
    const password = "Demo12345!";
    const hashedPassword = await bcrypt.hash(password, 10);

    let userResult = await client.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ["Demo User", email, hashedPassword]
    );

    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    } else {
      userResult = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      userId = userResult.rows[0].id;
    }

    // Sample glucose readings
    const readings = [
      [0, "Morning", 110],
      [0, "After breakfast", 135],
      [0, "After lunch", 125],
      [1, "Morning", 105],
      [1, "After dinner", 120]
    ];

    for (const [daysAgo, timeSlot, glucoseValue] of readings) {
      await client.query(
        `INSERT INTO readings
         (user_id, reading_date, time_slot, glucose_value)
         VALUES ($1, CURRENT_DATE - $2::integer, $3, $4)
         ON CONFLICT (user_id, reading_date, time_slot)
         DO NOTHING`,
        [userId, daysAgo, timeSlot, glucoseValue]
      );
    }

    await client.query("COMMIT");

    console.log("Database seeded successfully!");
    console.log("Demo email:", email);
    console.log("Demo password:", password);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
