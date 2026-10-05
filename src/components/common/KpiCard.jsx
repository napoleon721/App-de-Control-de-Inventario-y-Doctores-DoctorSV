import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import TiltCard from "./TiltCard";

export default function KpiCard({ label, value, tone, Icon, trend }) {
  return (
    <TiltCard className="rounded-2xl h-full">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between">
        {/* Soft background ambient gradient */}
        <div
          className="absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-10 blur-sm pointer-events-none"
          style={{ background: tone }}
        />

        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 font-sans truncate" title={label}>
            {label}
          </span>
          {Icon && (
            <span
              className="flex h-6.5 w-6.5 items-center justify-center rounded-lg shadow-2xs shrink-0"
              style={{ background: `${tone}15`, color: tone }}
            >
              <Icon size={14} />
            </span>
          )}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-1">
          <span className="font-heading text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {value}
          </span>
          {trend != null && (
            <span
              className={`flex items-center text-[10.5px] font-bold ${
                trend >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend >= 0 ? <TrendingUp size={11} className="mr-0.5" /> : <TrendingDown size={11} className="mr-0.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </TiltCard>
  );
}
