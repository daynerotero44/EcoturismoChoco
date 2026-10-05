import { useState } from "react";
import { type User } from "./auth";
import { login, register } from "./auth";

type Tab = "login" | "register";

export default function LoginModal({
  onClose,
  onAuth,
}: {
  onClose: () => void;
  onAuth: (user: User) => void;
}) {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"tourist" | "admin">("tourist");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const result =
      tab === "login"
        ? await login(email, password)
        : await register(name, email, password, role);

    setLoading(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      onAuth(result.user);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(7,14,6,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: "#0f1a0d", borderColor: "#1f3320", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b" style={{ borderColor: "#1f3320" }}>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "#7aab6e" }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2ecc71, #14b8a6)" }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                Chocó<span style={{ color: "#2ecc71" }}>Bio</span>
              </h2>
              <p className="text-xs" style={{ color: "#7aab6e" }}>Sistema de reservas ecoturísticas</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 gap-1" style={{ background: "#070e06" }}>
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t ? "rgba(46,204,113,0.15)" : "transparent",
                  color: tab === t ? "#2ecc71" : "#7aab6e",
                  border: tab === t ? "1px solid rgba(46,204,113,0.3)" : "1px solid transparent",
                }}>
                {t === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: "#7aab6e" }}>Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Ana Mosquera"
                required
                className="w-full rounded-xl px-4 py-3 border text-sm outline-none transition-all focus:border-green-400/50"
                style={{ background: "#070e06", borderColor: "#1f3320", color: "#e8f5e2" }} />
            </div>
          )}

          <div>
            <label className="block text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: "#7aab6e" }}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              className="w-full rounded-xl px-4 py-3 border text-sm outline-none transition-all focus:border-green-400/50"
              style={{ background: "#070e06", borderColor: "#1f3320", color: "#e8f5e2" }} />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: "#7aab6e" }}>Contraseña</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full rounded-xl px-4 py-3 pr-12 border text-sm outline-none transition-all focus:border-green-400/50"
                style={{ background: "#070e06", borderColor: "#1f3320", color: "#e8f5e2" }} />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "#7aab6e" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPw
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                </svg>
              </button>
            </div>
          </div>

          {tab === "register" && (
            <div>
              <label className="block text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: "#7aab6e" }}>Tipo de cuenta</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { val: "tourist", label: "🌿 Turista", desc: "Reservar experiencias" },
                  { val: "admin", label: "⚙️ Administrador", desc: "Gestionar operaciones" },
                ] as const).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setRole(opt.val)}
                    className="rounded-xl px-4 py-3 border text-left transition-all"
                    style={{
                      background: role === opt.val ? "rgba(46,204,113,0.1)" : "#070e06",
                      borderColor: role === opt.val ? "rgba(46,204,113,0.4)" : "#1f3320",
                    }}>
                    <div className="text-sm font-semibold" style={{ color: role === opt.val ? "#2ecc71" : "#e8f5e2" }}>{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#4a6a44" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm border" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02] active:scale-95 mt-2"
            style={{
              background: loading ? "#1a2b18" : "linear-gradient(135deg, #2ecc71, #14b8a6)",
              color: loading ? "#7aab6e" : "black",
              boxShadow: loading ? "none" : "0 0 24px rgba(46,204,113,0.35)",
            }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                {tab === "login" ? "Verificando…" : "Creando cuenta…"}
              </span>
            ) : tab === "login" ? "Iniciar sesión" : "Crear mi cuenta"}
          </button>

          {tab === "login" && (
            <p className="text-xs text-center" style={{ color: "#4a6a44" }}>
              ¿No tienes cuenta?{" "}
              <button type="button" onClick={() => { setTab("register"); setError(""); }} style={{ color: "#2ecc71" }} className="hover:underline">
                Regístrate gratis
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
