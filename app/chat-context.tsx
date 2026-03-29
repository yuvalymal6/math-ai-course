"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ChatCtxType = {
  isOpen: boolean;
  topic: string;
  openChat: (topic?: string) => void;
  closeChat: () => void;
};

export const ChatContext = createContext<ChatCtxType>({
  isOpen: false,
  topic: "",
  openChat: () => {},
  closeChat: () => {},
});

export const useChat = () => useContext(ChatContext);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState("");

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        topic,
        openChat: (t = "") => { setTopic(t); setIsOpen(true); },
        closeChat: () => setIsOpen(false),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
