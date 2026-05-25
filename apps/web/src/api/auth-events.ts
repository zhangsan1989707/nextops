type AuthExpiredListener = () => void;

const listeners = new Set<AuthExpiredListener>();

export function onAuthExpired(listener: AuthExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyAuthExpired(): void {
  localStorage.removeItem("nextops_token");
  localStorage.removeItem("nextops_user");
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.error("[auth-events] listener error:", err);
    }
  }
}

export function isAuthenticated(): boolean {
  try {
    return !!localStorage.getItem("nextops_token");
  } catch {
    return false;
  }
}