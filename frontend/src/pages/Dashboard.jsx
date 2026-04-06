import StatCard from "../components/StatCard";
import { useState, useEffect } from "react";

function Dashboard() {
    const [CPU, setCPU] = useState("0%");
    const [Memory, setMemory] = useState("0%");
    const [totalMem, setTotalMem] = useState("0");
    const [uptime, setUptime] = useState("0");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("http://localhost:5000/metrics");
                const data = await res.json();

                setCPU(data.cpu.toFixed(2) + "%");
                setMemory(data.memory.toFixed(2) + "%");
                setTotalMem(data.totalMem + " GB");
                setUptime(formatUptime(data.uptime));
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        const interval = setInterval(fetchData, 2000);

        const formatUptime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        };

        fetchData();

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">
                Overwatch Dashboard
            </h1>

            {/* 🔲 Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="CPU Usage" value={CPU} />
                <StatCard title="Memory Usage" value={Memory} />
                <StatCard title="Total Memory" value={totalMem} />
                <StatCard title="Up Time" value={uptime} />
            </div>

            {/* 📊 Graph Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold">CPU Graph</h2>
                    <p className="text-gray-400 mt-2">[Graph Coming Soon]</p>
                </div>

                <div className="bg-gray-800 rounded-xl p-4">
                    <h2 className="text-lg font-semibold">RAM Graph</h2>
                    <p className="text-gray-400 mt-2">[Graph Coming Soon]</p>
                </div>
            </div>

            {/* 📋 Process Table */}
            <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <h2 className="text-lg font-semibold mb-4">Processes</h2>

                <div className="flex justify-between text-gray-400 border-b border-gray-700 pb-2">
                    <span>Process</span>
                    <span>CPU %</span>
                    <span>RAM %</span>
                </div>

                <div className="flex justify-between mt-2">
                    <span>chrome.exe</span>
                    <span>25%</span>
                    <span>300MB</span>
                </div>

                <div className="flex justify-between mt-2">
                    <span>node.exe</span>
                    <span>10%</span>
                    <span>120MB</span>
                </div>
            </div>

            {/* ⚙️ System Info */}
            <div className="bg-gray-800 rounded-xl p-4">
                <h2 className="text-lg font-semibold mb-2">System Info</h2>
                <p className="text-gray-400">OS: Windows</p>
                <p className="text-gray-400">Arch: x64</p>
                <p className="text-gray-400">Platform: win32</p>
            </div>
        </div>
    );
}

export default Dashboard;