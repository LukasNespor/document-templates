"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, AlertCircle, Lock, User } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const router = useRouter();

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(value)) {
      setUsernameError("Uživatelské jméno může obsahovat pouze písmena, čísla, tečku, podtržítko a pomlčku");
    } else {
      setUsernameError("");
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    validateUsername(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Zadejte uživatelské jméno a heslo");
      return;
    }

    if (usernameError) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Přihlášení se nezdařilo");
        return;
      }

      // Redirect to home page on success
      router.push("/");
    } catch (err) {
      setError("Chyba při přihlašování. Zkuste to prosím znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center">Šablony dokumentů</h1>
            <p className="text-blue-100 text-center mt-2">
              Přihlášení do aplikace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-5">
              {/* Username field */}
              <div suppressHydrationWarning>
                <label
                  htmlFor="username"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <User className="w-4 h-4 text-blue-600" />
                  Uživatelské jméno
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    usernameError
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Zadejte uživatelské jméno"
                  disabled={isLoading}
                  autoComplete="username"
                  autoFocus
                />
                {usernameError && (
                  <p className="text-xs text-red-600 mt-1">{usernameError}</p>
                )}
              </div>

              {/* Password field */}
              <div suppressHydrationWarning>
                <label
                  htmlFor="password"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <Lock className="w-4 h-4 text-blue-600" />
                  Heslo
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Zadejte heslo"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || !username || !password || !!usernameError}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Přihlašuji...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Přihlásit se
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Aplikace pro generování dokumentů ze šablon
        </p>
      </div>
    </div>
  );
}
