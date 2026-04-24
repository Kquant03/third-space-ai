"use client";

import { useState } from "react";

export default function CurateLogin() {
  const [token, setToken] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const res = await fetch("/api/curate-login", {
      method: "POST",
      body: JSON.stringify({ token }),
      headers: { "content-type": "application/json" },
    });
    if (res.ok) {
      window.location.href = "/curate";
    } else {
      setErr("rejected");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      color: "#ddd",
      fontFamily: "system-ui, sans-serif",
      padding: "2rem",
    }}>
      <div style={{ maxWidth: 360, width: "100%" }}>
        <h1 style={{ fontFamily: "serif", fontStyle: "italic", fontSize: "2rem", marginBottom: "1.5rem" }}>
          curate
        </h1>
        <input
          type="password"
          autoComplete="current-password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="token"
          style={{
            width: "100%",
            padding: "0.85rem",
            fontSize: "1rem",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 6,
            color: "#ddd",
            outline: "none",
          }}
        />
        <button
          onClick={submit}
          style={{
            marginTop: "1rem",
            width: "100%",
            padding: "0.85rem",
            background: "#7fc1b0",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 6,
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          enter
        </button>
        {err && (
          <div style={{ marginTop: "0.75rem", color: "#c7291b", fontSize: "0.9rem" }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
