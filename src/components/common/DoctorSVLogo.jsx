import React from "react";
import logoPng from "../../assets/doctorsv_logo.png";

export default function DoctorSVLogo({ className = "h-8 sm:h-9", showSubtext = true }) {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Official DoctorSV Logo Image from user */}
      <div className="flex items-center">
        <img
          src={logoPng}
          alt="DoctorSV"
          className={`${className} w-auto object-contain transition-transform duration-150 hover:scale-[1.02]`}
        />
      </div>

      {showSubtext && (
        <div className="hidden sm:flex flex-col border-l border-slate-200 pl-3">
          <span className="text-[12.5px] font-bold tracking-wider uppercase text-slate-800 font-heading leading-tight">
            Sede San Miguel
          </span>
          <span className="text-[10.5px] font-medium text-slate-400">
            Control de Espacios & Telemedicina
          </span>
        </div>
      )}
    </div>
  );
}
