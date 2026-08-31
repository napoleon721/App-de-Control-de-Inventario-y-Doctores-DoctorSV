import React from "react";

export default function SectionCard({ icon: Icon, title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-shadow duration-200 hover:shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-xs"
            style={{
              background: "linear-gradient(135deg, #0048B5 0%, #0095FF 100%)",
            }}
          >
            <Icon size={16} />
          </span>
          <div>
            <h3 className="font-heading text-[15px] font-bold leading-tight text-slate-800">
              {title}
            </h3>
            {subtitle && <p className="text-[11.5px] text-slate-500 font-medium">{subtitle}</p>}
          </div>
        </div>
        {right && <div>{right}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
