"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import UserAvatar from "./UserAvatar";

interface UserResult {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

interface NewConversationModalProps {
  onClose: () => void;
  onStartConversation: (userId: string) => void;
}

export default function NewConversationModal({
  onClose,
  onStartConversation,
}: NewConversationModalProps) {
  const t = useTranslations("chat");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Show providers first when no search query
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const res = await fetch(`/api/users?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // Sort providers to the top
          const sorted = [...data.users].sort((a: UserResult, b: UserResult) => {
            if (a.role === "PROVIDER" && b.role !== "PROVIDER") return -1;
            if (a.role !== "PROVIDER" && b.role === "PROVIDER") return 1;
            return 0;
          });
          setUsers(sorted);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("newConversation")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchUsers")}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading && (
            <div className="flex justify-center py-4">
              <svg className="animate-spin w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
          {!loading && users.length === 0 && (
            <p className="text-center text-gray-500 py-4">{t("noUsers")}</p>
          )}
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onStartConversation(user.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <UserAvatar name={user.name} avatar={user.avatar} role={user.role} />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    user.role === "PROVIDER"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {user.role === "PROVIDER" ? t("provider") : t("patient")}
                </span>
              </div>
              <span className="ml-auto text-sm text-teal-600 font-medium">
                {t("startConversation")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
