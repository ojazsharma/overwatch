// backend/server.js

const express = require("express");
const cors = require("cors");
const si = require("systeminformation");
const os = require("os");
const fs = require("fs");
const path = require("path");

const app = express();

// ✅ CORS
app.use(cors());

// ✅ Log file path
const LOG_FILE = path.join(__dirname, "metrics-log.json");

// ✅ Save metrics safely
function saveMetrics(data) {
    try {
        let logs = [];

        if (fs.existsSync(LOG_FILE)) {
            const content = fs.readFileSync(LOG_FILE, "utf-8");

            if (content) {
                try {
                    logs = JSON.parse(content);
                } catch {
                    logs = [];
                }
            }
        }

        if (!Array.isArray(logs)) {
            logs = [];
        }

        logs.push(data);

        // limit to last 500 logs
        if (logs.length > 500) {
            logs = logs.slice(-500);
        }

        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    } catch (err) {
        console.error("Logging error:", err);
    }
}

// ✅ Metrics API
app.get("/api/metrics", async (req, res) => {
    try {
        const cpuData = await si.currentLoad();

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const memoryUsage = (usedMem / totalMem) * 100;

        const uptime = os.uptime();

        const processData = await si.processes();

        const topProcesses = processData.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5)
            .map(p => ({
                name: p.name,
                cpu: Number(p.cpu.toFixed(2))
            }));

        const data = {
            cpu: Number(cpuData.currentLoad.toFixed(2)),
            memory: Number(memoryUsage.toFixed(2)),
            totalMem: Number((totalMem / (1024 ** 3)).toFixed(2)),
            uptime,
            processes: topProcesses,
            timestamp: new Date().toISOString()
        };

        saveMetrics(data);

        res.json(data);

    } catch (error) {
        console.error("Error fetching metrics:", error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
});

// ✅ Logs API
app.get("/api/logs", (req, res) => {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return res.json([]);
        }

        const logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
        res.json(logs);

    } catch (err) {
        res.status(500).json({ error: "Failed to read logs" });
    }
});

// ✅ ROOT (important for testing)
app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

// ✅ START SERVER (Render-compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
