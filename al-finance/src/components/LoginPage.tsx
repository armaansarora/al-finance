"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        setError("Wrong password — try again");
      }
    } catch {
      setError("Connection error — check your internet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F9FAFB" }}>
      <div className="w-full max-w-sm animate-fade">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-white font-extrabold text-lg"
            style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
          >
            A&L
          </div>
          <h1 className="font-sans text-2xl font-extrabold text-gray-900">Welcome Back</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your household password</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Household password"
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-base font-medium text-gray-900 placeholder-gray-400 mb-4"
            style={{ fontSize: "16px" /* prevents iOS zoom */ }}
          />

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all"
            style={{
              background: loading || !password ? "#9CA3AF" : "#2563EB",
              cursor: loading || !password ? "default" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Enter"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Both Armaan and Layla share this password
        </p>
      </div>
    </div>
  );
}
