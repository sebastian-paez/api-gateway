import React, { useState } from "react";
import { useApi } from "./api";

export default function TrafficSimulator() {
  const { simulateTraffic } = useApi();

  const [total, setTotal] = useState(50);
  const [serviceRatio, setServiceRatio] = useState(50);    // % heavy vs light (keep)
  const [basicUsers, setBasicUsers] = useState(5);
  const [premiumUsers, setPremiumUsers] = useState(5);
  const [mode, setMode] = useState("burst");
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState("");

  const run = async () => {
    setStatus("Starting simulation…");
    try {
      await simulateTraffic({
        total_requests:    total,
        pct_heavy:         serviceRatio / 100,
        num_basic_users:   basicUsers,
        num_premium_users: premiumUsers,
        mode,
        duration_seconds:  duration,
      });
      setStatus("Simulation kicked off!");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Total requests */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Total Requests: {total}
        </label>
        <input
          type="range" min="1" max="1000"
          value={total}
          onChange={e => setTotal(+e.target.value)}
          className="w-full"
        />
      </div>

      {/* Heavy vs Light */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Service Mix: Light {100 - serviceRatio}% – Heavy {serviceRatio}%
        </label>
        <input
          type="range" min="0" max="100"
          value={serviceRatio}
          onChange={e => setServiceRatio(+e.target.value)}
          className="w-full"
        />
      </div>

      {/* # Basic Users */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          # Basic Users: {basicUsers}
        </label>
        <input
          type="number" min="1" max="100"
          value={basicUsers}
          onChange={e => setBasicUsers(+e.target.value)}
          className="mt-1 block w-20 border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* # Premium Users */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          # Premium Users: {premiumUsers}
        </label>
        <input
          type="number" min="1" max="100"
          value={premiumUsers}
          onChange={e => setPremiumUsers(+e.target.value)}
          className="mt-1 block w-20 border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Mode selector */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border-gray-300 rounded-md shadow-sm"
        >
          <option value="burst">Burst</option>
          <option value="over_time">Over Time</option>
        </select>
        {mode === "over_time" && (
          <input
            type="number" min="1" max="300"
            value={duration}
            onChange={(e) => setDuration(+e.target.value)}
            className="w-20 border-gray-300 rounded-md shadow-sm"
            placeholder="secs"
          />
        )}
      </div>

      {/* Run button */}
      <button
        onClick={run}
        className="mt-4 w-full inline-flex justify-center py-2 px-4 bg-blue-600 text-white font-medium rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
      >
        Run Simulation
      </button>

      {status && (
        <p className="mt-2 text-sm text-gray-700">{status}</p>
      )}
    </div>
  );
}
