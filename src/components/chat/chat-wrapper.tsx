import Chat from "./chat";
import FloatingChatWidget from "./floating-chat-widget";

interface ChatWrapperProps {
  botSlug: string;
  variant?: "inline" | "floating";
  isInternal?: boolean;
  source?: string;
  sourceDetail?: Record<string, unknown>;
  autoFocusInput?: boolean;
}

export default function ChatWrapper({
  botSlug,
  variant = "inline",
  isInternal = false,
  source,
  sourceDetail,
  autoFocusInput = true,
}: ChatWrapperProps) {
  if (variant === "floating") {
    return (
      <FloatingChatWidget
        botSlug={botSlug}
        source={source}
        sourceDetail={sourceDetail}
      />
    );
  }
  return (
    <Chat
      botSlug={botSlug}
      isInternal={isInternal}
      source={source}
      sourceDetail={sourceDetail}
      autoFocusInput={autoFocusInput}
    />
  );
}
