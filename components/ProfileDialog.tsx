"use client";

import { useState, useRef } from "react";
import { User, X, Lock, AlertCircle, Loader2, Check, UserCircle } from "lucide-react";

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentSalutation?: string;
  onProfileUpdate: (newUsername: string, newSalutation?: string) => void;
}

export default function ProfileDialog({
  isOpen,
  onClose,
  currentUsername,
  currentSalutation,
  onProfileUpdate,
}: ProfileDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newSalutation, setNewSalutation] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const mouseDownOnBackdrop = useRef(false);

  if (!isOpen) return null;

  // Validate username format
  const validateUsername = (username: string): boolean => {
    if (!username) return true; // Empty is valid (means no change)
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    return usernameRegex.test(username);
  };

  // Check if passwords match
  const validatePasswordMatch = (): boolean => {
    if (!newPassword) return true; // No password change is valid
    if (!confirmPassword) return false; // Confirmation required if new password set
    return newPassword === confirmPassword;
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    if (!currentPassword) return false;
    if (newUsername && !validateUsername(newUsername)) return false;
    if (newPassword && !validatePasswordMatch()) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate current password
    if (!currentPassword) {
      setError("Aktuální heslo je povinné");
      return;
    }

    // Check if at least one field is being changed
    const isSalutationChanged = newSalutation && newSalutation !== (currentSalutation || "");
    const isUsernameChanged = newUsername && newUsername !== currentUsername;
    const isPasswordChanged = newPassword;

    if (!isSalutationChanged && !isUsernameChanged && !isPasswordChanged) {
      setError("Musíte změnit alespoň jedno pole");
      return;
    }

    // Validate password length
    if (newPassword && newPassword.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newSalutation: isSalutationChanged ? newSalutation : undefined,
          newUsername: isUsernameChanged ? newUsername : undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nepodařilo se aktualizovat profil");
      }

      // Show success message
      setSuccess(true);

      // Update parent component with new username and/or salutation if changed
      if (isUsernameChanged || isSalutationChanged) {
        onProfileUpdate(
          isUsernameChanged ? data.user.username : currentUsername,
          isSalutationChanged ? data.user.salutation : currentSalutation
        );
      }

      // Reset form and close after a short delay
      setTimeout(() => {
        setCurrentPassword("");
        setNewSalutation("");
        setNewUsername("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess(false);
        setUsernameError("");
        setPasswordError("");
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se aktualizovat profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentPassword("");
      setNewSalutation("");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess(false);
      setUsernameError("");
      setPasswordError("");
      onClose();
    }
  };

  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    if (value && !validateUsername(value)) {
      setUsernameError("Uživatelské jméno může obsahovat pouze písmena, čísla, tečku, podtržítko a pomlčku");
    } else {
      setUsernameError("");
    }
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    // Check if confirm password needs validation
    if (confirmPassword && value !== confirmPassword) {
      setPasswordError("Hesla se neshodují");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    // Check if passwords match
    if (value && newPassword && value !== newPassword) {
      setPasswordError("Hesla se neshodují");
    } else {
      setPasswordError("");
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      style={{ zIndex: 10000 }}
      onMouseDown={() => { mouseDownOnBackdrop.current = true; }}
      onClick={() => {
        if (mouseDownOnBackdrop.current) {
          handleClose();
        }
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => {
          e.stopPropagation();
          mouseDownOnBackdrop.current = false;
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">
                Změnit profil
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              {/* Salutation */}
              <div>
                <label
                  htmlFor="newSalutation"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <UserCircle className="w-4 h-4 text-blue-600" />
                  Oslovení
                  {currentSalutation && (
                    <span className="ml-auto text-xs text-gray-500 font-normal">
                      Aktuální: {currentSalutation}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  id="newSalutation"
                  value={newSalutation}
                  onChange={(e) => setNewSalutation(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={currentSalutation || "např. Petře, Markéto, pane Nováku"}
                  disabled={isSubmitting}
                />
              </div>

              {/* New Username */}
              <div>
                <label
                  htmlFor="newUsername"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <User className="w-4 h-4 text-blue-600" />
                  Nové uživatelské jméno
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    Aktuální: {currentUsername}
                  </span>
                </label>
                <input
                  type="text"
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    usernameError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                  placeholder="Ponechte prázdné pro nezměněné"
                  disabled={isSubmitting}
                />
                {usernameError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {usernameError}
                  </p>
                )}
              </div>

              {/* Current Password */}
              <div>
                <label
                  htmlFor="currentPassword"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <Lock className="w-4 h-4 text-blue-600" />
                  Aktuální heslo *
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Zadejte aktuální heslo"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <Lock className="w-4 h-4 text-blue-600" />
                  Nové heslo
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ponechte prázdné pro nezměněné"
                  disabled={isSubmitting}
                />
                {newPassword && (
                  <p className="text-xs text-gray-500 mt-1">
                    Minimálně 6 znaků
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              {newPassword && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <Lock className="w-4 h-4 text-blue-600" />
                    Potvrdit nové heslo *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      passwordError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                    }`}
                    placeholder="Zadejte nové heslo znovu"
                    disabled={isSubmitting}
                    required
                  />
                  {passwordError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {passwordError}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Profil byl úspěšně aktualizován</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Uložit změny
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
