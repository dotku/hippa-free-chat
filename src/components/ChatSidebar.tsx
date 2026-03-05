"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import UserAvatar from "./UserAvatar";

interface Participant {
  user: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  };
}

interface Conversation {
  id: string;
  name: string | null;
  participants: Participant[];
  messages: {
    content: string;
    sender: { id: string; name: string };
    createdAt: string;
  }[];
  updatedAt: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onBack?: () => void;
  showMobile: boolean;
}

export default function ChatSidebar({
  conversations,
  currentUserId,
  selectedId,
  onSelect,
  onNewConversation,
  showMobile,
}: ChatSidebarProps) {
  const t = useTranslations("chat");
  const [search, setSearch] = useState("");

  const getOtherParticipants = (conv: Conversation) => {
    return conv.participants
      .filter((p) => p.user.id !== currentUserId)
      .map((p) => p.user);
  };

  const getDisplayName = (conv: Conversation) => {
    const others = getOtherParticipants(conv);
    if (others.length === 0) return "Unknown";
    if (others.length === 1) return others[0].name;
    return `${others[0].name} +${others.length - 1}`;
  };

  const filtered = conversations.filter((conv) => {
    if (!search) return true;
    const others = getOtherParticipants(conv);
    return others.some((u) =>
      u.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div
      className={`${
        showMobile ? "flex" : "hidden md:flex"
      } flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-full`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("conversations")}
          </h2>
          <button
            onClick={onNewConversation}
            className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
            title={t("newConversation")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchUsers")}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => {
          const others = getOtherParticipants(conv);
          const isGroup = conv.participants.length > 2;
          const displayName = getDisplayName(conv);
          const lastMessage = conv.messages[0];
          const isSelected = conv.id === selectedId;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                isSelected
                  ? "bg-teal-50 dark:bg-teal-900/20 border-r-2 border-teal-600"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {isGroup ? (
                <div className="relative w-10 h-10 shrink-0">
                  <div className="absolute top-0 left-0">
                    <UserAvatar
                      name={others[0]?.name || ""}
                      avatar={others[0]?.avatar}
                      role={others[0]?.role}
                      size="sm"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-gray-900 rounded-full">
                    <UserAvatar
                      name={others[1]?.name || ""}
                      avatar={others[1]?.avatar}
                      role={others[1]?.role}
                      size="sm"
                    />
                  </div>
                </div>
              ) : (
                <UserAvatar
                  name={others[0]?.name || "Unknown"}
                  avatar={others[0]?.avatar}
                  role={others[0]?.role}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  {lastMessage && (
                    <span className="text-xs text-gray-500">
                      {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isGroup ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {t("participants")} {conv.participants.length}
                    </span>
                  ) : (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        others[0]?.role === "PROVIDER"
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {others[0]?.role === "PROVIDER" ? t("provider") : t("patient")}
                    </span>
                  )}
                  {lastMessage && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
