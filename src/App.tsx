import { useState, useEffect, useCallback } from "react";
import { getSession, logout, type User } from "./auth";
import { register, login } from "./auth";
import LoginModal from "./LoginModal";
import {
  type Booking,
  getBookings,
  addBooking,
  resetBookings,
  getVisitorsByExperience,
  getTotalRevenueCOP,
  generateId,
} from "./bookings";
import { resetUsers } from "./api";
import {
  AVAILABLE_DATES,
  getDateAvailability,
  getNextAvailableDate,
  formatShortDate,
  formatFullDate,
} from "./availability";

type View = "home" | "detail" | "admin";
type Currency = "COP" | "USD" | "EUR";
type Language = "ES" | "EN";

const RATES: Record<Currency, number> = { COP: 1, USD: 0.00025, EUR: 0.00023 };
const CURRENCY_SYMBOLS: Record<Currency, string> = { COP: "$", USD: "US$", EUR: "€" };

const BASE_PRICES: Record<string, number> = {
  birds: 280000,
  hiking: 195000,
  maritime: 420000,
};

const EXPERIENCES = [
  {
    id: "birds",
    title: "Avistamiento de Aves",
    subtitle: "Birdwatching Experience",
    duration: "6 horas",
    difficulty: "Moderado",
    maxPax: 8,
    image: "https://images.unsplash.com/photo-1762987015809-914a897785cb?w=600&h=400&fit=crop&auto=format",
    galleryImages: [
      "https://images.unsplash.com/photo-1762987015809-914a897785cb?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1650201776239-2580d73ac995?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1768511128927-a6f75f7b7c45?w=800&h=500&fit=crop&auto=format",
    ],
    guide: "Dr. Camilo Andrade Ríos",
    guideTitle: "Ornitólogo Certificado — UNAL Bogotá",
    license: "COL-ORN-2024-0487",
    description: "Adéntrate en el bosque húmedo tropical del Chocó para observar más de 120 especies endémicas, incluidos el colibrí del Chocó y el tucán pechiamarillo. Una experiencia única guiada por un ornitólogo certificado con más de 15 años de campo.",
    included: ["Binoculares de alta gama", "Guía especializado", "Desayuno ecológico", "Transporte fluvial"],
    tags: ["Endémico", "Fotográfico", "Científico"],
    color: "#14b8a6",
    zone: "Reserva Ornitológica Baudó",
    zoneMax: 8,
  },
  {
    id: "hiking",
    title: "Senderismo Guiado",
    subtitle: "Guided Jungle Trek",
    duration: "8 horas",
    difficulty: "Exigente",
    maxPax: 12,
    image: "https://images.unsplash.com/photo-1568489711036-9c94a7d5aea6?w=600&h=400&fit=crop&auto=format",
    galleryImages: [
      "https://images.unsplash.com/photo-1568489711036-9c94a7d5aea6?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1642964408260-91533f12e420?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1457414254764-c87b209f5249?w=800&h=500&fit=crop&auto=format",
    ],
    guide: "Luis Fernando Mosquera",
    guideTitle: "Guía Ecológico Certificado — MinCIT",
    license: "GEC-CHOCO-2023-1142",
    description: "Recorre senderos ancestrales a través de la selva más biodiversa del planeta. El recorrido incluye visita a cascadas sagradas de comunidades afrodescendientes, identificación de plantas medicinales y cruce de puentes colgantes sobre ríos cristalinos.",
    included: ["Kit senderismo", "Almuerzo comunitario", "Seguro de aventura", "Guía nativo bilingüe"],
    tags: ["Aventura", "Cultural", "Comunidad"],
    color: "#2ecc71",
    zone: "Sendero Los Katíos",
    zoneMax: 35,
  },
  {
    id: "maritime",
    title: "Tour Marítimo",
    subtitle: "Coastal Marine Tour",
    duration: "10 horas",
    difficulty: "Fácil",
    maxPax: 16,
    image: "https://images.unsplash.com/photo-1538821169352-a455f1f448b2?w=600&h=400&fit=crop&auto=format",
    galleryImages: [
      "https://images.unsplash.com/photo-1538821169352-a455f1f448b2?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1595101445719-aaff4a444631?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1705725225558-dd1f4480611d?w=800&h=500&fit=crop&auto=format",
    ],
    guide: "Capitán Jorge Mena Palacios",
    guideTitle: "Capitán Certificado Armada Nacional",
    license: "MAR-COL-2024-0833-DIMAR",
    description: "Navegación por el Pacífico colombiano desde Bahía Solano hasta el Parque Nacional Ensenada de Utría. Avistamiento de ballenas jorobadas (jul–oct), delfines mulares y tortugas baulas en su hábitat natural.",
    included: ["Embarcación certificada", "Equipo de buceo básico", "Almuerzo a bordo", "Licencia ambiental"],
    tags: ["Ballenas", "Buceo", "Pacífico"],
    color: "#0ea5e9",
    zone: "Parque Ensenada de Utría",
    zoneMax: 30,
  },
];

const INTEGRATIONS = [
  { name: "Booking.com", status: "connected", lastSync: "hace 3 min" },
  { name: "TripAdvisor", status: "connected", lastSync: "hace 8 min" },
  { name: "Airbnb Experiences", status: "syncing", lastSync: "sincronizando…" },
  { name: "GetYourGuide", status: "connected", lastSync: "hace 1 min" },
];

