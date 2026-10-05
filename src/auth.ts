import { getUsers, createUser } from "./api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "tourist" | "admin";
  createdAt: string;
  avatar: string;
  _pw?: string;
}

const SESSION_KEY = "chocobio_session";
const LOCAL_USERS_KEY = "chocobio_users_local";

// ── Local fallback helpers ────────────────────────────────────────────────────
function localGetUsers(): (User & { _pw: string })[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "[]"); }
  catch { return []; }
}

function localSaveUsers(users: (User & { _pw: string })[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function register(
  name: string, email: string, password: string, role: "tourist" | "admin"
): Promise<{ user: User } | { error: string }> {
  const id = crypto.randomUUID();
  const normalizedEmail = email.toLowerCase().trim();
  const userRecord = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    role,
    createdAt: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=2ecc71&textColor=000000`,
    _pw: btoa(password + id),
  };

  // Try remote first, fall back to localStorage
  try {
    await createUser(userRecord);
  } catch {
    // Remote unavailable — save locally
    const locals = localGetUsers();
    if (locals.find((u) => u.email === normalizedEmail)) {
      return { error: "Ya existe una cuenta con ese correo electrónico." };
    }
    locals.unshift(userRecord as User & { _pw: string });
    localSaveUsers(locals);
  }

  const clean: User = { id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role, createdAt: userRecord.createdAt, avatar: userRecord.avatar };
  localStorage.setItem(SESSION_KEY, JSON.stringify(clean));
  return { user: clean };
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(
  email: string, password: string
): Promise<{ user: User } | { error: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try remote users first
  let users: (User & { _pw?: string })[] = [];
  let remoteOk = false;
  try {
    users = await getUsers();
    remoteOk = true;
  } catch {
    // Remote unavailable — use local store
    users = localGetUsers();
  }

  // Also merge local users (covers accounts created while offline)
  if (remoteOk) {
    const locals = localGetUsers();
    for (const l of locals) {
      if (!users.find((u) => u.email === l.email)) users.push(l);
    }
  }

  const found = users.find((u) => u.email === normalizedEmail);
  if (!found) return { error: "No encontramos una cuenta con ese correo." };
  if (found._pw !== btoa(password + found.id)) return { error: "Contraseña incorrecta. Intenta de nuevo." };

  const clean: User = { id: found.id, name: found.name, email: found.email, role: found.role, createdAt: found.createdAt, avatar: found.avatar };
  localStorage.setItem(SESSION_KEY, JSON.stringify(clean));
  return { user: clean };
}

// ── Session ───────────────────────────────────────────────────────────────────
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
