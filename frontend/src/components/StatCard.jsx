// frontend/src/components/StatCard.jsx
function StatCard({ title, value, color }) {
    return (
        <div className="bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-gray-400 text-sm">{title}</h3>
            <h2 className={`text-3xl font-bold mt-2 ${color || "text-white"}`}>
                {value}
            </h2>
        </div>
    );
}

export default StatCard;