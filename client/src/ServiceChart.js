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

export default function ServiceChart({ services }) {
  const labels = Object.keys(services);

  // Define a color map for each service
  const colorMap = {
    light: "#3B82F6", // blue
    heavy: "#EF4444", // red
  };

  const data = {
    labels,
    datasets: [
      {
        label: "# of Requests",
        data: labels.map((l) => services[l]),
        backgroundColor: labels.map((l) => colorMap[l] || "#9CA3AF"),
        borderColor: labels.map((l) => colorMap[l] || "#9CA3AF"),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Requests per Service',
        font: { size: 16 }
      },
      tooltip: { enabled: true }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    },
  };

  return <Bar data={data} options={options} />;
}
