// backend/server.js
const express = require("express");
const si = require("systeminformation");
const cors = require("cors");
const os = require("os");
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "metrics-log.json");


const app = express();

// allow frontend to connect
app.use(cors());


function saveMetrics(data) {
    try {
        let logs = [];

        // STEP 1: read existing file safely
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

        // STEP 2: ensure array
        if (!Array.isArray(logs)) {
            logs = [];
        }

        // STEP 3: push new data
        logs.push(data);

        // STEP 4: limit size
        if (logs.length > 500) {
            logs = logs.slice(-500);
        }

        // STEP 5: write back
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    } catch (err) {
        console.error("Logging error:", err);
    }
}

// API route
app.get("/metrics", async (req, res) => {
    try {
        const cpuData = await si.currentLoad();

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const memoryUsage = (usedMem / totalMem) * 100;

        const uptime = os.uptime(); // seconds

        const processData = await si.processes();

        const topProcesses = processData.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5)
            .map(p => ({
                name: p.name,
                cpu: p.cpu.toFixed(2)
            }));

        const data = {
            cpu: cpuData.currentLoad,
            memory: memoryUsage,
            totalMem: (totalMem / (1024 ** 3)).toFixed(2),
            uptime: uptime,
            processes: topProcesses,
        };

        // 🔥 THIS LINE WAS MISSING
        saveMetrics(data);

        res.json(data);


    } catch (error) {
        console.error("Error fetching metrics:", error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
});


app.get("/logs", (req, res) => {
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

// start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});