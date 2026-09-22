import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, login as loginRequest, type UserOut } from "../api/auth";
import { permissionsApi } from "../api/permissions";

interface AuthContextValue {
  user: UserOut | null;
  token: string | null;
  loading: boolean;
  features: string[];
  hasFeature: (feature: string) => boolean;
  login: (username: string, password: string) => Promise<UserOut>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_STORAGE_KEY = "parcelo_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<UserOut | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getMe(token)
      .then(async (me) => {
        setUser(me);
        try {
          setFeatures(await permissionsApi.getMyFeatures(token));
        } catch {
          setFeatures([]);
        }
      })
      .catch(() => {
        setToken(null);
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          /* ignore storage errors */
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(username: string, password: string) {
    const response = await loginRequest(username, password);
    setToken(response.access_token);
    setUser(response.user);
    try {
      setFeatures(await permissionsApi.getMyFeatures(response.access_token));
    } catch {
      setFeatures([]);
    }
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
    } catch {
      /* ignore storage errors */
    }
    return response.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    setFeatures([]);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
  }

  function hasFeature(feature: string) {
    return user?.role === "owner" || features.includes(feature);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, features, hasFeature, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
