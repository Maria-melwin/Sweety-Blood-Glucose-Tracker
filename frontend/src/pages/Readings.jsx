import { useEffect, useState } from "react";
import api from "../services/api";

function Readings() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    reading_date: "",
    time_slot: "Morning",
    glucose_value: "",
  });

  const fetchReadings = async () => {
    try {
      const response = await api.get("/readings");
      setReadings(response.data.readings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load readings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const startEdit = (reading) => {
    setEditingId(reading.id);

    setForm({
      reading_date: String(reading.reading_date).slice(0, 10),
      time_slot: reading.time_slot,
      glucose_value: String(reading.glucose_value),
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");

    const value = Number(form.glucose_value);

    if (!Number.isInteger(value) || value < 40 || value > 600) {
      setError("Enter an integer between 40 and 600.");
      return;
    }

    const localToday = [
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, "0"),
      String(new Date().getDate()).padStart(2, "0"),
    ].join("-");

    if (form.reading_date > localToday) {
      setError("Future dates are not allowed.");
      return;
    }

    try {
      await api.put(`/readings/${editingId}`, {
        ...form,
        glucose_value: value,
      });

      setEditingId(null);
      await fetchReadings();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this reading?",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/readings/${id}`);
      await fetchReadings();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed.");
    }
  };

  if (loading) return <p>Loading readings...</p>;

  return (
    <div className="readings-page">
      <h1>Manage Glucose Readings</h1>
      <p>View, edit and delete your glucose records.</p>

      {error && <div className="error-message">{error}</div>}

      {editingId !== null && (
        <form className="reading-form" onSubmit={handleUpdate}>
          <h2>Edit Reading</h2>

          <label>Date</label>
          <input
            type="date"
            name="reading_date"
            value={form.reading_date}
            onChange={handleChange}
            required
          />

          <label>Time Slot</label>
          <select
            name="time_slot"
            value={form.time_slot}
            onChange={handleChange}
          >
            <option>Morning</option>
            <option>After breakfast</option>
            <option>After lunch</option>
            <option>After dinner</option>
          </select>

          <label>Glucose Value</label>
          <input
            type="number"
            name="glucose_value"
            min="40"
            max="600"
            step="1"
            value={form.glucose_value}
            onChange={handleChange}
            required
          />

          <button type="submit">Update Reading</button>
          <button type="button" onClick={() => setEditingId(null)}>
            Cancel
          </button>
        </form>
      )}

      <div className="table-wrapper readings-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time Slot</th>
              <th>Glucose (mg/dL)</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {readings.length === 0 ? (
              <tr>
                <td colSpan="4">No readings available.</td>
              </tr>
            ) : (
              readings.map((reading) => (
                <tr key={reading.id}>
                  <td>{String(reading.reading_date).slice(0, 10)}</td>
                  <td>{reading.time_slot}</td>
                  <td>{reading.glucose_value}</td>
                  <td>
                    <button onClick={() => startEdit(reading)}>Edit</button>
                    <button onClick={() => handleDelete(reading.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Readings;