function formatPrice(baseCOP: number, currency: Currency): string {
  const converted = baseCOP * RATES[currency];
  const sym = CURRENCY_SYMBOLS[currency];
  if (currency === "COP") return `${sym} ${Math.round(baseCOP).toLocaleString("es-CO")}`;
  return `${sym} ${converted.toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// ─── RESET CONFIRM MODAL ──────────────────────────────────────────────────────
function ResetModal({ title, description, onConfirm, onCancel, loading }: {
  title: string; description: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(7,14,6,0.85)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm rounded-2xl border p-6 space-y-5"
        style={{ background: "#0f1a0d", borderColor: "rgba(239,68,68,0.3)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.12)" }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#ef4444" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: "#7aab6e" }}>{description}</p>
          </div>
        </div>
        <p className="text-sm" style={{ color: "#a8d5a0" }}>
          Esta acción borrará todos los datos permanentemente en Supabase y no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
            style={{ borderColor: "#1f3320", color: "#7aab6e", background: "transparent" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: loading ? "#1a0a0a" : "linear-gradient(135deg, #ef4444, #dc2626)", color: loading ? "#7a4444" : "white" }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                Reiniciando…
              </span>
            ) : "Sí, reiniciar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ currency, setCurrency, language, setLanguage, activeView, setView, user, onLoginClick, onLogout }: {
  currency: Currency; setCurrency: (c: Currency) => void;
  language: Language; setLanguage: (l: Language) => void;
  activeView: View; setView: (v: View) => void;
  user: User | null; onLoginClick: () => void; onLogout: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
      style={{ background: "linear-gradient(to bottom, rgba(7,14,6,0.97) 0%, rgba(7,14,6,0.0) 100%)", backdropFilter: "blur(8px)" }}>
      <button onClick={() => setView("home")} className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2ecc71, #14b8a6)" }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
          Chocó<span style={{ color: "#2ecc71" }}>Bio</span>
        </span>
      </button>

      <div className="hidden md:flex items-center gap-1">
        {(["home", "detail"] as View[]).map((v) => {
          const labels: Record<View, string> = { home: "Catálogo", detail: "Experiencia", admin: "Dashboard" };
          return (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeView === v ? "rgba(46,204,113,0.15)" : "transparent",
                color: activeView === v ? "#2ecc71" : "#7aab6e",
                border: activeView === v ? "1px solid rgba(46,204,113,0.3)" : "1px solid transparent",
              }}>
              {labels[v]}
            </button>
          );
        })}
        {user?.role === "admin" && (
          <button onClick={() => setView("admin")}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: activeView === "admin" ? "rgba(20,184,166,0.15)" : "transparent",
              color: activeView === "admin" ? "#14b8a6" : "#7aab6e",
              border: activeView === "admin" ? "1px solid rgba(20,184,166,0.3)" : "1px solid transparent",
            }}>
            Dashboard
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}
          className="text-xs font-medium rounded-lg px-3 py-2 border outline-none cursor-pointer"
          style={{ background: "#0f1a0d", borderColor: "#1f3320", color: "#7aab6e" }}>
          <option value="ES">🌿 Español</option>
          <option value="EN">🌐 English</option>
        </select>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}
          className="text-xs font-medium rounded-lg px-3 py-2 border outline-none cursor-pointer"
          style={{ background: "#0f1a0d", borderColor: "#1f3320", color: "#7aab6e" }}>
          <option value="COP">COP $</option>
          <option value="USD">USD $</option>
          <option value="EUR">EUR €</option>
        </select>

        {user ? (
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 border transition-all hover:border-green-400/30"
              style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
              <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
              <span className="text-xs font-medium max-w-24 truncate hidden md:block" style={{ color: "#e8f5e2" }}>{user.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold hidden md:block"
                style={{ background: user.role === "admin" ? "rgba(20,184,166,0.2)" : "rgba(46,204,113,0.15)", color: user.role === "admin" ? "#14b8a6" : "#2ecc71" }}>
                {user.role === "admin" ? "Admin" : "Turista"}
              </span>
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="#7aab6e" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border overflow-hidden z-50"
                style={{ background: "#0f1a0d", borderColor: "#1f3320", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "#1f3320" }}>
                  <div className="flex items-center gap-3 mb-1">
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-semibold text-sm text-white">{user.name}</div>
                      <div className="text-xs" style={{ color: "#7aab6e" }}>{user.email}</div>
                    </div>
                  </div>
                  <div className="text-xs mt-2 font-mono" style={{ color: "#4a6a44" }}>
                    desde {new Date(user.createdAt).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className="p-2">
                  {user.role === "admin" && (
                    <button onClick={() => { setView("admin"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white/5 text-left"
                      style={{ color: "#14b8a6" }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                      Ir al Dashboard
                    </button>
                  )}
                  <button onClick={() => { setView("home"); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white/5 text-left"
                    style={{ color: "#a8d5a0" }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Mis reservas
                  </button>
                  <div className="border-t my-1" style={{ borderColor: "#1f3320" }} />
                  <button onClick={() => { onLogout(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors hover:bg-red-500/5 text-left"
                    style={{ color: "#f87171" }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
            {profileOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />}
          </div>
        ) : (
          <button onClick={onLoginClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #2ecc71, #14b8a6)", color: "black" }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
            Ingresar
          </button>
        )}
      </div>
    </nav>
  );
}

// ─── HERO CAROUSEL ────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1723415915112-ec37be39f105?w=1920&h=1080&fit=crop&auto=format",
    alt: "Vista aérea de la selva del Chocó Biogeográfico",
    label: "Selva del Chocó",
  },
  {
    url: "https://images.unsplash.com/photo-1758672989540-df043a5aa8b2?w=1920&h=1080&fit=crop&auto=format",
    alt: "Canopia verde del bosque húmedo tropical",
    label: "Bosque Húmedo Tropical",
  },
  {
    url: "https://images.unsplash.com/photo-1710812030602-4a3662eb0135?w=1920&h=1080&fit=crop&auto=format",
    alt: "Cascada en la selva tropical del Chocó",
    label: "Cascadas del Pacífico",
  },
  {
    url: "https://images.unsplash.com/photo-1611222566512-cb8dd8e689e5?w=1920&h=1080&fit=crop&auto=format",
    alt: "Río cristalino entre la vegetación del Chocó",
    label: "Ríos Cristalinos",
  },
  {
    url: "https://images.unsplash.com/photo-1674183402855-5febad1812e6?w=1920&h=1080&fit=crop&auto=format",
    alt: "Ballena jorobada saltando en el Pacífico colombiano",
    label: "Ballenas del Pacífico",
  },
  {
    url: "https://images.unsplash.com/photo-1725392364729-c45dfc2ce806?w=1920&h=1080&fit=crop&auto=format",
    alt: "Valle montañoso del Chocó Biogeográfico",
    label: "Valles Biogeográficos",
  },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPrev(current);
      setTransitioning(true);
      setCurrent((c) => (c + 1) % HERO_SLIDES.length);
      setTimeout(() => { setPrev(null); setTransitioning(false); }, 900);
    }, 5000);
    return () => clearInterval(id);
  }, [current]);

  function goTo(idx: number) {
    if (idx === current || transitioning) return;
    setPrev(current);
    setTransitioning(true);
    setCurrent(idx);
    setTimeout(() => { setPrev(null); setTransitioning(false); }, 900);
  }

  return (
    <div className="absolute inset-0 bg-black">
      {/* Previous slide (fades out) */}
      {prev !== null && (
        <img
          key={`prev-${prev}`}
          src={HERO_SLIDES[prev].url}
          alt={HERO_SLIDES[prev].alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0, transition: "opacity 900ms ease" }}
        />
      )}
      {/* Current slide (fades in) */}
      <img
        key={`curr-${current}`}
        src={HERO_SLIDES[current].url}
        alt={HERO_SLIDES[current].alt}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 1, transition: "opacity 900ms ease" }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,14,6,0.45) 0%, rgba(7,14,6,0.2) 40%, rgba(7,14,6,0.88) 100%)" }} />

      {/* Slide label */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <span className="text-xs tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ background: "rgba(7,14,6,0.6)", color: "#7aab6e", border: "1px solid rgba(46,204,113,0.2)" }}>
          {HERO_SLIDES[current].label}
        </span>
        {/* Dot indicators */}
        <div className="flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 6, height: 6,
                background: i === current ? "#2ecc71" : "rgba(255,255,255,0.3)",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeView({ currency, setView, setSelected, bookings }: {
  currency: Currency; setView: (v: View) => void;
  setSelected: (id: string) => void; bookings: Booking[];
}) {
  return (
    <div className="min-h-screen">
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <HeroCarousel />
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6 tracking-widest uppercase"
            style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)", color: "#2ecc71" }}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Chocó Biogeográfico · Urabá · Colombia
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-4"
            style={{ fontFamily: "Outfit, sans-serif", textShadow: "0 4px 40px rgba(0,0,0,0.6)" }}>
            La Selva Más<br /><span style={{ color: "#2ecc71" }}>Biodiversa</span><br />del Planeta
          </h1>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto font-light">
            Experiencias ecoturísticas certificadas con impacto positivo en comunidades afrodescendientes e indígenas del Pacífico colombiano.
          </p>
          <button
            onClick={() => { const el = document.getElementById("catalogo"); el?.scrollIntoView({ behavior: "smooth" }); }}
            className="px-8 py-4 rounded-xl text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #2ecc71, #14b8a6)", boxShadow: "0 0 32px rgba(46,204,113,0.45)" }}>
            Explorar experiencias ↓
          </button>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 text-xs">
          <div className="w-px h-8 bg-gradient-to-b from-green-400/40 to-transparent" />
        </div>
      </section>

      <section id="catalogo" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "#2ecc71" }}>Experiencias Certificadas</p>
            <h2 className="text-4xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              Catálogo de<br />Experiencias
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm" style={{ color: "#7aab6e" }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {EXPERIENCES.filter(e => getNextAvailableDate(bookings, e.id, e.maxPax)).length} experiencias con disponibilidad
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EXPERIENCES.map((exp) => {
            const nextDate = getNextAvailableDate(bookings, exp.id, exp.maxPax);

            return (
              <div key={exp.id}
                className="group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1"
                style={{ background: "#0f1a0d", borderColor: "#1f3320", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = exp.color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 40px ${exp.color}22`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1f3320"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)"; }}>
                <div className="relative overflow-hidden h-52">
                  <img src={exp.image} alt={exp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(7,14,6,0.9) 100%)" }} />
                  <div className="absolute top-3 left-3 flex gap-2">
                    {exp.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-md text-xs font-semibold"
                        style={{ background: "rgba(7,14,6,0.85)", color: exp.color, border: `1px solid ${exp.color}44` }}>{tag}</span>
                    ))}
                  </div>
                  {/* Availability badge */}
                  {nextDate ? (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-semibold"
                      style={{ background: "rgba(7,14,6,0.9)", color: exp.color, border: `1px solid ${exp.color}44` }}>
                      Próx. {formatShortDate(nextDate)}
                    </div>
                  ) : (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-semibold"
                      style={{ background: "rgba(7,14,6,0.9)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                      Agotado
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 text-xs font-mono" style={{ color: "#7aab6e" }}>
                    {exp.duration} · Máx. {exp.maxPax} pax
                  </div>
                </div>

                {/* Available dates mini-strip */}
                <div className="px-4 pt-3 pb-1 flex gap-1.5 flex-wrap border-b" style={{ borderColor: "#1f3320" }}>
                  {(AVAILABLE_DATES[exp.id] || []).map((date) => {
                    const avail = getDateAvailability(bookings, exp.id, date, exp.maxPax);
                    return (
                      <span key={date}
                        className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{
                          background: avail.isPast || avail.isFull ? "rgba(255,255,255,0.03)" : `${exp.color}18`,
                          color: avail.isPast ? "#2a3a28" : avail.isFull ? "#4a3a1a" : exp.color,
                          border: `1px solid ${avail.isPast || avail.isFull ? "transparent" : `${exp.color}33`}`,
                          textDecoration: avail.isPast ? "line-through" : "none",
                        }}>
                        {formatShortDate(date)}
                        {!avail.isPast && !avail.isFull && <span style={{ opacity: 0.7 }}> ·{avail.remaining}</span>}
                        {avail.isFull && !avail.isPast && <span style={{ color: "#f59e0b" }}> ✕</span>}
                      </span>
                    );
                  })}
                </div>

                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>{exp.title}</h3>
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: "#7aab6e" }}>{exp.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs mb-0.5" style={{ color: "#7aab6e" }}>Desde</div>
                      <div className="text-xl font-black" style={{ color: exp.color, fontFamily: "Outfit, sans-serif" }}>
                        {formatPrice(BASE_PRICES[exp.id], currency)}
                      </div>
                      <div className="text-xs" style={{ color: "#7aab6e" }}>por persona</div>
                    </div>
                    <button
                      disabled={!nextDate}
                      onClick={() => { if (nextDate) { setSelected(exp.id); setView("detail"); } }}
                      className="px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={{
                        background: nextDate ? `linear-gradient(135deg, ${exp.color}, ${exp.color}cc)` : "#1a2218",
                        color: nextDate ? "black" : "#4a6a44",
                        boxShadow: nextDate ? `0 0 20px ${exp.color}44` : "none",
                      }}>
                      {nextDate ? "Ver Disponibilidad" : "Sin cupos"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y py-12 px-6" style={{ borderColor: "#1f3320", background: "#0a1208" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: "8.000+", label: "Especies registradas" },
            { val: "47", label: "Comunidades aliadas" },
            { val: "98%", label: "Satisfacción turistas" },
            { val: "0 CO₂", label: "Emisiones netas compensadas" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black mb-1" style={{ fontFamily: "Outfit, sans-serif", color: "#2ecc71" }}>{s.val}</div>
              <div className="text-sm" style={{ color: "#7aab6e" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── DETAIL + CHECKOUT ────────────────────────────────────────────────────────
function DetailView({ currency, experienceId, user, onBookingConfirmed, bookings }: {
  currency: Currency; experienceId: string; user: User | null;
  onBookingConfirmed: () => void; bookings: Booking[];
}) {
  const exp = EXPERIENCES.find((e) => e.id === experienceId) || EXPERIENCES[0];
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [visitors, setVisitors] = useState(2);
  const [selectedDate, setSelectedDate] = useState("");
  const [payStep, setPayStep] = useState<"idle" | "processing" | "confirmed">("idle");
  const total = BASE_PRICES[exp.id] * visitors;

  const dates = (AVAILABLE_DATES[exp.id] || []).map((date) =>
    getDateAvailability(bookings, exp.id, date, exp.maxPax)
  );
  const selectedAvail = dates.find((d) => d.date === selectedDate);
  const canBook = !!selectedDate && !!selectedAvail && !selectedAvail.isFull && !selectedAvail.isPast
    && selectedAvail.remaining >= visitors;

  async function handleConfirm() {
    if (!canBook) return;
    setPayStep("processing");
    const booking: Booking = {
      id: generateId(),
      userId: user?.id || "guest",
      userName: user?.name || "Visitante",
      userEmail: user?.email || "—",
      experienceId: exp.id,
      experienceTitle: exp.title,
      date: selectedDate,
      visitors,
      totalCOP: Math.round(total * 1.05),
      currency,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    await addBooking(booking);
    onBookingConfirmed();
    setPayStep("confirmed");
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-6">
            <div className="relative overflow-hidden rounded-2xl h-80 md:h-[420px] border" style={{ borderColor: "#1f3320" }}>
              <img src={exp.galleryImages[galleryIdx]} alt={exp.title} className="w-full h-full object-cover transition-all duration-500" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,14,6,0.7) 0%, transparent 60%)" }} />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {exp.galleryImages.map((_, i) => (
                  <button key={i} onClick={() => setGalleryIdx(i)} className="rounded-full transition-all"
                    style={{ width: i === galleryIdx ? 24 : 8, height: 8, background: i === galleryIdx ? exp.color : "rgba(255,255,255,0.3)" }} />
                ))}
              </div>
              {[
                { dir: "left", icon: "M15 18l-6-6 6-6", action: () => setGalleryIdx((i) => (i - 1 + exp.galleryImages.length) % exp.galleryImages.length) },
                { dir: "right", icon: "M9 18l6-6-6-6", action: () => setGalleryIdx((i) => (i + 1) % exp.galleryImages.length) },
              ].map((btn) => (
                <div key={btn.dir} className={`absolute inset-y-0 ${btn.dir}-3 flex items-center`}>
                  <button onClick={btn.action} className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(7,14,6,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-none stroke-current" strokeWidth="2"><path d={btn.icon}/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {exp.galleryImages.map((src, i) => (
                <button key={i} onClick={() => setGalleryIdx(i)}
                  className="w-24 h-16 rounded-xl overflow-hidden border-2 transition-all"
                  style={{ borderColor: i === galleryIdx ? exp.color : "transparent" }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="rounded-2xl border p-6 space-y-5" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {exp.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: `${exp.color}22`, color: exp.color, border: `1px solid ${exp.color}44` }}>{t}</span>
                  ))}
                </div>
                <h1 className="text-3xl font-black text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{exp.title}</h1>
                <p className="mt-1 text-sm" style={{ color: "#7aab6e" }}>{exp.subtitle}</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#a8d5a0" }}>{exp.description}</p>
              <div className="rounded-xl p-4 border space-y-3" style={{ background: "#070e06", borderColor: "#1f3320" }}>
                <h4 className="text-xs tracking-widest uppercase font-semibold" style={{ color: "#2ecc71" }}>Especificaciones Técnicas</h4>
                {[
                  { label: "Guía responsable", value: exp.guide },
                  { label: "Titulación", value: exp.guideTitle },
                  { label: "Licencia / Matrícula", value: exp.license, mono: true },
                  { label: "Duración", value: exp.duration },
                  { label: "Dificultad", value: exp.difficulty },
                  { label: "Capacidad máxima", value: `${exp.maxPax} visitantes` },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 text-sm border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: "#1f3320" }}>
                    <span style={{ color: "#7aab6e" }}>{row.label}</span>
                    <span className={row.mono ? "font-mono text-xs" : "font-medium text-right"} style={{ color: row.mono ? exp.color : "#e8f5e2" }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-xs tracking-widest uppercase font-semibold mb-3" style={{ color: "#2ecc71" }}>Incluido</h4>
                <div className="grid grid-cols-2 gap-2">
                  {exp.included.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "#a8d5a0" }}>
                      <span style={{ color: exp.color }}>✓</span>{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border overflow-hidden" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
              <div className="p-5 border-b" style={{ borderColor: "#1f3320" }}>
                <div className="text-xs mb-1" style={{ color: "#7aab6e" }}>Precio por persona</div>
                <div className="text-3xl font-black" style={{ fontFamily: "Outfit, sans-serif", color: exp.color }}>
                  {formatPrice(BASE_PRICES[exp.id], currency)}
                </div>
              </div>
              <div className="p-5 space-y-5">
                {/* Date chip selector */}
                <div>
                  <label className="block text-xs tracking-widest uppercase font-semibold mb-3" style={{ color: "#7aab6e" }}>
                    Fecha disponible
                  </label>
                  <div className="space-y-2">
                    {dates.map(({ date, isFull, isPast, remaining, booked }) => {
                      const isSelected = selectedDate === date;
                      const disabled = isFull || isPast;
                      return (
                        <button key={date} disabled={disabled}
                          onClick={() => { if (!disabled) { setSelectedDate(date); setPayStep("idle"); } }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left"
                          style={{
                            background: isSelected ? `${exp.color}18` : disabled ? "rgba(255,255,255,0.02)" : "#070e06",
                            borderColor: isSelected ? `${exp.color}55` : disabled ? "#111" : "#1f3320",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.4 : 1,
                          }}>
                          <div>
                            <div className="text-sm font-semibold capitalize"
                              style={{ color: isSelected ? exp.color : disabled ? "#4a6a44" : "#e8f5e2" }}>
                              {formatFullDate(date)}
                            </div>
                            <div className="text-xs mt-0.5 font-mono" style={{ color: "#7aab6e" }}>
                              {isPast ? "Fecha pasada" : isFull ? "Sin cupos disponibles" : `${remaining} cupos disponibles de ${exp.maxPax}`}
                            </div>
                          </div>
                          <div className="shrink-0 ml-3">
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: exp.color }}>
                                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="black" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                              </div>
                            )}
                            {!isSelected && !disabled && (
                              <div className="w-5 h-5 rounded-full border" style={{ borderColor: "#1f3320" }} />
                            )}
                            {isFull && !isPast && (
                              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>Lleno</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedDate && selectedAvail && !selectedAvail.isFull && (
                    <div className="mt-2 text-xs px-3 py-2 rounded-lg"
                      style={{ background: `${exp.color}10`, color: exp.color }}>
                      Quedan {selectedAvail.remaining} cupos — confirma pronto
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: "#7aab6e" }}>
                    Visitantes <span className="normal-case tracking-normal text-xs" style={{ color: "#4a6a44" }}>
                      (máx. {selectedAvail && !selectedAvail.isFull ? selectedAvail.remaining : exp.maxPax} disponibles)
                    </span>
                  </label>
                  <div className="flex items-center gap-4 rounded-xl px-4 py-3 border" style={{ background: "#070e06", borderColor: "#1f3320" }}>
                    <button onClick={() => setVisitors(Math.max(1, visitors - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:scale-110"
                      style={{ background: "#1a2b18", color: "#7aab6e" }}>–</button>
                    <span className="flex-1 text-center text-xl font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{visitors}</span>
                    <button onClick={() => setVisitors(Math.min(selectedAvail?.remaining ?? exp.maxPax, visitors + 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:scale-110"
                      style={{ background: "#1a2b18", color: exp.color }}>+</button>
                  </div>
                </div>
                <div className="rounded-xl p-4 border space-y-2" style={{ background: "#070e06", borderColor: "#1f3320" }}>
                  <div className="flex justify-between text-sm" style={{ color: "#7aab6e" }}>
                    <span>{formatPrice(BASE_PRICES[exp.id], currency)} × {visitors} pax</span>
                    <span className="text-white">{formatPrice(total, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: "#7aab6e" }}>
                    <span>Cargo plataforma (5%)</span>
                    <span className="text-white">{formatPrice(total * 0.05, currency)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: "#1f3320" }}>
                    <span className="text-white">Total</span>
                    <div className="text-right">
                      <div className="text-lg" style={{ color: exp.color, fontFamily: "Outfit, sans-serif" }}>{formatPrice(total * 1.05, currency)}</div>
                      {currency !== "COP" && <div className="text-xs" style={{ color: "#7aab6e" }}>≈ {formatPrice(total * 1.05, "COP")} COP</div>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "#7aab6e" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Tipo de cambio actualizado · {new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <button onClick={handleConfirm}
                  disabled={payStep === "processing" || payStep === "confirmed" || !canBook}
                  className="w-full py-4 rounded-xl font-bold transition-all"
                  style={{
                    background: payStep === "confirmed" ? "linear-gradient(135deg, #2ecc71, #16a34a)" : payStep === "processing" ? "#1a2b18" : canBook ? `linear-gradient(135deg, ${exp.color}, ${exp.color}cc)` : "#1a2218",
                    opacity: !canBook && payStep === "idle" ? 0.55 : 1,
                    boxShadow: payStep === "idle" && canBook ? `0 0 24px ${exp.color}55` : "none",
                    color: payStep === "processing" ? "#7aab6e" : canBook || payStep === "confirmed" ? "black" : "#4a6a44",
                  }}>
                  {payStep === "idle" && (canBook ? "Confirmar Reserva" : "Selecciona fecha y visitantes")}
                  {payStep === "processing" && (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                      </svg>
                      Guardando en Supabase…
                    </span>
                  )}
                  {payStep === "confirmed" && "✓ ¡Reserva Confirmada!"}
                </button>
                {payStep === "confirmed" && (
                  <div className="rounded-xl p-4 border text-sm text-center" style={{ background: "rgba(46,204,113,0.1)", borderColor: "rgba(46,204,113,0.3)", color: "#2ecc71" }}>
                    Reserva guardada en Supabase. El administrador la verá en tiempo real.
                  </div>
                )}
                {selectedDate && selectedAvail && visitors > selectedAvail.remaining && payStep === "idle" && (
                  <p className="text-xs text-center" style={{ color: "#f59e0b" }}>
                    Solo quedan {selectedAvail.remaining} cupos para esta fecha
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ACCESS DENIED ────────────────────────────────────────────────────────────
function AccessDenied({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center pt-14 px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>Acceso Restringido</h2>
        <p className="text-sm mb-8" style={{ color: "#7aab6e" }}>
          El panel de administración es exclusivo para operadores registrados con rol de administrador.
        </p>
        <button onClick={onLogin}
          className="px-6 py-3 rounded-xl text-sm font-bold text-black transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #2ecc71, #14b8a6)", boxShadow: "0 0 24px rgba(46,204,113,0.3)" }}>
          Iniciar sesión como administrador
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
type AdminSection = "panel" | "reservas" | "conexiones";
type ResetTarget = "panel" | "reservas" | null;

function AdminView({ bookings, onRefresh }: { bookings: Booking[]; onRefresh: () => void }) {
  const [section, setSection] = useState<AdminSection>("panel");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);
  const [resetting, setResetting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.createdAt.startsWith(today) || b.date === today);
  const confirmedToday = todayBookings.filter((b) => b.status === "confirmed");
  const revenueCOP = getTotalRevenueCOP(bookings);
  const visitorsActive = confirmedToday.reduce((s, b) => s + b.visitors, 0);
  const ecologicalAlerts = EXPERIENCES.filter((exp) => (getVisitorsByExperience(bookings, exp.id) / exp.zoneMax) >= 0.85).length;
  const capacityZones = EXPERIENCES.map((exp) => ({
    zone: exp.zone, color: exp.color, max: exp.zoneMax,
    used: getVisitorsByExperience(bookings, exp.id),
  }));
  const integrationBookingCounts = INTEGRATIONS.map((intg, i) => ({
    ...intg, bookings: confirmedToday.length + [14, 9, 5, 7][i],
  }));

  async function handleReset() {
    setResetting(true);
    try {
      if (resetTarget === "reservas") {
        await resetBookings();
      } else if (resetTarget === "panel") {
        await resetBookings();
      }
      onRefresh();
    } finally {
      setResetting(false);
      setResetTarget(null);
    }
  }

  const navItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: "panel", label: "Panel General", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "reservas", label: "Reservas Activas", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { id: "conexiones", label: "Conexiones Externas", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  ];

  function ResetButton({ target, label }: { target: ResetTarget; label: string }) {
    return (
      <button onClick={() => setResetTarget(target)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
        style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)", color: "#f87171" }}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
        </svg>
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-screen flex pt-14" style={{ background: "#070e06" }}>
      {resetTarget && (
        <ResetModal
          title={resetTarget === "panel" ? "Reiniciar Panel General" : "Reiniciar Reservas Activas"}
          description={resetTarget === "panel" ? "Se eliminarán todos los datos del panel y las métricas de hoy." : "Se eliminarán todas las reservas registradas en Supabase."}
          onConfirm={handleReset}
          onCancel={() => setResetTarget(null)}
          loading={resetting}
        />
      )}

      <aside className={`${sidebarOpen ? "w-60" : "w-16"} shrink-0 border-r flex flex-col transition-all duration-300`}
        style={{ background: "#0a110a", borderColor: "#1f3320" }}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: "#1f3320" }}>
          {sidebarOpen && (
            <div>
              <div className="text-xs font-semibold" style={{ color: "#2ecc71" }}>PANEL OPERATIVO</div>
              <div className="text-xs" style={{ color: "#4a6a44" }}>ChocóBio Admin · Supabase</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto p-1 rounded" style={{ color: "#7aab6e" }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setSection(item.id)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left"
              style={{
                background: section === item.id ? "rgba(46,204,113,0.12)" : "transparent",
                color: section === item.id ? "#2ecc71" : "#7aab6e",
                border: section === item.id ? "1px solid rgba(46,204,113,0.25)" : "1px solid transparent",
              }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {sidebarOpen && item.label}
              {sidebarOpen && item.id === "reservas" && bookings.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "rgba(46,204,113,0.2)", color: "#2ecc71" }}>{bookings.length}</span>
              )}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div className="p-4 border-t" style={{ borderColor: "#1f3320" }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#4a6a44" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Supabase conectado
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {section === "panel" && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Panel General</h2>
                <p className="text-sm" style={{ color: "#7aab6e" }}>
                  Chocó Biogeográfico · {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.2)", color: "#2ecc71" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Tiempo real
                </div>
                <ResetButton target="panel" label="Reiniciar Panel" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Reservas hoy", val: todayBookings.length.toString(), sub: `${confirmedToday.length} confirmadas`, color: "#2ecc71" },
                { label: "Ingresos hoy", val: revenueCOP >= 1000000 ? `$${(revenueCOP / 1000000).toFixed(1)}M` : `$${(revenueCOP / 1000).toFixed(0)}K`, sub: "COP brutos", color: "#14b8a6" },
                { label: "Visitantes confirmados", val: visitorsActive.toString(), sub: "en reservas activas", color: "#0ea5e9" },
                { label: "Alertas ecológicas", val: ecologicalAlerts.toString(), sub: ecologicalAlerts > 0 ? "zonas en riesgo" : "todo en orden", color: ecologicalAlerts > 0 ? "#f59e0b" : "#2ecc71" },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border p-5" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
                  <div className="text-2xl font-black mb-1" style={{ fontFamily: "Outfit, sans-serif", color: k.color }}>{k.val}</div>
                  <div className="text-sm font-medium text-white">{k.label}</div>
                  <div className="text-xs mt-1" style={{ color: "#4a6a44" }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border p-6" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Control de Capacidad de Carga</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#7aab6e" }}>Visitantes por zona desde Supabase — protección ecológica activa</p>
                </div>
                {ecologicalAlerts > 0 && (
                  <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {ecologicalAlerts} zona{ecologicalAlerts > 1 ? "s" : ""} en alerta
                  </div>
                )}
              </div>
              <div className="space-y-5">
                {capacityZones.map((zone) => {
                  const pct = Math.min((zone.used / zone.max) * 100, 100);
                  const isAlert = pct >= 85;
                  const isWarning = pct >= 65 && !isAlert;
                  const barColor = isAlert ? "linear-gradient(90deg, #f59e0b, #ef4444)" : isWarning ? "linear-gradient(90deg, #2ecc71, #f59e0b)" : `linear-gradient(90deg, #14b8a6, ${zone.color})`;
                  return (
                    <div key={zone.zone}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{zone.zone}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono" style={{ color: isAlert ? "#ef4444" : "#7aab6e" }}>{zone.used}/{zone.max} visitantes</span>
                          {isAlert && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                              ⚠ TOPE ECOLÓGICO
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "#1a2b18" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                        {isAlert && <div className="absolute inset-0 rounded-full opacity-20 animate-pulse" style={{ background: "linear-gradient(90deg, transparent, #ef4444)" }} />}
                      </div>
                      <div className="flex justify-between mt-1 text-xs" style={{ color: "#4a6a44" }}>
                        <span>0</span>
                        <span style={{ color: isAlert ? "#ef4444" : "#4a6a44" }}>{Math.round(pct)}% ocupado</span>
                        <span>Máx. {zone.max}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {bookings.length > 0 && (
              <div className="rounded-2xl border p-6" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
                <h3 className="text-base font-bold text-white mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>Actividad Reciente</h3>
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b) => {
                    const expMeta = EXPERIENCES.find((e) => e.id === b.experienceId);
                    return (
                      <div key={b.id} className="flex items-center gap-4 text-sm">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: expMeta?.color || "#2ecc71" }} />
                        <span className="font-medium text-white truncate max-w-32">{b.userName}</span>
                        <span style={{ color: "#7aab6e" }}>reservó</span>
                        <span className="truncate flex-1" style={{ color: "#a8d5a0" }}>{b.experienceTitle}</span>
                        <span className="text-xs shrink-0 font-mono" style={{ color: "#4a6a44" }}>{timeAgo(b.createdAt)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: b.status === "confirmed" ? "rgba(46,204,113,0.12)" : "rgba(245,158,11,0.12)", color: b.status === "confirmed" ? "#2ecc71" : "#f59e0b" }}>
                          {b.status === "confirmed" ? "✓" : "⏳"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {section === "reservas" && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Reservas Activas</h2>
                <p className="text-sm" style={{ color: "#7aab6e" }}>
                  {bookings.length} reservas totales · {confirmedToday.length} confirmadas hoy · sincronizado con Supabase
                </p>
              </div>
              <ResetButton target="reservas" label="Reiniciar Reservas" />
            </div>
            <div className="rounded-2xl border overflow-hidden" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
              {bookings.length === 0 ? (
                <div className="py-20 text-center" style={{ color: "#4a6a44" }}>
                  <div className="text-4xl mb-3">📋</div>
                  <div className="text-sm">No hay reservas registradas.</div>
                  <div className="text-xs mt-1">Cuando los turistas confirmen reservas aparecerán aquí.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "#1f3320" }}>
                        {["ID Reserva", "Turista", "Experiencia", "Fecha", "Pax", "Total COP", "Divisa", "Estado"].map((h) => (
                          <th key={h} className="text-left px-5 py-4 text-xs tracking-widest uppercase font-semibold whitespace-nowrap" style={{ color: "#7aab6e" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((r) => {
                        const expMeta = EXPERIENCES.find((e) => e.id === r.experienceId);
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-white/2 transition-colors" style={{ borderColor: "#1f3320" }}>
                            <td className="px-5 py-4 font-mono text-xs" style={{ color: "#2ecc71" }}>{r.id}</td>
                            <td className="px-5 py-4">
                              <div className="font-medium text-white">{r.userName}</div>
                              <div className="text-xs" style={{ color: "#4a6a44" }}>{r.userEmail}</div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="flex items-center gap-1.5" style={{ color: expMeta?.color || "#a8d5a0" }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />{r.experienceTitle}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-xs" style={{ color: "#7aab6e" }}>{r.date}</td>
                            <td className="px-5 py-4 text-center text-white font-bold">{r.visitors}</td>
                            <td className="px-5 py-4 font-semibold text-white">$ {r.totalCOP.toLocaleString("es-CO")}</td>
                            <td className="px-5 py-4 text-xs" style={{ color: "#7aab6e" }}>{r.currency}</td>
                            <td className="px-5 py-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  background: r.status === "confirmed" ? "rgba(46,204,113,0.15)" : "rgba(245,158,11,0.15)",
                                  color: r.status === "confirmed" ? "#2ecc71" : "#f59e0b",
                                  border: `1px solid ${r.status === "confirmed" ? "rgba(46,204,113,0.3)" : "rgba(245,158,11,0.3)"}`,
                                }}>
                                {r.status === "confirmed" ? "Confirmada" : "Pendiente"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {section === "conexiones" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>Conexiones Externas</h2>
              <p className="text-sm" style={{ color: "#7aab6e" }}>Sincronización con metabuscadores — prevención activa de overbooking</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {integrationBookingCounts.map((intg) => (
                <div key={intg.name} className="rounded-2xl border p-6" style={{ background: "#0f1a0d", borderColor: "#1f3320" }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>{intg.name}</div>
                      <div className="text-xs mt-1" style={{ color: "#4a6a44" }}>Última sincronización: {intg.lastSync}</div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{
                        background: intg.status === "connected" ? "rgba(46,204,113,0.12)" : "rgba(20,184,166,0.12)",
                        color: intg.status === "connected" ? "#2ecc71" : "#14b8a6",
                        border: `1px solid ${intg.status === "connected" ? "rgba(46,204,113,0.3)" : "rgba(20,184,166,0.3)"}`,
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {intg.status === "connected" ? "Conectado" : "Sincronizando"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl p-3 border" style={{ background: "#070e06", borderColor: "#1f3320" }}>
                    <span className="text-xs" style={{ color: "#7aab6e" }}>Reservas sincronizadas hoy</span>
                    <span className="text-2xl font-black" style={{ fontFamily: "Outfit, sans-serif", color: "#2ecc71" }}>{intg.bookings}</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a2b18" }}>
                    <div className="h-full rounded-full" style={{ width: intg.status === "syncing" ? "60%" : "100%", background: "linear-gradient(90deg, #14b8a6, #2ecc71)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border p-6" style={{ background: "#0f1a0d", borderColor: "rgba(46,204,113,0.25)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(46,204,113,0.15)" }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#2ecc71" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>Motor Anti-Overbooking Activo</h3>
                  <p className="text-xs" style={{ color: "#7aab6e" }}>Cupos bloqueados en Supabase al confirmar — {bookings.filter((b) => b.status === "confirmed").length} cupos activos</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { val: "0", label: "Conflictos de overbooking hoy" },
                  { val: "1.2s", label: "Latencia media de sincronización" },
                  { val: "99.8%", label: "Uptime del sistema este mes" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-4 border" style={{ background: "#070e06", borderColor: "#1f3320" }}>
                    <div className="text-2xl font-black mb-1" style={{ fontFamily: "Outfit, sans-serif", color: "#2ecc71" }}>{s.val}</div>
                    <div className="text-xs" style={{ color: "#7aab6e" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>("home");
  const [currency, setCurrency] = useState<Currency>("COP");
  const [language, setLanguage] = useState<Language>("ES");
  const [selectedExp, setSelectedExp] = useState("birds");
  const [user, setUser] = useState<User | null>(() => getSession());
  const [showLogin, setShowLogin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const refreshBookings = useCallback(async () => {
    const data = await getBookings();
    setBookings(data);
  }, []);

  useEffect(() => { refreshBookings(); }, [refreshBookings]);

  function handleAuth(u: User) {
    setUser(u);
    setShowLogin(false);
    if (u.role === "admin") { refreshBookings(); setView("admin"); }
  }

  function handleLogout() {
    logout();
    setUser(null);
    setView("home");
  }

  return (
    <div className="min-h-screen" style={{ background: "#070e06", color: "#e8f5e2" }}>
      <Navbar
        currency={currency} setCurrency={setCurrency}
        language={language} setLanguage={setLanguage}
        activeView={view}
        setView={(v) => { if (v === "admin") refreshBookings(); setView(v); }}
        user={user} onLoginClick={() => setShowLogin(true)} onLogout={handleLogout}
      />
      {view === "home" && <HomeView currency={currency} setView={setView} setSelected={setSelectedExp} bookings={bookings} />}
      {view === "detail" && (
        <DetailView currency={currency} experienceId={selectedExp} user={user} onBookingConfirmed={refreshBookings} bookings={bookings} />
      )}
      {view === "admin" && (
        user?.role === "admin"
          ? <AdminView bookings={bookings} onRefresh={refreshBookings} />
          : <AccessDenied onLogin={() => setShowLogin(true)} />
      )}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onAuth={handleAuth} />
      )}
    </div>
  );
}
