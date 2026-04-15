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
    console.log(historyData);

    const ALERT_COOLDOWN = 10000;

    // ✅ helpers FIRST
    const getStdDev = (arr, key, mean) => {
        const variance =
            arr.reduce((sum, item) => sum + Math.pow(item[key] - mean, 2), 0) /
            arr.length;
        return Math.sqrt(variance);
    };

    const historyCpu = historyData.map(d => d.cpu);

    const baselineMean =
        historyCpu.reduce((a, b) => a + b, 0) / historyCpu.length || 0;

    const baselineStd =
        Math.sqrt(
            historyCpu.reduce((a, b) => a + Math.pow(b - baselineMean, 2), 0) /
            historyCpu.length
        ) || 1;

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

        // adaptive threshold
        const dynamicThreshold = Math.max(stdDev * 0.8, 1);

        return slope > dynamicThreshold && currentValue > 60;
    };

    // ✅ detection values
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

    const severity =
        confidence >= 5 ? "high" :
            confidence >= 3 ? "medium" :
                "low";

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

    const now = Date.now();

    const anomalyDetected =
        (cpuAnomaly || ramAnomaly) &&
        (now - lastAlertTime > ALERT_COOLDOWN);

    // ✅ anomaly effect


    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/api/metrics`)
            .then(res => res.json())
            .then(data => setHistoryData(data))
            .catch(err => console.error("Logs fetch error:", err));
    }, []);



    useEffect(() => {
        const now = Date.now();

        if ((cpuAnomaly || ramAnomaly) && (now - lastAlertTime > ALERT_COOLDOWN)) {
            setLastAlertTime(now);

            const explanation = spikeProcess
                ? `${spikeProcess.name} increased by ${spikeProcess.diff.toFixed(2)}%`
                : "No dominant process found";

            const title = spikeProcess
                ? `CPU Spike: ${spikeProcess.name}`
                : "System Anomaly";

            setAlertHistory((prev) => [
                {
                    type: "anomaly",
                    time: new Date().toLocaleTimeString(),
                    timestamp: Date.now(),
                    prevProcesses: historyData[historyData.length - 2]?.processes || [],
                    processes,
                    spikeProcess,
                    explanation,   // 🔥 ADD THIS
                    confidence,     // 🔥 ALSO ADD THIS
                    severity,
                    title
                },
                ...prev,
            ].slice(0, 10));
        }
    }, [cpuAnomaly,
        ramAnomaly,
        lastAlertTime,
        processes,
        spikeProcess,
        confidence,
        historyData]);

    // ✅ prediction effect (shared cooldown)
    useEffect(() => {
        const now = Date.now();

        if (predictionAlert && (now - lastAlertTime > ALERT_COOLDOWN)) {
            setLastAlertTime(now);

            setAlertHistory((prev) => [
                {
                    type: "prediction",
                    time: new Date().toLocaleTimeString(),
                    timestamp: Date.now(),
                    processes: processes
                },
                ...prev,
            ].slice(0, 10));
        }
    }, [predictionAlert, lastAlertTime, processes]);

    // ✅ data fetching
    useEffect(() => {
        const formatUptime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        };

        const fetchData = async () => {
            try {
                const res = await fetch("http://localhost:5000/metrics");
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

    // ✅ health score
    const latest = data[data.length - 1];

    let healthScore = 100;

    if (latest) {
        const avgUsage = (latest.cpu + latest.ram) / 2;
        healthScore = Math.max(0, 100 - avgUsage);
    }

    let healthColor = "text-green-400";
    if (healthScore < 70) healthColor = "text-yellow-400";
    if (healthScore < 40) healthColor = "text-red-500";

    const selectedDataPoint = selectedTimestamp
        ? data.find((d) => Math.abs(d.timestamp - selectedTimestamp) < 2000)
        : null;

    const selectedAlert = alertHistory.find(
        (a) => a.timestamp === selectedTimestamp
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">
                Overwatch Dashboard
            </h1>

            {strongSignal && (
                <div className="bg-blue-500 text-white p-4 rounded-lg mb-6">
                    ⚡ Sudden System Spike Detected (CPU / RAM)
                </div>
            )}

            {predictionAlert && !strongSignal && (
                <div className="bg-yellow-400 text-black p-4 rounded-lg mb-6">
                    ⚠️ System trend increasing (possible upcoming spike)
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <StatCard title="CPU Usage" value={CPU} />
                <StatCard title="Memory Usage" value={Memory} />
                <StatCard title="Total Memory" value={totalMem} />
                <StatCard title="Up Time" value={uptime} />
                <StatCard
                    title="Health Score"
                    value={healthScore.toFixed(0)}
                    color={healthColor}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold mb-2">CPU Usage</h2>
                    <Charts
                        data={data}
                        dataKey="cpu"
                        anomaly={cpuAnomaly}
                        selectedTimestamp={selectedTimestamp}
                    />
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold mb-2">RAM Usage</h2>
                    <Charts data={data} selectedTimestamp={selectedTimestamp} dataKey="ram" anomaly={ramAnomaly} />
                </div>

                <div className="bg-gray-800 rounded-xl p-4 mt-6">
                    <h2 className="text-lg font-semibold mb-4">Top Processes</h2>

                    {processes.length === 0 ? (
                        <p className="text-gray-400">No process data</p>
                    ) : (
                        processes.map((proc, index) => (
                            <div
                                key={index}
                                className="flex justify-between border-b border-gray-700 py-2"
                            >
                                <span>{proc.name}</span>
                                <span>{proc.cpu}%</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Alert History */}
            <div className="bg-gray-800 rounded-xl p-4 mt-6">
                <h2 className="text-lg font-semibold mb-4">Alert History</h2>

                {alertHistory.length === 0 && (
                    <p className="text-gray-400">No alerts yet</p>
                )}

                {alertHistory.map((alert, index) => (
                    <div key={index}
                        onClick={() => setSelectedTimestamp(alert.timestamp)}
                        style={{ cursor: "pointer" }}
                    >
                        {alert.title} - {alert.time}
                    </div>
                ))}

                {selectedAlert && (
                    <div className="mt-4">

                        <h3 className="font-semibold mb-2">Before Spike</h3>
                        {selectedAlert.prevProcesses?.map((p, i) => (
                            <div
                                key={i}
                                className="flex justify-between border-b border-gray-700 py-1"
                            >
                                <span className="truncate max-w-[200px]">{p.name}</span>
                                <span>{p.cpu}%</span>
                            </div>
                        ))}

                        <h3 className="font-semibold mt-4 mb-2">During Spike</h3>
                        {selectedAlert.processes?.map((p, i) => (
                            <div
                                key={i}
                                className="flex justify-between border-b border-gray-700 py-1"
                            >
                                <span className="truncate max-w-[200px]">
                                    {p.name}
                                    {selectedAlert.spikeProcess?.name === p.name && " 🔴"}
                                </span>
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
