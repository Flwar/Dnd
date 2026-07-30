"use client";

import { ChevronDown, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { ui } from "@/lib/i18n";

type ChatMessage = { speaker: string; text: string };

export function ChatPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([...ui.chat.messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { speaker: ui.character.name, text },
    ]);
    setDraft("");
  };

  if (collapsed) {
    return (
      <button
        type="button"
        className="chat-collapsed"
        onClick={() => setCollapsed(false)}
        aria-label={ui.chat.title}
      >
        <MessageCircle aria-hidden="true" />
        <span>{ui.chat.title}</span>
        <bdi>{messages.length}</bdi>
      </button>
    );
  }

  return (
    <section className="chat-panel" aria-label={ui.chat.title}>
      <header>
        <span>
          <MessageCircle aria-hidden="true" />
          {ui.chat.title}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={ui.chat.collapse}
          title={ui.chat.collapse}
        >
          <ChevronDown aria-hidden="true" />
        </button>
      </header>
      <div className="chat-messages" aria-live="polite">
        {messages.slice(-4).map((message, index) => (
          <p key={`${message.speaker}-${index}`}>
            <strong>{message.speaker}:</strong>{" "}
            <bdi dir="auto">{message.text}</bdi>
          </p>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={ui.chat.placeholder}
          aria-label={ui.chat.placeholder}
          dir="auto"
        />
        <button type="submit" aria-label={ui.chat.send} title={ui.chat.send}>
          <Send aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
