// src/StatusChart.js
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusChart({ status }) {
  const labels = Object.keys(status);

  // Define a color map for your status codes:
  const colorMap = {
    "200": "#10B981",  // green for OK
    "400": "#F59E0B",  // amber for client errors
    "429": "#EF4444",  // red for rate limits
    "500": "#6B7280",  // gray for server errors
  };

  const data = {
    labels,
    datasets: [
      {
        data: labels.map((code) => status[code]),
        backgroundColor: labels.map((code) => colorMap[code] || "#9CA3AF"),
        borderColor: labels.map((code) => "#ffffff"),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { enabled: true },
    },
  };

  return (
    <Doughnut
      data={data}
      options={options}
      aria-label="Status code distribution"
    />
  );
}
