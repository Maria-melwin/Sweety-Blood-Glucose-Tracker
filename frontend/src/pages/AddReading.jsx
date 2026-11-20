import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AddReading() {
  const navigate = useNavigate();

  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const [form, setForm] = useState({
    reading_date: localDate,
    time_slot: "Morning",
    glucose_value: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const value = Number(form.glucose_value);

    if (!Number.isInteger(value) || value < 40 || value > 600) {
      setError("Glucose value must be an integer between 40 and 600.");
      return;
    }

    if (form.reading_date > localDate) {
      setError("Future dates are not allowed.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/readings", {
        ...form,
        glucose_value: value,
      });

      setMessage(response.data.message);

      setForm({
        reading_date: localDate,
        time_slot: "Morning",
        glucose_value: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add reading.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <form className="reading-form" onSubmit={handleSubmit}>
        <h1>Add Glucose Reading</h1>
        <p>Record your blood glucose reading.</p>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <label>Date</label>
        <input
          type="date"
          name="reading_date"
          value={form.reading_date}
          max={localDate}
          onChange={handleChange}
          required
        />

        <label>Time Slot</label>
        <select
          name="time_slot"
          value={form.time_slot}
          onChange={handleChange}
          required
        >
          <option value="Morning">Morning</option>
          <option value="After breakfast">After breakfast</option>
          <option value="After lunch">After lunch</option>
          <option value="After dinner">After dinner</option>
        </select>

        <label>Glucose Value (mg/dL)</label>
        <input
          type="number"
          name="glucose_value"
          min="40"
          max="600"
          step="1"
          placeholder="Enter glucose value"
          value={form.glucose_value}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Reading"}
        </button>

        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </form>
    </div>
  );
}

export default AddReading;
