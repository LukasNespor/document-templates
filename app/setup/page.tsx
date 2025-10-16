"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Loader2, AlertCircle, Lock, User, CheckCircle } from "lucide-react";

export default function SetupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if setup is needed
    const checkSetup = async () => {
      try {
        const response = await fetch("/api/setup/check");
        const data = await response.json();

        if (!data.setupNeeded) {
          // Setup already completed, redirect to login
          router.push("/login");
        }
      } catch (err) {
        console.error("Error checking setup status:", err);
        setError("Nepodařilo se zkontrolovat stav aplikace");
      } finally {
        setIsCheckingSetup(false);
      }
    };

    checkSetup();
  }, [router]);

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("");
      return;
    }

    if (value.length < 3) {
      setUsernameError("Uživatelské jméno musí mít alespoň 3 znaky");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(value)) {
      setUsernameError("Uživatelské jméno může obsahovat pouze písmena, čísla, tečku, podtržítko a pomlčku");
    } else {
      setUsernameError("");
    }
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("");
      return;
    }

    if (value.length < 6) {
      setPasswordError("Heslo musí mít alespoň 6 znaků");
    } else {
      setPasswordError("");
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    validateUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    validatePassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirmPassword) {
      setError("Vyplňte všechna pole");
      return;
    }

    if (usernameError || passwordError) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Hesla se neshodují");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/setup/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Inicializace se nezdařila");
        return;
      }

      // Redirect to login page on success
      router.push("/login");
    } catch (err) {
      setError("Chyba při inicializaci. Zkuste to prosím znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Kontroluji stav aplikace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-white/20 p-3 rounded-xl">
                <Settings className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center">Počáteční nastavení</h1>
            <p className="text-green-100 text-center mt-2">
              Vytvořte prvního administrátora
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            <div className="space-y-5">
              {/* Info message */}
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Vítejte v aplikaci Šablony dokumentů!</p>
                  <p className="mt-1">Tato stránka je přístupná pouze jednou. Vytvořte první účet administrátora.</p>
                </div>
              </div>

              {/* Username field */}
              <div suppressHydrationWarning>
                <label
                  htmlFor="username"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <User className="w-4 h-4 text-green-600" />
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
                      : "border-gray-300 focus:ring-green-500"
                  }`}
                  placeholder="Zadejte uživatelské jméno (min. 3 znaky)"
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
                  <Lock className="w-4 h-4 text-green-600" />
                  Heslo
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    passwordError
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-green-500"
                  }`}
                  placeholder="Zadejte heslo (min. 6 znaků)"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
              </div>

              {/* Confirm Password field */}
              <div suppressHydrationWarning>
                <label
                  htmlFor="confirmPassword"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Potvrzení hesla
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Zadejte heslo znovu"
                  disabled={isLoading}
                  autoComplete="new-password"
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
                disabled={
                  isLoading ||
                  !username ||
                  !password ||
                  !confirmPassword ||
                  !!usernameError ||
                  !!passwordError
                }
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vytvářím účet...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Vytvořit účet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Po vytvoření účtu budete přesměrováni na přihlášení
        </p>
      </div>
    </div>
  );
}
