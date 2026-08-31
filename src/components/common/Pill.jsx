import React from "react";
import { ESTADOS } from "../../constants/tokens";

export default function Pill({ estado }) {
  const e = ESTADOS[estado] || {
    label: estado,
    color: "#64748B",
    soft: "#F1F5F9",
    textDark: "#334155",
    border: "#CBD5E1",
    icon: () => null
  };
  const Icon = e.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border shadow-2xs"
      style={{
        background: e.soft,
        color: e.textDark || e.color,
        borderColor: e.border || `${e.color}40`,
      }}
    >
      <Icon size={11} className="shrink-0" />
      <span>{e.label}</span>
    </span>
  );
}
