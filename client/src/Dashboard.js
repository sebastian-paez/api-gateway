import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './auth';
import { useApi } from './api';
import ServiceChart from './ServiceChart';
import StatusChart from './StatusChart';
import TrafficSimulator from './TrafficSimulator';

export default function Dashboard() {
  const { logout } = useAuth();
  const { getMetrics, clearMetrics } = useApi();
  const [metrics, setMetrics] = useState(null);

  const fetchMetrics = useCallback(() => {
    getMetrics().then(data => setMetrics(data)).catch(console.error);
  }, [getMetrics]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <svg
          className="animate-spin h-12 w-12 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  const total =
    metrics.plans.basic.allowed +
    metrics.plans.basic.blocked +
    metrics.plans.premium.allowed +
    metrics.plans.premium.blocked;
  const blocked = metrics.plans.basic.blocked + metrics.plans.premium.blocked;
  const blockedPct = total > 0 ? ((blocked / total) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Total Requests</h2>
            <p className="mt-4 text-3xl font-bold text-gray-900">{total}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Blocked Requests</h2>
            <p className="mt-4 text-3xl font-bold text-red-600">
              {blocked} <span className="text-base font-medium text-gray-500">({blockedPct}%)</span>
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Average Latency</h2>
            <div className="mt-4 space-y-1">
              <p className="text-lg text-gray-800">
                <span className="font-medium">Light:</span> {(metrics.latency.light * 1000).toFixed(1)} ms
              </p>
              <p className="text-lg text-gray-800">
                <span className="font-medium">Heavy:</span> {(metrics.latency.heavy * 1000).toFixed(1)} ms
              </p>
            </div>
          </div>
        </div>

        {/* Clear Metrics Button */}
        <div className="flex justify-end">
          <button
            onClick={async () => {
              await clearMetrics();
              fetchMetrics();
            }}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
          >
            Clear Metrics
          </button>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Requests by Service</h3>
            <ServiceChart services={metrics.services} />
          </div>

          <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Status Codes</h3>
            <StatusChart status={metrics.status} />
          </div>
        </div>

        {/* Traffic Simulator */}
        <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Simulate Traffic</h3>
          <TrafficSimulator />
        </div>
      </main>
    </div>
  );
}
