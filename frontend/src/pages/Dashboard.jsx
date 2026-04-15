import StatCard from "../components/StatCard";
import Charts from "../components/Charts";
import { useState, useEffect } from "react";

function Dashboard() {
    const [CPU, setCPU] = useState("0%");
    const [Memory, setMemory] = useState("0%");
    const [data, setData] = useState([]);
    const [totalMem, setTotalMem] = useState("0");
    const [uptime, setUptime] = useState("0");
    const [lastAlertTime, setLastAlertTime] = useState(0);
    const [alertHistory, setAlertHistory] = useState([]);
    const [selectedTimestamp, setSelectedTimestamp] = useState(null);
    const [processes, setProcesses] = useState([]);
    const [historyData, setHistoryData] = useState([]);

    const API_BASE = "https://overwatch-backend-p3go.onrender.com";

    const ALERT_COOLDOWN = 10000;

    // ✅ SAFE history CPU extraction
    const historyCpu = Array.isArray(historyData)
        ? historyData.map(d => d.cpu || 0)
        : [];

    const baselineMean =
        historyCpu.reduce((a, b) => a + b, 0) / historyCpu.length || 0;

    const baselineStd =
        Math.sqrt(
            historyCpu.reduce((a, b) => a + Math.pow(b - baselineMean, 2), 0) /
            historyCpu.length
        ) || 1;

    const getStdDev = (arr, key, mean) => {
        if (!arr.length) return 0;
        const variance =
            arr.reduce((sum, item) => sum + Math.pow(item[key] - mean, 2), 0) /
            arr.length;
        return Math.sqrt(variance);
    };

    const detectAnomaly = (key) => {
        if (data.length < 7) return false;

        const recent = data.slice(-7, -1);
        const current = data[data.length - 1][key];

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

        const slope =
            (last4[3][key] - last4[0][key]) / 4;

        const currentValue = last4[3][key];

        const recent = data.slice(-7, -1);

        const avg =
            recent.reduce((sum, item) => sum + item[key], 0) / recent.length;

        const stdDev = getStdDev(recent, key, avg);

        const dynamicThreshold = Math.max(stdDev * 0.8, 1);

        return slope > dynamicThreshold && currentValue > 60;
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

    let spikeProcess = null;

    if (historyData.length >= 2) {
        const prevData = historyData[historyData.length - 2];
        const currentData = historyData[historyData.length - 1];

        const prevProcesses = prevData?.processes || [];
        const currentProcesses = currentData?.processes || [];

        currentProcesses.forEach(proc => {
            const prev = prevProcesses.find(p => p.name === proc.name);

            const prevCpu = prev ? parseFloat(prev.cpu) : 0;
            const currCpu = parseFloat(proc.cpu);

            const diff = currCpu - prevCpu;

            if (!spikeProcess || diff > spikeProcess.diff) {
                spikeProcess = {
                    name: proc.name,
                    diff: diff,
                    cpu: currCpu
                };
            }
        });
    }

    // ✅ FETCH HISTORY (logs)
    useEffect(() => {
        fetch(`${API_BASE}/api/logs`)
            .then(res => res.json())
            .then(data => setHistoryData(Array.isArray(data) ? data : []))
            .catch(err => console.error("Logs fetch error:", err));
    }, []);

    // ✅ FETCH LIVE DATA
    useEffect(() => {
        const formatUptime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        };

        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/metrics`);
                const data = await res.json();

                setCPU(data.cpu.toFixed(2) + "%");
                setMemory(data.memory.toFixed(2) + "%");

                const newEntry = {
                    time: new Date().toLocaleTimeString(),
                    timestamp: Date.now(),
                    cpu: Number(data.cpu.toFixed(2)),
                    ram: Number(data.memory.toFixed(2)),
                };

                setData((prev) => [...prev, newEntry].slice(-15));

                setTotalMem(data.totalMem + " GB");
                setUptime(formatUptime(data.uptime));
                setProcesses(data.processes || []);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        const interval = setInterval(fetchData, 2000);
        fetchData();

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">
                Overwatch Dashboard
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <StatCard title="CPU Usage" value={CPU} />
                <StatCard title="Memory Usage" value={Memory} />
                <StatCard title="Total Memory" value={totalMem} />
                <StatCard title="Up Time" value={uptime} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold mb-2">CPU Usage</h2>
                    <Charts data={data} dataKey="cpu" />
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold mb-2">RAM Usage</h2>
                    <Charts data={data} dataKey="ram" />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
```
