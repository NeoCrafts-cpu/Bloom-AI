"use client";

const API = "";

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
