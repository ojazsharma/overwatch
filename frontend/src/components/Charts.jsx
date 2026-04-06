import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer
} from "recharts";

export default function Charts({ data, dataKey, title }) {
    return (
        <div style={{
            background: "#111",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "20px"
        }}>
            <h3 style={{ color: "white" }}>{title}</h3>

            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
                    <CartesianGrid stroke="#333" />
                    <XAxis dataKey="time" stroke="#aaa" />
                    <YAxis stroke="#aaa" />
                    <Tooltip />
                    <Line type="monotone" dataKey={dataKey} stroke="#00ffcc" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}