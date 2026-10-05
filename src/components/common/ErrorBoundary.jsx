import React from "react";
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const errorMsg = String(error?.message || error || "");
    const isChunk =
      errorMsg.includes("dynamically imported module") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError";

    return { hasError: true, error, isChunkError: isChunk };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DoctorSV Error Boundary atrapó un error:", error, errorInfo);
    this.setState({ errorInfo });

    const errorMsg = String(error?.message || error || "");
    const isChunk =
      errorMsg.includes("dynamically imported module") ||
      errorMsg.includes("Loading chunk") ||
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError";

    if (isChunk) {
      const lastChunkReload = Number(sessionStorage.getItem("doctorsv_chunk_boundary_reload") || "0");
      const now = Date.now();
      // Si no se ha recargado en los últimos 12 segundos, recargar de inmediato
      if (now - lastChunkReload > 12000) {
        sessionStorage.setItem("doctorsv_chunk_boundary_reload", String(now));
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }
  }

  handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false });
  };

  handleReload = () => {
    // Forzar recarga limpia para descargar la versión más reciente del servidor
    window.location.href = window.location.origin + window.location.pathname + "?refresh=" + Date.now();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-100 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0048B5] shadow-sm">
                <RefreshCw size={32} className="animate-spin" />
              </div>

              <div>
                <h2 className="text-xl font-heading font-extrabold text-slate-900">
                  Nueva versión de DoctorSV
                </h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Se ha publicado una actualización de la plataforma. Estamos sincronizando los componentes más recientes para ti.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold text-white bg-[#0048B5] hover:bg-[#003487] shadow-md hover:shadow-lg transition-all"
                >
                  <RefreshCw size={16} />
                  <span>Actualizar Ahora</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900">
                Hubo un detalle temporal en la vista
              </h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                El sistema aisló el inconveniente para proteger tu sesión y tus datos en tiempo real.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-left overflow-x-auto text-[11px] font-mono text-slate-700 max-h-32">
                {String(this.state.error?.message || this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleRecover}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0048B5] hover:bg-[#003487] shadow-sm transition-all"
              >
                <ShieldCheck size={16} />
                <span>Continuar Trabajando</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                <RefreshCw size={16} />
                <span>Recargar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
