"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import UserAvatar from "./UserAvatar";

interface MessageData {
  id: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  };
  createdAt: string;
}

interface TypingUser {
  id: string;
  name: string;
}

interface ChatWindowProps {
  messages: MessageData[];
  currentUserId: string;
  isGroupChat: boolean;
  locale: string;
  typingUsers: TypingUser[];
}

export default function ChatWindow({
  messages,
  currentUserId,
  isGroupChat,
  locale,
  typingUsers,
}: ChatWindowProps) {
  const t = useTranslations("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const handleTranslate = async (msgId: string, content: string) => {
    // Toggle off if already translated
    if (translatedTexts[msgId]) {
      setTranslatedTexts((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }

    setTranslatingIds((prev) => new Set(prev).add(msgId));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, targetLanguage: locale }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedTexts((prev) => ({ ...prev, [msgId]: data.translatedText }));
      }
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  };

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p>{t("noMessages")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => {
        const isMine = msg.sender.id === currentUserId;
        const isTranslating = translatingIds.has(msg.id);
        const translated = translatedTexts[msg.id];

        return (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
          >
            {!isMine && (
              <UserAvatar
                name={msg.sender.name}
                avatar={msg.sender.avatar}
                role={msg.sender.role}
                size="sm"
              />
            )}
            <div className="max-w-[70%]">
              {!isMine && isGroupChat && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  {msg.sender.name}
                </p>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl ${
                  isMine
                    ? "bg-teal-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm"
                }`}
              >
                {/* Attachment */}
                {msg.attachmentUrl && (
                  <div className="mb-1">
                    {msg.attachmentType?.startsWith("image/") ? (
                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={msg.attachmentUrl}
                          alt={msg.attachmentName || "Image"}
                          className="max-w-full max-h-60 rounded-lg object-contain"
                        />
                      </a>
                    ) : (
                      <a
                        href={msg.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          isMine
                            ? "bg-teal-700/50 hover:bg-teal-700/70"
                            : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        } transition-colors`}
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">{msg.attachmentName || "File"}</span>
                      </a>
                    )}
                  </div>
                )}
                {msg.content && (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                {translated && (
                  <div className={`mt-2 pt-2 border-t ${isMine ? "border-teal-500/40" : "border-gray-300 dark:border-gray-600"}`}>
                    <p className={`text-[10px] uppercase tracking-wide mb-0.5 ${isMine ? "text-teal-200" : "text-gray-400 dark:text-gray-500"}`}>
                      {t("translated")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{translated}</p>
                  </div>
                )}
                <p
                  className={`text-xs mt-1 ${
                    isMine ? "text-teal-200" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {/* Translate button */}
              <button
                onClick={() => handleTranslate(msg.id, msg.content)}
                disabled={isTranslating}
                className={`mt-1 flex items-center gap-1 text-xs transition-colors ${
                  isMine
                    ? "ml-auto text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                    : "text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                } disabled:opacity-50`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {isTranslating ? t("translating") : translated ? t("translated") : t("translate")}
              </button>
            </div>
          </div>
        );
      })}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-end gap-2 justify-start">
          <UserAvatar
            name={typingUsers[0].name}
            size="sm"
          />
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
            {isGroupChat && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {typingUsers.map((u) => u.name).join(", ")}
              </p>
            )}
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
