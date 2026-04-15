import StatCard from "../components/StatCard";
import Charts from "../components/Charts";
import { useState, useEffect } from "react";

function Dashboard() {
    const API_BASE = "https://overwatch-backend-p3go.onrender.com";

    const [CPU, setCPU] = useState("0%");
    const [Memory, setMemory] = useState("0%");
    const [data, setData] = useState([]);
    const [totalMem, setTotalMem] = useState("0");
    const [uptime, setUptime] = useState("0");
    const [processes, setProcesses] = useState([]);

    const [historyData, setHistoryData] = useState([]);
    const [alertHistory, setAlertHistory] = useState([]);
    const [selectedTimestamp, setSelectedTimestamp] = useState(null);
    const [lastAlertTime, setLastAlertTime] = useState(0);

    const ALERT_COOLDOWN = 10000;

    // ✅ SAFE HISTORY HANDLING
    const safeHistory = Array.isArray(historyData) ? historyData : [];

    const historyCpu = safeHistory.map(d => d.cpu || 0);

    const baselineMean =
        historyCpu.reduce((a, b) => a + b, 0) / historyCpu.length || 0;

    const baselineStd =
        Math.sqrt(
            historyCpu.reduce((a, b) => a + Math.pow(b - baselineMean, 2), 0) /
            historyCpu.length
        ) || 1;

    const getStdDev = (arr, key, mean) => {
        if (!arr.length) return 0;
        return Math.sqrt(
            arr.reduce((sum, item) => sum + Math.pow(item[key] - mean, 2), 0) /
            arr.length
        );
    };

    const detectAnomaly = (key) => {
        if (data.length < 7) return false;

        const recent = data.slice(-7, -1);
        const current = data[data.length - 1]?.[key];

        if (current === undefined) return false;

        const avg =
            recent.reduce((sum, item) => sum + item[key], 0) / recent.length;

        const stdDev = getStdDev(recent, key, avg);
        if (stdDev === 0) return false;

        const zScore = (current - baselineMean) / baselineStd;

        return zScore > 2 && current < 90;
    };

    const detectTrend = (data, key) => {
        if (data.length < 4) return false;

        const last4 = data.slice(-4);
        const slope = (last4[3][key] - last4[0][key]) / 4;

        const recent = data.slice(-7, -1);
        const avg =
            recent.reduce((sum, item) => sum + item[key], 0) / recent.length;

        const stdDev = getStdDev(recent, key, avg);
        const threshold = Math.max(stdDev * 0.8, 1);

        return slope > threshold && last4[3][key] > 60;
    };

    const cpuAnomaly = detectAnomaly("cpu");
    const ramAnomaly = detectAnomaly("ram");

    const cpuTrend = detectTrend(data, "cpu");
    const ramTrend = detectTrend(data, "ram");

    let confidence = 0;
    if (cpuAnomaly) confidence += 2;
    if (ramAnomaly) confidence += 2;
    if (cpuTrend) confidence += 1;
    if (ramTrend) confidence += 1;

    const strongSignal = confidence >= 3;
    const predictionAlert = cpuTrend || ramTrend;

    const severity =
        confidence >= 5 ? "high" :
        confidence >= 3 ? "medium" : "low";

    // ✅ PROCESS SPIKE DETECTION
    let spikeProcess = null;

    if (safeHistory.length >= 2) {
        const prev = safeHistory[safeHistory.length - 2];
        const curr = safeHistory[safeHistory.length - 1];

        (curr?.processes || []).forEach(proc => {
            const prevProc = (prev?.processes || []).find(p => p.name === proc.name);

            const diff = (parseFloat(proc.cpu) || 0) - (parseFloat(prevProc?.cpu) || 0);

            if (!spikeProcess || diff > spikeProcess.diff) {
                spikeProcess = { ...proc, diff };
            }
        });
    }

    // ✅ FETCH HISTORY
    useEffect(() => {
        fetch(`${API_BASE}/api/logs`)
            .then(res => res.json())
            .then(data => setHistoryData(Array.isArray(data) ? data : []))
            .catch(() => setHistoryData([]));
    }, []);

    // ✅ LIVE DATA FETCH
    useEffect(() => {
        const formatUptime = (sec) => {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return `${h}h ${m}m`;
        };

        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/metrics`);
                const d = await res.json();

                setCPU(d.cpu.toFixed(2) + "%");
                setMemory(d.memory.toFixed(2) + "%");

                const entry = {
                    time: new Date().toLocaleTimeString(),
                    timestamp: Date.now(),
                    cpu: +d.cpu.toFixed(2),
                    ram: +d.memory.toFixed(2)
                };

                setData(prev => [...prev, entry].slice(-15));

                setTotalMem(d.totalMem + " GB");
                setUptime(formatUptime(d.uptime));
                setProcesses(d.processes || []);
            } catch {}
        };

        const interval = setInterval(fetchData, 2000);
        fetchData();
        return () => clearInterval(interval);
    }, []);

    // ✅ ALERT SYSTEM
    useEffect(() => {
        const now = Date.now();

        if ((cpuAnomaly || ramAnomaly) && (now - lastAlertTime > ALERT_COOLDOWN)) {
            setLastAlertTime(now);

            setAlertHistory(prev => [{
                type: "anomaly",
                time: new Date().toLocaleTimeString(),
                timestamp: now,
                processes,
                spikeProcess,
                severity,
                confidence,
                title: spikeProcess
                    ? `CPU Spike: ${spikeProcess.name}`
                    : "System Anomaly"
            }, ...prev].slice(0, 10));
        }
    }, [cpuAnomaly, ramAnomaly, processes]);

    // ✅ HEALTH SCORE
    const latest = data[data.length - 1];
    let healthScore = 100;

    if (latest) {
        const avg = (latest.cpu + latest.ram) / 2;
        healthScore = Math.max(0, 100 - avg);
    }

    const selectedAlert = alertHistory.find(a => a.timestamp === selectedTimestamp);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">Overwatch Dashboard</h1>

            {strongSignal && (
                <div className="bg-blue-500 p-4 mb-4 rounded">
                    ⚡ Sudden System Spike Detected
                </div>
            )}

            {predictionAlert && !strongSignal && (
                <div className="bg-yellow-400 text-black p-4 mb-4 rounded">
                    ⚠️ Trend Increasing
                </div>
            )}

            <div className="grid md:grid-cols-5 gap-4 mb-6">
                <StatCard title="CPU" value={CPU} />
                <StatCard title="Memory" value={Memory} />
                <StatCard title="Total Memory" value={totalMem} />
                <StatCard title="Uptime" value={uptime} />
                <StatCard title="Health" value={healthScore.toFixed(0)} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <Charts data={data} dataKey="cpu" anomaly={cpuAnomaly} />
                <Charts data={data} dataKey="ram" anomaly={ramAnomaly} />
            </div>

            <div className="bg-gray-800 p-4 mt-6 rounded">
                <h2>Top Processes</h2>
                {processes.map((p, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{p.name}</span>
                        <span>{p.cpu}%</span>
                    </div>
                ))}
            </div>

            <div className="bg-gray-800 p-4 mt-6 rounded">
                <h2>Alert History</h2>
                {alertHistory.map((a, i) => (
                    <div key={i} onClick={() => setSelectedTimestamp(a.timestamp)}>
                        {a.title} - {a.time}
                    </div>
                ))}

                {selectedAlert && (
                    <div className="mt-4">
                        <h3>Details</h3>
                        {selectedAlert.processes?.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{p.name}</span>
                                <span>{p.cpu}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
