import { Suspense } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";

export const metadata = {
  title: "Chat — PitchMeAI",
  description: "Chat with your AI job application assistant",
};

export default function ChatPage() {
  return (
    <Suspense>
      <ChatLayout />
    </Suspense>
  );
}
