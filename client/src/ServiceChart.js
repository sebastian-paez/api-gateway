import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ServiceChart({ instances }) {
  // Guard against undefined
  const dataObj = instances || {};
  const labels = Object.keys(dataObj);

  // Define color map per instance label
  const colorMap = {
    "light-0": "#60A5FA",
    "light-1": "#3B82F6",
    "heavy-0": "#F87171",
    "heavy-1": "#EF4444",
  };

  const data = {
    labels,
    datasets: [
      {
        label: "# Requests",
        data: labels.map((lbl) => dataObj[lbl] || 0),
        backgroundColor: labels.map((lbl) => colorMap[lbl] || "#9CA3AF"),
        borderColor: labels.map((lbl) => colorMap[lbl] || "#9CA3AF"),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Servers",
          font: { size: 14 }
        }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        title: {
          display: true,
          text: "Request Count",
          font: { size: 14 }
        },
      },
    }
  }

  return <Bar data={data} options={options} />;
}
