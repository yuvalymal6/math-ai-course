"use client";

import { type ReactNode } from "react";
import { ChatProvider } from "./chat-context";
import { ChatDrawer } from "./components/ChatDrawer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChatProvider>
      {children}
      <ChatDrawer />
    </ChatProvider>
  );
}
