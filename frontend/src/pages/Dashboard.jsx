import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    count: 0,
    high: null,
    low: null,
    average: null,
  });

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const today = new Date();
        const localDate = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0"),
        ].join("-");

        const [reportResponse, readingsResponse] = await Promise.all([
          api.get(`/reports/daily?date=${localDate}`),
          api.get("/readings"),
        ]);

        setSummary(reportResponse.data.summary);
        setReadings(readingsResponse.data.readings || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load dashboard data.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cards = [
    {
      title: "Today's Readings",
      value: summary.count,
      color: "green",
    },
    {
      title: "Average Glucose",
      value: summary.average ?? "--",
      color: "blue",
    },
    {
      title: "Highest Reading",
      value: summary.high ?? "--",
      color: "orange",
    },
    {
      title: "Lowest Reading",
      value: summary.low ?? "--",
      color: "purple",
    },
  ];

  const formatDate = (date) => {
    const d = new Date(date);

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  };

  if (loading) {
    return <p className="dashboard-loading">Loading dashboard...</p>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Sweety</h1>
          <p>Blood Glucose Tracker</p>
        </div>

        <div className="dashboard-user">
          <span>Welcome, {user?.name || "User"}</span>

          <button onClick={() => navigate("/add-reading")}>
            + Add Reading
          </button>

          <button onClick={() => navigate("/readings")}>Manage Readings</button>

          <button onClick={() => navigate("/reports")}>View Reports</button>

          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>Dashboard Overview</h2>
        <p className="dashboard-subtitle">Your glucose readings for today</p>

        {error && <p className="error-message">{error}</p>}

        <section className="summary-grid">
          {cards.map((card) => (
            <div className={`summary-card ${card.color}`} key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="recent-readings">
          <h2>Recent Readings</h2>

          {readings.length === 0 ? (
            <p>No readings available yet. Add your first reading!</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Glucose (mg/dL)</th>
                  </tr>
                </thead>

                <tbody>
                  {readings.slice(0, 5).map((reading) => (
                    <tr key={reading.id}>
                      <td>{formatDate(reading.reading_date)}</td>
                      <td>{reading.time_slot}</td>
                      <td>{reading.glucose_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
