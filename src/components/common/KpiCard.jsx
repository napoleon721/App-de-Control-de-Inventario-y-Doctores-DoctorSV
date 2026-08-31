import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import TiltCard from "./TiltCard";

export default function KpiCard({ label, value, tone, Icon, trend }) {
  return (
    <TiltCard className="rounded-2xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200">
        {/* Soft background ambient gradient */}
        <div
          className="absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-10 blur-sm pointer-events-none"
          style={{ background: tone }}
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans truncate pr-1">
            {label}
          </span>
          {Icon && (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg shadow-2xs"
              style={{ background: `${tone}15`, color: tone }}
            >
              <Icon size={15} />
            </span>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </span>
          {trend != null && (
            <span
              className={`flex items-center text-[11px] font-bold ${
                trend >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {trend >= 0 ? <TrendingUp size={12} className="mr-0.5" /> : <TrendingDown size={12} className="mr-0.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </TiltCard>
  );
}
