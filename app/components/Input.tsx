"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col w-full mb-4">
      {label && (
        <label className="text-gray-200 mb-1 text-sm font-medium">
          {label}
        </label>
      )}

      <input
        {...props}
        className={`
          w-full px-4 py-3 rounded-xl border
          bg-[#111827] text-white
          border-white/10 placeholder-white/40
          focus:outline-none focus:ring-2 focus:ring-emerald-500
          transition
          ${props.className ?? ""}
        `}
      />

      {error && (
        <span className="text-red-400 text-xs mt-1">{error}</span>
      )}
    </div>
  );
}
