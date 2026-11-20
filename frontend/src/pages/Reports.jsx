import { useState } from "react";
import api from "../services/api";

function Reports() {
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      let response;

      if (reportType === "daily") {
        response = await api.get(`/reports/daily?date=${selectedDate}`);
      } else if (reportType === "month-to-date") {
        response = await api.get("/reports/month-to-date");
      } else {
        response = await api.get("/reports/previous-month");
      }

      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <h1>Glucose Reports</h1>
      <p>Review your glucose reading summaries.</p>

      <div className="report-controls">
        <label>Report Type</label>

        <select
          value={reportType}
          onChange={(e) => {
            setReportType(e.target.value);
            setReport(null);
            setError("");
          }}
        >
          <option value="daily">Daily Report</option>
          <option value="month-to-date">Month-to-Date Report</option>
          <option value="previous-month">Previous Month Report</option>
        </select>

        {reportType === "daily" && (
          <>
            <label>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              max={new Date().toLocaleDateString("en-CA")}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </>
        )}

        <button onClick={loadReport} disabled={loading}>
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {report && (
        <div className="report-results">
          <h2>Report Summary</h2>

          {report.summary?.count === 0 ? (
            <p>No glucose readings found for this period.</p>
          ) : (
            <div className="report-cards">
              <div className="report-card">
                <h3>Total Readings</h3>
                <p>{report.summary?.count}</p>
              </div>

              <div className="report-card">
                <h3>Highest</h3>
                <p>{report.summary?.high} mg/dL</p>
              </div>

              <div className="report-card">
                <h3>Lowest</h3>
                <p>{report.summary?.low} mg/dL</p>
              </div>

              <div className="report-card">
                <h3>Average</h3>
                <p>{report.summary?.average} mg/dL</p>
              </div>
            </div>
          )}

          {reportType === "daily" && report.readings && (
            <div className="daily-report-table">
              <h2>Daily Readings</h2>

              <table>
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Glucose (mg/dL)</th>
                  </tr>
                </thead>

                <tbody>
                  {report.readings.length === 0 ? (
                    <tr>
                      <td colSpan="2">No readings available.</td>
                    </tr>
                  ) : (
                    report.readings.map((reading) => (
                      <tr key={reading.id}>
                        <td>{reading.time_slot}</td>
                        <td>{reading.glucose_value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
