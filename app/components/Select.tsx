"use client";

import React from "react";

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  placeholder?: string;
}

export default function Select({
  label,
  value,
  onChange,
  options,
  required = false,
  placeholder = "Selecione...",
}: SelectProps) {
  return (
    <div style={{ marginBottom: "14px" }}>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "0.95rem",
            color: "#d1d5db",
          }}
        >
          {label} {required && <span style={{ color: "#22c55e" }}>*</span>}
        </label>
      )}

      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(17, 24, 39, 0.85)",
          color: "#fff",
          fontSize: "1rem",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
