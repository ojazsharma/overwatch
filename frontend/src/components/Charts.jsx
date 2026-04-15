import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";

export default function Charts({ data, dataKey, title, anomaly, selectedTimestamp }) {
    const selectedPoint = selectedTimestamp
        ? data.find((d) => Math.abs(d.timestamp - selectedTimestamp) < 2000)
        : null;

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
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke="#00ffcc"
                        dot={(props) => {
                            const { cx, cy, index } = props;

                            // highlight last point if anomaly
                            if (index === data.length - 1 && anomaly) {
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={7}
                                        fill="red"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                );
                            }

                            return <circle cx={cx} cy={cy} r={3} fill="#00ffcc" />;
                        }}
                    />

                    {anomaly && data.length > 0 && (
                        <ReferenceLine
                            x={data[data.length - 1].time}
                            stroke="red"
                            strokeDasharray="3 3"
                        />
                    )}

                    {selectedPoint && (
                        <ReferenceLine
                            x={selectedPoint.time}
                            stroke="blue"
                            strokeWidth={2}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}