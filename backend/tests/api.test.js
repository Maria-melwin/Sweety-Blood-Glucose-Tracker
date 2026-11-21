
const request = require("supertest");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const app = require("../server");

describe("Sweety Blood Glucose Tracker API", () => {
  const testEmail = `jest_${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  let token;
  let userId;
  let readingId;

  const today = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  };

  beforeAll(async () => {
    // Register a separate test user
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jest Test User",
        email: testEmail,
        password: testPassword,
      });

    expect(response.statusCode).toBe(201);
    userId = response.body.user.id;

    // Login to obtain JWT
    const login = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(login.statusCode).toBe(200);
    token = login.body.token;
  });

  afterAll(async () => {
    if (userId) {
      await pool.query(
        "DELETE FROM users WHERE id = $1",
        [userId]
      );
    }
    await pool.end();
  });

  test("should reject duplicate registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jest Test User",
        email: testEmail,
        password: testPassword,
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toBe(
      "Email is already registered"
    );
  });

  test("should reject invalid login password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: "WrongPassword123!",
      });

    expect(response.statusCode).toBe(401);
  });

  test("should reject access without authentication", async () => {
    const response = await request(app)
      .get("/api/readings");

    expect(response.statusCode).toBe(401);
  });

  test("should add a valid glucose reading", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        reading_date: today(),
        time_slot: "Morning",
        glucose_value: 110,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.reading.glucose_value).toBe(110);

    readingId = response.body.reading.id;
  });

  test("should reject glucose value below 40", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        reading_date: today(),
        time_slot: "After breakfast",
        glucose_value: 30,
      });

    expect(response.statusCode).toBe(400);
  });

  test("should reject glucose value above 600", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        reading_date: today(),
        time_slot: "After breakfast",
        glucose_value: 650,
      });

    expect(response.statusCode).toBe(400);
  });

  test("should reject duplicate time slot on same date", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        reading_date: today(),
        time_slot: "Morning",
        glucose_value: 120,
      });

    expect(response.statusCode).toBe(409);
  });

  test("should reject future reading date", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);

    const offset = future.getTimezoneOffset();
    const futureDate = new Date(
      future.getTime() - offset * 60000
    ).toISOString().slice(0, 10);

    const response = await request(app)
      .post("/api/readings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        reading_date: futureDate,
        time_slot: "After breakfast",
        glucose_value: 120,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Future dates are not allowed"
    );
  });

  test("should retrieve user's readings", async () => {
    const response = await request(app)
      .get("/api/readings")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.count).toBeGreaterThanOrEqual(1);
  });

  test("should retrieve a single reading", async () => {
    const response = await request(app)
      .get(`/api/readings/${readingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.reading.id).toBe(readingId);
  });

  test("should update a reading", async () => {
    const response = await request(app)
      .put(`/api/readings/${readingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        reading_date: today(),
        time_slot: "Morning",
        glucose_value: 125,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.reading.glucose_value).toBe(125);
  });

  test("should generate daily report", async () => {
    const response = await request(app)
      .get(`/api/reports/daily?date=${today()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.summary.count).toBeGreaterThanOrEqual(1);
  });

  test("should generate month-to-date report", async () => {
    const response = await request(app)
      .get("/api/reports/month-to-date")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.summary.count).toBeGreaterThanOrEqual(1);
  });

  test("should generate previous-month report", async () => {
    const response = await request(app)
      .get("/api/reports/previous-month")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.summary).toBeDefined();
  });

  test("should delete a reading", async () => {
    const response = await request(app)
      .delete(`/api/readings/${readingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
  });
});
