const express = require("express");
const si = require("systeminformation");
const cors = require("cors");

const app = express();

// allow frontend to connect
app.use(cors());

// API route
app.get("/metrics", async (req, res) => {
    const cpu = await si.currentLoad();
    const mem = await si.mem();

    res.json({
        cpu: cpu.currentLoad,
        memory: (mem.used / mem.total) * 100
    });
});

// start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});