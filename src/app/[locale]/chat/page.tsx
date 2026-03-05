"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import ChatSidebar from "@/components/ChatSidebar";
import ChatWindow from "@/components/ChatWindow";
import MessageInput from "@/components/MessageInput";
import BlockedAlert from "@/components/BlockedAlert";
import NewConversationModal from "@/components/NewConversationModal";
import AddProviderModal from "@/components/AddProviderModal";
import CaseIntakeForm from "@/components/CaseIntakeForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

interface Message {
  id: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  sender: { id: string; name: string; avatar: string | null; role: string };
  createdAt: string;
}

interface Conversation {
  id: string;
  name: string | null;
  participants: {
    user: { id: string; name: string; avatar: string | null; role: string };
  }[];
  messages: {
    content: string;
    sender: { id: string; name: string };
    createdAt: string;
  }[];
  updatedAt: string;
}

export default function ChatPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("chat");
  const tNav = useTranslations("nav");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [blockedAlert, setBlockedAlert] = useState<{
    reason: string;
    categories: string[];
  } | null>(null);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [typingUsersMap, setTypingUsersMap] = useState<
    Map<string, { name: string; timeout: ReturnType<typeof setTimeout> }>
  >(new Map());
  const typingUsersMapRef = useRef(typingUsersMap);
  typingUsersMapRef.current = typingUsersMap;
  const locale = pathname.split("/")[1] || "en";

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/auth/login?returnTo=/${locale}/chat`);
    }
  }, [user, isLoading, router, locale]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
        setCurrentUserId(data.currentUserId);
        if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvId) return;
    const loadMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages?conversationId=${selectedConvId}`
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch {
        // ignore
      }
    };
    loadMessages();
  }, [selectedConvId]);

  // Pusher subscription
  useEffect(() => {
    if (!selectedConvId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-conversation-${selectedConvId}`);

    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      // Clear typing for the sender
      setTypingUsersMap((prev) => {
        const next = new Map(prev);
        if (next.has(data.sender.id)) {
          clearTimeout(next.get(data.sender.id)!.timeout);
          next.delete(data.sender.id);
        }
        return next;
      });
      loadConversations();
    });

    channel.bind("typing", (data: { userId: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsersMap((prev) => {
          const next = new Map(prev);
          // Clear existing timeout for this user
          if (next.has(data.userId)) {
            clearTimeout(next.get(data.userId)!.timeout);
          }
          // Find user name from conversation participants
          const participant = selectedConvRef.current?.participants.find(
            (p) => p.user.id === data.userId
          );
          const name = participant?.user.name || "...";
          const timeout = setTimeout(() => {
            setTypingUsersMap((p) => {
              const n = new Map(p);
              n.delete(data.userId);
              return n;
            });
          }, 3000);
          next.set(data.userId, { name, timeout });
          return next;
        });
      }
    });

    channel.bind(
      "participant-added",
      (data: { participant: { user: { id: string; name: string; avatar: string | null; role: string } } }) => {
        loadConversations();
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-conversation-${selectedConvId}`);
      // Clear all typing timeouts
      typingUsersMapRef.current.forEach((v) => clearTimeout(v.timeout));
      setTypingUsersMap(new Map());
    };
  }, [selectedConvId, currentUserId, loadConversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    setShowSidebarMobile(false);
  };

  const handleSendMessage = async (content: string, attachment?: { url: string; name: string; type: string }) => {
    if (!selectedConvId) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: selectedConvId,
        content: content || "",
        ...(attachment && {
          attachmentUrl: attachment.url,
          attachmentName: attachment.name,
          attachmentType: attachment.type,
        }),
      }),
    });

    const data = await res.json();

    if (data.blocked) {
      setBlockedAlert({
        reason: data.reason,
        categories: data.categories || [],
      });
      return;
    }

    if (data.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    }
  };

  const handleTyping = useCallback(async () => {
    if (!selectedConvId) return;
    try {
      await fetch("/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConvId }),
      });
    } catch {
      // ignore
    }
  }, [selectedConvId]);

  const handleStartConversation = async (participantId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewConv(false);
        await loadConversations();
        setSelectedConvId(data.conversation.id);
        setShowSidebarMobile(false);
      }
    } catch {
      // ignore
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const selectedConvRef = useRef(selectedConv);
  selectedConvRef.current = selectedConv;
  const otherUsers = selectedConv?.participants
    .filter((p) => p.user.id !== currentUserId)
    .map((p) => p.user) || [];
  const isGroupChat = (selectedConv?.participants.length || 0) > 2;
  const typingUsers = Array.from(typingUsersMap.values()).map((v) => ({
    id: "",
    name: v.name,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <svg className="animate-spin w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top Nav */}
      <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          {!showSidebarMobile && selectedConvId && (
            <button
              onClick={() => setShowSidebarMobile(true)}
              className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm hidden sm:inline">
              HIPAA Free Chat
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href={`/${pathname.split("/")[1] || "en"}/profile`}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300"
            title={tNav("profile")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
          <a
            href="/auth/logout"
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {tNav("logout")}
          </a>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          conversations={conversations}
          currentUserId={currentUserId}
          selectedId={selectedConvId}
          onSelect={handleSelectConversation}
          onNewConversation={() => setShowNewConv(true)}
          showMobile={showSidebarMobile}
        />

        {/* Main Chat */}
        <div
          className={`${
            showSidebarMobile ? "hidden md:flex" : "flex"
          } flex-1 flex-col bg-white dark:bg-gray-900`}
        >
          {selectedConv && otherUsers.length > 0 ? (
            <>
              {/* Chat Header */}
              <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 px-4 shrink-0">
                {isGroupChat ? (
                  <div className="flex -space-x-2">
                    {otherUsers.slice(0, 3).map((u) => (
                      <div key={u.id} className="ring-2 ring-white dark:ring-gray-900 rounded-full">
                        <UserAvatar name={u.name} avatar={u.avatar} role={u.role} size="sm" />
                      </div>
                    ))}
                    {otherUsers.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-900">
                        +{otherUsers.length - 3}
                      </div>
                    )}
                  </div>
                ) : (
                  <UserAvatar
                    name={otherUsers[0].name}
                    avatar={otherUsers[0].avatar}
                    role={otherUsers[0].role}
                    size="sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {isGroupChat
                      ? otherUsers.map((u) => u.name).join(", ")
                      : otherUsers[0].name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isGroupChat
                      ? `${t("participants")} ${selectedConv.participants.length}`
                      : otherUsers[0].role === "PROVIDER"
                        ? t("provider")
                        : t("patient")}
                  </p>
                </div>
                {/* Add Provider button */}
                <button
                  onClick={() => setShowAddProvider(true)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-teal-600 transition-colors"
                  title={t("addProvider")}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </button>
              </div>

              {selectedConvId && (
                <CaseIntakeForm conversationId={selectedConvId} readOnly={currentUserRole === "PROVIDER"} />
              )}

              <ChatWindow
                messages={messages}
                currentUserId={currentUserId}
                isGroupChat={isGroupChat}
                locale={locale}
                typingUsers={typingUsers}
              />
              <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-lg mb-4">{t("noConversation")}</p>
                <button
                  onClick={() => setShowNewConv(true)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {currentUserRole === "PROVIDER" ? t("newConversation") : t("contactProvider")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onStartConversation={handleStartConversation}
        />
      )}
      {showAddProvider && selectedConvId && (
        <AddProviderModal
          conversationId={selectedConvId}
          existingParticipantIds={
            selectedConv?.participants.map((p) => p.user.id) || []
          }
          onClose={() => setShowAddProvider(false)}
          onAdded={() => loadConversations()}
        />
      )}
      {blockedAlert && (
        <BlockedAlert
          reason={blockedAlert.reason}
          categories={blockedAlert.categories}
          onDismiss={() => setBlockedAlert(null)}
        />
      )}
    </div>
  );
}
