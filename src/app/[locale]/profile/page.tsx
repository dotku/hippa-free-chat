"use client";

import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  createdAt: string;
  _count: {
    messages: number;
    blockedMessages: number;
    conversations: number;
  };
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const t = useTranslations("profile");
  const tNav = useTranslations("nav");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/login?returnTo=/${locale}/profile`);
    }
  }, [user, authLoading, router, locale]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        setEditName(data.profile?.name || "");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => (prev ? { ...prev, ...data.profile } : prev));
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <svg
          className="animate-spin w-8 h-8 text-teal-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (!user || !profile) return null;

  const roleLabel =
    profile.role === "PROVIDER"
      ? t("provider")
      : profile.role === "ADMIN"
        ? t("admin")
        : t("patient");

  const roleBadgeClass =
    profile.role === "PROVIDER"
      ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
      : profile.role === "ADMIN"
        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/chat`} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            {t("title")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href="/auth/logout"
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {tNav("logout")}
          </a>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar & Name */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={profile.name}
              avatar={profile.avatar}
              role={profile.role}
              size="lg"
            />
            <div className="flex-1">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") {
                        setEditing(false);
                        setEditName(profile.name);
                      }
                    }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    {saving ? t("saving") : t("save")}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditName(profile.name);
                    }}
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm"
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {profile.name}
                  </h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title={t("editName")}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {profile.email}
              </p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${roleBadgeClass}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile._count.conversations}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("conversations")}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile._count.messages}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("messagesSent")}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {profile._count.blockedMessages}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("blocked")}
            </p>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
            {t("accountInfo")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("email")}</span>
              <span className="text-sm text-gray-900 dark:text-white">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("role")}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass}`}>
                {roleLabel}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t("memberSince")}</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {new Date(profile.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
