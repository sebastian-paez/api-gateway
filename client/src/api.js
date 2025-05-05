import { useAuth } from "./auth";

export function useApi() {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  return {
    getMetrics: () =>
      fetch("/metrics", { headers }).then((r) => r.json()),
    clearMetrics: () =>
      fetch("/metrics/clear", { method: "POST", headers }).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
      }),
    simulateTraffic: (opts) =>
      fetch("/simulate-traffic", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(opts),
      }).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
      }),
  };
}
