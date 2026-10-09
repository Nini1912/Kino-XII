import { useCallback, useEffect, useState } from "react";

import { authApi } from "../api/authApi";
import { AuthContext } from "./authContext";

const TOKEN_KEY = "kino_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const [user, setUser] = useState(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const [isInitializing, setIsInitializing] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  const openLogin = useCallback(() => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const openRegister = useCallback(() => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  }, []);

  const closeRegister = useCallback(() => {
    setIsRegisterOpen(false);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      if (!token) {
        setUser(null);
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);

      try {
        const response = await authApi.me();

        if (active) {
          setUser(response.user ?? response);
        }
      } catch (error) {
        if (active) {
          if (error.response?.status === 401) {
            clearSession();
          } else {
            console.error("Failed to load user:", error);
          }
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [token, clearSession]);

  useEffect(() => {
    function handleAuthRequired() {
      openLogin();
    }

    window.addEventListener("auth:required", handleAuthRequired);

    return () => {
      window.removeEventListener("auth:required", handleAuthRequired);
    };
  }, [openLogin]);

  const login = async (credentials) => {
    const response = await authApi.login(credentials);

    const accessToken =
      response.token ?? response.accessToken ?? response.access_token;

    if (!accessToken) {
      throw new Error("Login response did not contain an access token.");
    }

    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);

    const currentUser = response.user ?? (await authApi.me());

    setUser(currentUser.user ?? currentUser);

    closeLogin();
    closeRegister();

    return currentUser;
  };

  const register = async (payload) => {
    const response = await authApi.register(payload);

    const accessToken =
      response.token ?? response.accessToken ?? response.access_token;

    if (accessToken) {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);

      const currentUser = response.user ?? (await authApi.me());

      setUser(currentUser.user ?? currentUser);
      closeRegister();
    } else {
      closeRegister();
      openLogin();
    }

    return response;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isInitializing,

        isLoginOpen,
        openLogin,
        closeLogin,

        isRegisterOpen,
        openRegister,
        closeRegister,

        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
