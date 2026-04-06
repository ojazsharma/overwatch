import { useEffect, useState } from "react";
import Charts from "./components/Charts";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5000/metrics")
        .then(res => res.json())
        .then(res => {
          console.log("API DATA:", res); // debug (you can remove later)

          const newEntry = {
            time: new Date().toLocaleTimeString(),
            cpu: Number(res.cpu.toFixed(2)),      // ✅ fixed
            ram: Number(res.memory.toFixed(2))    // ✅ fixed
          };

          setData(prev => {
            const updated = [...prev, newEntry];
            return updated.slice(-15); // keep last 15 points
          });
        })
        .catch(err => console.log("Fetch error:", err));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const latest = data.length ? data[data.length - 1] : null;

  const showAlert =
    latest && (latest.cpu > 80 || latest.ram > 80);

  return (
    <div style={{
      background: "#0a0a0a",
      minHeight: "100vh",
      padding: "20px",
      color: "white"
    }}>
      <h1>🖥️ Overwatch Dashboard</h1>

      {showAlert && (
        <div style={{
          background: "#ff4d4d",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          ⚠️ {latest?.cpu > 80 ? "High CPU Usage" : "High Memory Usage"}
        </div>
      )}

      {/* 🔥 Top Stats */}
      {data.length > 0 && (
        <div style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px"
        }}>
          <div style={{
            background: latest?.cpu > 80 ? "#2a0000" : "#111",
            padding: "20px",
            borderRadius: "12px",
            flex: 1
          }}>
            <h3>CPU</h3>
            <h2>{data[data.length - 1].cpu}%</h2>
          </div>

          <div style={{
            background: latest?.ram > 80 ? "#2a0000" : "#111",
            padding: "20px",
            borderRadius: "12px",
            flex: 1
          }}>
            <h3>RAM</h3>
            <h2>{data[data.length - 1].ram}%</h2>
          </div>
        </div>
      )}

      {/* 🔥 Charts Grid */}
      <div style={{
        display: "flex",
        gap: "20px"
      }}>
        <div style={{ flex: 1 }}>
          <Charts data={data} dataKey="cpu" title="CPU Usage (%)" />
        </div>

        <div style={{ flex: 1 }}>
          <Charts data={data} dataKey="ram" title="RAM Usage (%)" />
        </div>
      </div>
    </div>
  );
}

export default App;