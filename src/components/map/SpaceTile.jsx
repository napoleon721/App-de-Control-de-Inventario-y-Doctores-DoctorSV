import React from "react";
import { Laptop } from "lucide-react";
import { ESTADOS } from "../../constants/tokens";

export default function SpaceTile({ s, index, onClick }) {
  const e = ESTADOS[s.estado] || {
    label: s.estado,
    color: "#64748B",
    soft: "#F1F5F9",
    textDark: "#334155",
    border: "#CBD5E1",
    icon: () => null
  };
  const Icon = e.icon;

  return (
    <button
      onClick={() => onClick(s)}
      style={{
        animation: "riseIn .35s ease both",
        animationDelay: `${Math.min(index * 4, 300)}ms`,
        borderColor: e.border || `${e.color}50`,
        background: `linear-gradient(165deg, ${e.soft} 0%, #ffffff 100%)`,
      }}
      className="group relative flex h-[78px] w-full flex-col justify-between rounded-xl border p-2 text-left shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:scale-[1.05] hover:shadow-md hover:z-10 focus:outline-none focus:ring-2 focus:ring-[#0095FF]/60 cursor-pointer"
    >
      {/* Top row: Cubicle number & status icon */}
      <div className="flex items-center justify-between">
        <span className="font-heading text-xs sm:text-[13px] font-extrabold leading-none text-slate-800">
          #{s.id}
        </span>
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: `${e.color}20`, color: e.color }}
        >
          <Icon size={12} />
        </span>
      </div>

      {/* Middle: Hardware tag */}
      {s.marca ? (
        <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-600">
          <Laptop size={10} className="text-[#0048B5]" /> {s.marca}
        </div>
      ) : (
        <div className="text-[9.5px] font-medium text-slate-400">— — —</div>
      )}

      {/* Bottom: Doctor or Status name */}
      <div
        className="truncate text-[9.5px] font-semibold"
        style={{ color: s.doctor ? "#0048B5" : (e.textDark || e.color) }}
        title={s.doctor || e.label}
      >
        {s.doctor ? s.doctor.replace("Dr. ", "").replace("Dra. ", "") : e.label}
      </div>

      {/* Hover ring effect */}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-offset-1 transition-opacity duration-150 group-hover:opacity-100"
        style={{ ringColor: e.color }}
      />
    </button>
  );
}
