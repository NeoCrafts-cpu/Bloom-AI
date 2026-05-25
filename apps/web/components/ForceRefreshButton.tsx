"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ForceRefreshButton() {
  return (
    <button
      onClick={() => fetch(`${API}/api/newsletters/trigger`, { method: "POST" })}
      className="orange-btn-outline text-sm px-4 py-2 rounded-lg"
    >
      Force Refresh
    </button>
  );
}
