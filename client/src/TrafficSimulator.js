import React, { useState, useEffect } from "react";
import { useApi } from "./api";

export default function TrafficSimulator() {
  const { simulateTraffic } = useApi();

  const [total, setTotal] = useState(50);
  const [serviceRatio, setServiceRatio] = useState(50); // % heavy vs light
  const [basicUsers, setBasicUsers] = useState("5");
  const [premiumUsers, setPremiumUsers] = useState("5");
  const [mode, setMode] = useState("burst");
  const [duration, setDuration] = useState("30");
  const [status, setStatus] = useState({ text: "", type: "" });

  const run = async () => {
    setStatus({ text: "Starting simulation…", type: "info" });
    try {
      await simulateTraffic({
        total_requests: total,
        pct_heavy: serviceRatio / 100,
        num_basic_users: parseInt(basicUsers, 10) || 0,
        num_premium_users: parseInt(premiumUsers, 10) || 0,
        mode,
        duration_seconds: parseInt(duration, 10) || 0,
      });
      setStatus({ text: "Simulation started!", type: "success" });
    } catch (e) {
      setStatus({ text: `Error: ${e.message}`, type: "error" });
    }
  };

  // clear status after 5 seconds
  useEffect(() => {
    if (!status.text) return;
    const timer = setTimeout(() => setStatus({ text: "", type: "" }), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  // helper to clean leading zeros and non-digits
  const sanitizeNumber = (value) =>
    value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");

  return (
    <div className="space-y-4">
      {/* Total requests */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Total Requests: {total}
        </label>
        <input
          type="range"
          min="1"
          max="1000"
          value={total}
          onChange={(e) => setTotal(+e.target.value)}
          className="w-full"
        />
      </div>

      {/* Heavy vs Light */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Service Mix: Light {100 - serviceRatio}% – Heavy {serviceRatio}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={serviceRatio}
          onChange={(e) => setServiceRatio(+e.target.value)}
          className="w-full"
        />
      </div>

      {/* # Basic Users */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Number of Basic Users (Capacity: 5 req/sec, Refill Rate: 1 req/sec)
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={basicUsers}
          onChange={(e) => setBasicUsers(sanitizeNumber(e.target.value))}
          className="mt-1 block w-24 border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* # Premium Users */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Number of Premium Users (Capacity: 20 req/sec, Refill Rate: 5 req/sec)
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={premiumUsers}
          onChange={(e) => setPremiumUsers(sanitizeNumber(e.target.value))}
          className="mt-1 block w-24 border-gray-300 rounded-md shadow-sm"
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={duration}
            onChange={(e) => setDuration(sanitizeNumber(e.target.value))}
            className="w-24 border-gray-300 rounded-md shadow-sm"
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

      {status.text && (
        <p
          className={`mt-2 text-sm ${
            status.type === 'success'
              ? 'text-green-600'
              : status.type === 'error'
              ? 'text-red-600'
              : 'text-gray-700'
          }`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
