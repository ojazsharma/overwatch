import StatCard from "../components/StatCard";
import { useState, useEffect } from "react";

function Dashboard() {
    const [CPU, setCPU] = useState("0%");
    const [Memory, setMemory] = useState("0%");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("http://localhost:5000/metrics");
                const data = await res.json();

                setCPU(data.cpu.toFixed(2) + "%");
                setMemory(data.memory.toFixed(2) + "%");
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        const interval = setInterval(fetchData, 2000); // runs every 2 sec

        fetchData(); // run once immediately

        return () => clearInterval(interval); // cleanup
    }, []);

    return (
        <div style={{ padding: "20px" }}>
            <h1>Overwatch Dashboard</h1>

            <div style={{ display: "flex", gap: "20px" }}>
                <StatCard title="CPU Usage" value={CPU} />
                <StatCard title="Memory Usage" value={Memory} />
            </div>
        </div>
    );
}

export default Dashboard;