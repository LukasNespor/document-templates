"use client";

import { useState, useRef, useEffect } from "react";
import { Users, X, Plus, Trash2, LockKeyhole, AlertCircle, Loader2, UserCheck, Shield, Pencil, FileSpreadsheet } from "lucide-react";
import {
  validateUsernameClient,
  validatePasswordClient,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/validation-client";

interface User {
  id: string;
  username: string;
  createdAt: string;
  salutation?: string;
  isAdmin?: boolean;
  canBulkGenerate?: boolean;
}

interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function UserManagementDialog({
  isOpen,
  onClose,
  currentUserId,
}: UserManagementDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState<string | null>(null);

  // Add user form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSalutation, setNewSalutation] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newCanBulkGenerate, setNewCanBulkGenerate] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUsernameError, setNewUsernameError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");

  // Password form state
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

  // Edit user form state
  const [editUsername, setEditUsername] = useState("");
  const [editSalutation, setEditSalutation] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editCanBulkGenerate, setEditCanBulkGenerate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsernameError, setEditUsernameError] = useState("");

  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Nepodařilo se načíst seznam uživatelů");
      }
      const data = await response.json();
      // Sort users: admins first, then alphabetically by username
      const sortedUsers = data.users.sort((a: User, b: User) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return a.username.localeCompare(b.username);
      });
      setUsers(sortedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při načítání uživatelů");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewUsernameChange = (value: string) => {
    setNewUsername(value);
    const validation = validateUsernameClient(value);
    if (!validation.isValid) {
      setNewUsernameError(validation.error || "Neplatné uživatelské jméno");
    } else {
      setNewUsernameError("");
    }
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    const validation = validatePasswordClient(value);
    if (!validation.isValid) {
      setNewPasswordError(validation.error || "Neplatné heslo");
    } else {
      setNewPasswordError("");
    }
  };

  const handleEditUsernameChange = (value: string) => {
    setEditUsername(value);
    const validation = validateUsernameClient(value);
    if (!validation.isValid) {
      setEditUsernameError(validation.error || "Neplatné uživatelské jméno");
    } else {
      setEditUsernameError("");
    }
  };

  const handleChangePasswordValueChange = (value: string) => {
    setNewPasswordValue(value);
    const validation = validatePasswordClient(value);
    if (!validation.isValid) {
      setChangePasswordError(validation.error || "Neplatné heslo");
    } else {
      setChangePasswordError("");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate before submission
    const usernameValidation = validateUsernameClient(newUsername);
    if (!usernameValidation.isValid) {
      setError(usernameValidation.error || "Neplatné uživatelské jméno");
      return;
    }

    const passwordValidation = validatePasswordClient(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || "Neplatné heslo");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          salutation: newSalutation || undefined,
          isAdmin: newIsAdmin,
          canBulkGenerate: newCanBulkGenerate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepodařilo se vytvořit uživatele");
      }

      // Reset form and reload users
      setNewUsername("");
      setNewPassword("");
      setNewSalutation("");
      setNewIsAdmin(false);
      setNewCanBulkGenerate(false);
      setNewUsernameError("");
      setNewPasswordError("");
      setShowAddForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při vytváření uživatele");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string, isAdmin?: boolean) => {
    if (isAdmin) {
      setError("Nelze smazat administrátora");
      return;
    }

    if (!confirm(`Opravdu chcete smazat uživatele "${username}"?`)) {
      return;
    }

    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepodařilo se smazat uživatele");
      }

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při mazání uživatele");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate before submission
    const validation = validatePasswordClient(newPasswordValue);
    if (!validation.isValid) {
      setError(validation.error || "Neplatné heslo");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`/api/admin/users/${showPasswordForm}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepodařilo se změnit heslo");
      }

      setNewPasswordValue("");
      setChangePasswordError("");
      setShowPasswordForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při změně hesla");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEditUser = (user: User) => {
    if (showEditForm === user.id) {
      // Toggle off if clicking the same user
      setShowEditForm(null);
      setEditUsername("");
      setEditSalutation("");
      setEditIsAdmin(false);
      setEditCanBulkGenerate(false);
      setEditUsernameError("");
    } else {
      // Close password form if open
      setShowPasswordForm(null);
      setNewPasswordValue("");
      setChangePasswordError("");
      // Open edit form
      setEditUsername(user.username);
      setEditSalutation(user.salutation || "");
      setEditIsAdmin(user.isAdmin || false);
      setEditCanBulkGenerate(user.canBulkGenerate || false);
      setEditUsernameError(""); // Reset error when opening edit form
      setShowEditForm(user.id);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // If editing own profile, only send permissions
    const isEditingSelf = showEditForm === currentUserId;

    // Validate username only if editing other users
    if (!isEditingSelf) {
      const validation = validateUsernameClient(editUsername);
      if (!validation.isValid) {
        setError(validation.error || "Neplatné uživatelské jméno");
        return;
      }
    }

    setIsEditing(true);
    try {
      const payload = isEditingSelf
        ? {
            // When editing self, only send permissions
            isAdmin: editIsAdmin,
            canBulkGenerate: editCanBulkGenerate,
          }
        : {
            // When editing others, send all fields
            username: editUsername,
            salutation: editSalutation || undefined,
            isAdmin: editIsAdmin,
            canBulkGenerate: editCanBulkGenerate,
          };

      const response = await fetch(`/api/admin/users/${showEditForm}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepodařilo se aktualizovat uživatele");
      }

      setEditUsername("");
      setEditSalutation("");
      setEditIsAdmin(false);
      setEditCanBulkGenerate(false);
      setEditUsernameError("");
      setShowEditForm(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při aktualizaci uživatele");
    } finally {
      setIsEditing(false);
    }
  };

  const handleClose = () => {
    if (!isAdding && !isChangingPassword && !isEditing) {
      setShowAddForm(false);
      setShowPasswordForm(null);
      setShowEditForm(null);
      setNewUsername("");
      setNewPassword("");
      setNewSalutation("");
      setNewIsAdmin(false);
      setNewCanBulkGenerate(false);
      setNewUsernameError("");
      setNewPasswordError("");
      setNewPasswordValue("");
      setChangePasswordError("");
      setEditUsername("");
      setEditSalutation("");
      setEditIsAdmin(false);
      setEditCanBulkGenerate(false);
      setEditUsernameError("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

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
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
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
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">
                Správa uživatelů
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isAdding || isChangingPassword || isEditing}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 py-6 flex-1">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 mb-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Add User Form */}
            {showAddForm && (
              <form onSubmit={handleAddUser} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                {/* Hidden dummy fields to prevent autofill */}
                <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

                <h3 className="text-lg font-semibold text-gray-800 mb-4">Přidat nového uživatele</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Uživatelské jméno *
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => handleNewUsernameChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        newUsernameError
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="např. novak"
                      disabled={isAdding}
                      required
                      minLength={MIN_USERNAME_LENGTH}
                      maxLength={MAX_USERNAME_LENGTH}
                      autoComplete="new-username"
                    />
                    {newUsernameError && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {newUsernameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Heslo *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => handleNewPasswordChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        newPasswordError
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="********"
                      disabled={isAdding}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      maxLength={MAX_PASSWORD_LENGTH}
                      autoComplete="new-password"
                    />
                    {newPasswordError && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {newPasswordError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">
                      Oslovení
                    </label>
                    <input
                      type="text"
                      value={newSalutation}
                      onChange={(e) => setNewSalutation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="např. Pane/Paní"
                      disabled={isAdding}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={newIsAdmin}
                      onChange={(e) => setNewIsAdmin(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isAdding}
                    />
                    <label htmlFor="isAdmin" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Administrátor
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="canBulkGenerate"
                      checked={newCanBulkGenerate}
                      onChange={(e) => setNewCanBulkGenerate(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      disabled={isAdding}
                    />
                    <label htmlFor="canBulkGenerate" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Hromadné generování z CSV
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewUsername("");
                      setNewPassword("");
                      setNewSalutation("");
                      setNewIsAdmin(false);
                      setNewCanBulkGenerate(false);
                      setNewUsernameError("");
                      setNewPasswordError("");
                    }}
                    disabled={isAdding}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding || !newUsername || !newPassword || !!newUsernameError || !!newPasswordError}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Vytvářím...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Vytvořit
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Users List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id}>
                    <div
                      className={`border rounded-lg p-4 ${
                        user.id === currentUserId ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
                      } ${(showEditForm === user.id || showPasswordForm === user.id) ? "rounded-b-none border-b-0" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{user.username}</h3>
                            {user.isAdmin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                            {user.id === currentUserId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <UserCheck className="w-3 h-3" />
                                Vy
                              </span>
                            )}
                          </div>
                          {user.salutation && (
                            <p className="text-sm text-gray-600 mt-1">Oslovení: {user.salutation}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Vytvořeno: {new Date(user.createdAt).toLocaleDateString("cs-CZ")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className={`p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${
                              showEditForm === user.id ? "bg-blue-100" : ""
                            }`}
                            title={user.id === currentUserId ? "Upravit oprávnění" : "Upravit uživatele"}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          {user.id !== currentUserId && (
                            <>
                              <button
                                onClick={() => {
                                  if (showPasswordForm === user.id) {
                                    // Toggle off if clicking the same user
                                    setShowPasswordForm(null);
                                    setNewPasswordValue("");
                                  } else {
                                    // Close edit form if open
                                    setShowEditForm(null);
                                    setEditUsername("");
                                    setEditSalutation("");
                                    setEditIsAdmin(false);
                                    setEditCanBulkGenerate(false);
                                    setEditUsernameError("");
                                    // Open password form
                                    setShowPasswordForm(user.id);
                                  }
                                }}
                                className={`p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors ${
                                  showPasswordForm === user.id ? "bg-amber-100" : ""
                                }`}
                                title="Změnit heslo"
                              >
                                <LockKeyhole className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.username, user.isAdmin)}
                                disabled={user.isAdmin}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={user.isAdmin ? "Nelze smazat administrátora" : "Smazat uživatele"}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit User Form - Inline */}
                    {showEditForm === user.id && (
                      <form onSubmit={handleEditSubmit} className="bg-blue-50 border border-blue-200 rounded-b-lg p-4 mb-2">
                        {/* Hidden dummy fields to prevent autofill */}
                        <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                        <div className="space-y-3">
                          {showEditForm !== currentUserId && (
                            <>
                              <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                                  Uživatelské jméno *
                                </label>
                                <input
                                  type="text"
                                  value={editUsername}
                                  onChange={(e) => handleEditUsernameChange(e.target.value)}
                                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                    editUsernameError
                                      ? "border-red-500 focus:ring-red-500"
                                      : "border-gray-300 focus:ring-blue-500"
                                  }`}
                                  placeholder="např. novak"
                                  disabled={isEditing}
                                  required
                                  minLength={MIN_USERNAME_LENGTH}
                                  maxLength={MAX_USERNAME_LENGTH}
                                  autoComplete="new-username"
                                />
                                {editUsernameError && (
                                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {editUsernameError}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                                  Oslovení
                                </label>
                                <input
                                  type="text"
                                  value={editSalutation}
                                  onChange={(e) => setEditSalutation(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="např. Pane/Paní"
                                  disabled={isEditing}
                                />
                              </div>
                            </>
                          )}
                          {showEditForm === currentUserId && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                              <p className="text-sm text-blue-800">
                                <strong>Poznámka:</strong> Své uživatelské jméno, oslovení a heslo můžete změnit ve svém profilu kliknutím na své jméno v horním menu.
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`editIsAdmin-${user.id}`}
                              checked={editIsAdmin}
                              onChange={(e) => setEditIsAdmin(e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              disabled={isEditing || (showEditForm === currentUserId && user.isAdmin)}
                            />
                            <label htmlFor={`editIsAdmin-${user.id}`} className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                              <Shield className="w-4 h-4 text-blue-600" />
                              Administrátor
                              {showEditForm === currentUserId && user.isAdmin && (
                                <span className="text-xs text-gray-500">(nemůžete si odebrat)</span>
                              )}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`editCanBulkGenerate-${user.id}`}
                              checked={editCanBulkGenerate}
                              onChange={(e) => setEditCanBulkGenerate(e.target.checked)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              disabled={isEditing}
                            />
                            <label htmlFor={`editCanBulkGenerate-${user.id}`} className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                              Hromadné generování z CSV
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditForm(null);
                              setEditUsername("");
                              setEditSalutation("");
                              setEditIsAdmin(false);
                              setEditCanBulkGenerate(false);
                              setEditUsernameError("");
                            }}
                            disabled={isEditing}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                          >
                            Zrušit
                          </button>
                          <button
                            type="submit"
                            disabled={isEditing || !editUsername || !!editUsernameError}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {isEditing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Ukládám...
                              </>
                            ) : (
                              <>
                                <Pencil className="w-4 h-4" />
                                Uložit změny
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Password Change Form - Inline */}
                    {showPasswordForm === user.id && (
                      <form onSubmit={handleChangePassword} className="bg-amber-50 border border-amber-200 rounded-b-lg p-4 mb-2">
                        {/* Hidden dummy fields to prevent autofill */}
                        <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-1 block">
                            Nové heslo *
                          </label>
                          <input
                            type="password"
                            value={newPasswordValue}
                            onChange={(e) => handleChangePasswordValueChange(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                              changePasswordError
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-amber-500"
                            }`}
                            placeholder="********"
                            disabled={isChangingPassword}
                            required
                            minLength={MIN_PASSWORD_LENGTH}
                            maxLength={MAX_PASSWORD_LENGTH}
                            autoComplete="new-password"
                          />
                          {changePasswordError && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {changePasswordError}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(null);
                              setNewPasswordValue("");
                              setChangePasswordError("");
                            }}
                            disabled={isChangingPassword}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                          >
                            Zrušit
                          </button>
                          <button
                            type="submit"
                            disabled={isChangingPassword || !newPasswordValue || !!changePasswordError}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {isChangingPassword ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Měním...
                              </>
                            ) : (
                              <>
                                <LockKeyhole className="w-4 h-4" />
                                Změnit heslo
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
            <button
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm || isAdding}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Přidat uživatele
            </button>
            <button
              onClick={handleClose}
              disabled={isAdding || isChangingPassword || isEditing}
              className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
            >
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
