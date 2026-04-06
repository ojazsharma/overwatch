const express = require("express");
const si = require("systeminformation");
const cors = require("cors");
const os = require("os");

const app = express();

// allow frontend to connect
app.use(cors());

// API route
app.get("/metrics", async (req, res) => {
    try {
        const cpuData = await si.currentLoad();

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const memoryUsage = (usedMem / totalMem) * 100;

        const uptime = os.uptime(); // seconds

        res.json({
            cpu: cpuData.currentLoad, // ✅ real CPU %
            memory: memoryUsage,      // ✅ memory %
            totalMem: (totalMem / (1024 ** 3)).toFixed(2), // GB
            uptime: uptime
        });
    } catch (error) {
        console.error("Error fetching metrics:", error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
});

// start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});