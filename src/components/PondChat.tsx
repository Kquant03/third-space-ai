"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  PondChat — bottom-left visitor-to-visitor surface · v2
//  ─────────────────────────────────────────────────────────────────────────
//  Renders on the /limen-pond page only, not site-wide. Visitors who load
//  the pond see who else is sitting beside the water and what they're
//  saying. Each visitor gets a session-sticky handle like
//  "Crepuscular-Heimdall" from visitor-handles.ts on the worker.
//
//  Design register:
//    - Airier glass matching ModeToggle (rgba ghost · low alpha · blur)
//    - Attribution-after message layout — body, then "— Handle · 2m"
//      reads as guestbook inscription not chat-app stream
//    - Muted amber rejection banner instead of saturated red, so it
//      coexists with the pond's cool teal palette
//    - Subtle fade-in for new messages (250ms, opacity + 4px slide)
//    - Custom thin scrollbar in ghost tint
//    - Small ◇ ornament in header echoing the third-space.ai SVG marks
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  ChatMessage,
  ChatRejection,
  UsePondResult,
} from "@/lib/usePond";

interface ColorTokens {
  inkStrong: string;
  inkBody: string;
  inkMuted: string;
  inkFaint: string;
  inkGhost: string;
  ghost: string;
  ghostSoft: string;
}

interface FontTokens {
  display: string;
  body: string;
  mono: string;
}

interface PondChatProps {
  pond: UsePondResult;
  COLOR: ColorTokens;
  FONT: FontTokens;
}

const MAX_INPUT_LENGTH = 200;

// Warm amber for rejection banner — stays in the dark-teal palette
// register but signals "not the main flow" without jarring with red.
const AMBER_TINT = "rgba(180, 140, 90, 0.12)";
const AMBER_BORDER = "rgba(180, 140, 90, 0.28)";
const AMBER_TEXT = "#d4b78a";

export function PondChat({ pond, COLOR, FONT }: PondChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(pond.getChat);
  const [rejection, setRejection] = useState<ChatRejection | null>(
    pond.getLastChatRejection,
  );
  const [yourHandle, setYourHandle] = useState<string | null>(
    pond.getYourHandle,
  );
  const [sessionCount, setSessionCount] = useState<number>(
    pond.getSessionChatCount,
  );
  const [chatTotal, setChatTotal] = useState<number>(pond.getChatTotal);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Hydration gate. PondChat reads from a client-only WebSocket store
  // whose initial state can diverge between server-render and first-
  // client-render (Next.js dev mode can module-cache the store, and the
  // useSyncExternalStore server snapshot isn't always aligned with the
  // client one). To avoid the hydration mismatch on `disabled` and
  // similar derived props, we render nothing until after mount. The
  // chat surface is meaningless on the server anyway — there's no WS.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(messages.length);

  // Subscribe to chat events. On each event, re-pull current state.
  useEffect(() => {
    const unsub = pond.subscribeToChat(() => {
      setMessages(pond.getChat());
      setRejection(pond.getLastChatRejection());
      setYourHandle(pond.getYourHandle());
      setSessionCount(pond.getSessionChatCount());
      setChatTotal(pond.getChatTotal());
    });
    setMessages(pond.getChat());
    setYourHandle(pond.getYourHandle());
    setSessionCount(pond.getSessionChatCount());
    setChatTotal(pond.getChatTotal());
    return unsub;
  }, [pond]);

  // Auto-scroll to bottom on new messages, but only if user is near it.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const newCount = messages.length;
    const grew = newCount > previousMessageCountRef.current;
    previousMessageCountRef.current = newCount;
    if (!grew) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed.length === 0) return;
    pond.sendChat(trimmed);
    setInput("");
  }, [input, pond]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (rejection !== null) pond.clearChatRejection();
      setInput(e.target.value);
    },
    [rejection, pond],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ─── Hydration gate ────────────────────────────────────────────
  // Render nothing on the server and on the first client render. The
  // useEffect above flips `hydrated` after mount, triggering a second
  // render with the real chat surface. Eliminates SSR/client mismatch
  // on disabled/connected/yourHandle-derived props.
  if (!hydrated) return null;

  // ─── Collapsed pill ────────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        <button
          onClick={() => setCollapsed(false)}
          className="pondchat-pill"
          style={{
            position: "fixed",
            left: 24,
            bottom: 24,
            zIndex: 50,
            pointerEvents: "auto",
            padding: "9px 18px",
            borderRadius: 999,
            border: `1px solid ${COLOR.ghost}38`,
            background: "rgba(127,175,179,0.03)",
            backdropFilter: "blur(22px) saturate(1.3)",
            WebkitBackdropFilter: "blur(22px) saturate(1.3)",
            color: COLOR.inkMuted,
            fontFamily: FONT.mono,
            fontSize: 10,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "color 260ms, background 260ms, border-color 260ms",
            boxShadow: "0 10px 40px -22px rgba(127,175,179,0.4)",
          }}
          aria-label="open chat"
        >
          chat · {formatChatCount(chatTotal)}
        </button>
        <style>{`
          .pondchat-pill:hover {
            color: ${COLOR.inkStrong};
            border-color: ${COLOR.ghost}66;
            background: rgba(127,175,179,0.06);
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: 24,
          bottom: 24,
          zIndex: 50,
          pointerEvents: "auto",
          width: 420,
          maxHeight: "min(440px, 65vh)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 12,
          border: `1px solid ${COLOR.ghost}33`,
          background: "rgba(127,175,179,0.025)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          boxShadow:
            "0 24px 60px -28px rgba(127,175,179,0.4), " +
            "inset 0 1px 0 rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        {/* ─── Header ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 16px 10px",
            borderBottom: `1px solid ${COLOR.ghost}14`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: COLOR.inkMuted,
            }}
          >
            <span
              style={{
                color: COLOR.ghost,
                opacity: 0.55,
                fontSize: 10,
                lineHeight: 1,
                transform: "translateY(-1px)",
              }}
            >
              ◇
            </span>
            <span>at the pond</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="pondchat-collapse"
            aria-label="collapse chat"
            style={{
              background: "transparent",
              border: "none",
              color: COLOR.inkGhost,
              fontFamily: FONT.mono,
              fontSize: 14,
              cursor: "pointer",
              padding: "0 4px",
              lineHeight: 1,
              transition: "color 220ms",
            }}
          >
            ─
          </button>
        </div>

        {/* ─── Message list ─────────────────────────────── */}
        <div
          ref={scrollerRef}
          className="pondchat-scroller"
          style={{
            flex: "1 1 auto",
            minHeight: 80,
            overflowY: "auto",
            padding: "14px 16px 6px",
            fontFamily: FONT.body,
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                color: COLOR.inkFaint,
                fontFamily: FONT.body,
                fontSize: 13,
                fontStyle: "italic",
                padding: "10px 0 14px",
                lineHeight: 1.5,
              }}
            >
              the water is quiet.
            </div>
          ) : (
            messages.map((m) => (
              <ChatInscription
                key={m.id}
                message={m}
                isYours={m.handle === yourHandle}
                COLOR={COLOR}
                FONT={FONT}
              />
            ))
          )}
        </div>

        {/* ─── Rejection banner (only when set) ─────────── */}
        {rejection !== null && (
          <div
            style={{
              padding: "9px 16px 10px",
              background: AMBER_TINT,
              borderTop: `1px solid ${AMBER_BORDER}`,
              borderBottom: `1px solid ${AMBER_BORDER}`,
              animation: "pondchat-fadein 320ms ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
                fontFamily: FONT.mono,
                fontSize: 9,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: AMBER_TEXT,
              }}
            >
              <span style={{ flex: "1 1 auto", opacity: 0.85 }}>
                not sent · {rejection.reason}
              </span>
              <button
                onClick={() => pond.clearChatRejection()}
                aria-label="dismiss"
                style={{
                  background: "transparent",
                  border: "none",
                  color: AMBER_TEXT,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  fontFamily: FONT.mono,
                  opacity: 0.7,
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                marginTop: 5,
                fontFamily: FONT.body,
                fontSize: 13,
                fontStyle: "italic",
                color: AMBER_TEXT,
                opacity: 0.78,
                wordBreak: "break-word",
                lineHeight: 1.45,
              }}
            >
              {`"${rejection.text}"`}
            </div>
          </div>
        )}

        {/* ─── Input ────────────────────────────────────── */}
        <div
          style={{
            padding: "10px 14px 12px",
            borderTop: `1px solid ${COLOR.ghost}14`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              maxLength={MAX_INPUT_LENGTH}
              placeholder="speak softly…"
              aria-label="chat message"
              disabled={!pond.connected || yourHandle === null}
              className="pondchat-input"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                boxSizing: "border-box",
                appearance: "none",
                WebkitAppearance: "none",
                background: inputFocused
                  ? "rgba(127,175,179,0.06)"
                  : "rgba(127,175,179,0.025)",
                border: `1px solid ${COLOR.ghost}${
                  inputFocused ? "55" : "22"
                }`,
                borderRadius: 8,
                padding: "9px 12px",
                color: COLOR.inkStrong,
                caretColor: COLOR.ghost,
                fontFamily: FONT.body,
                fontSize: 14,
                lineHeight: 1.3,
                outline: "none",
                transition:
                  "border-color 240ms, background 240ms, box-shadow 240ms",
                boxShadow: inputFocused
                  ? "inset 0 1px 0 rgba(255,255,255,0.03)"
                  : "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={
                input.trim().length === 0 ||
                !pond.connected ||
                yourHandle === null
              }
              className="pondchat-send"
              aria-label="send message"
              style={{
                flexShrink: 0,
                width: 40,
                boxSizing: "border-box",
                appearance: "none",
                WebkitAppearance: "none",
                borderRadius: 8,
                border: `1px solid ${COLOR.ghost}28`,
                background: "rgba(127,175,179,0.025)",
                color: COLOR.ghost,
                fontFamily: FONT.mono,
                fontSize: 15,
                lineHeight: 1,
                padding: 0,
                cursor: "pointer",
                transition:
                  "color 220ms, border-color 220ms, background 220ms",
              }}
            >
              →
            </button>
          </div>
          <div
            style={{
              marginTop: 7,
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLOR.inkFaint,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {yourHandle !== null ? (
                <>
                  <span style={{ opacity: 0.55 }}>you are </span>
                  <span style={{ color: COLOR.ghost, opacity: 0.8 }}>
                    {yourHandle}
                  </span>
                </>
              ) : pond.connected ? (
                "settling in…"
              ) : (
                "the line is quiet"
              )}
            </span>
            <span
              style={{
                flexShrink: 0,
                opacity: 0.5,
                color:
                  input.length >= MAX_INPUT_LENGTH ? AMBER_TEXT : "inherit",
              }}
            >
              {input.length}/{MAX_INPUT_LENGTH}
            </span>
          </div>
        </div>
      </div>

      {/* Global styles for animation + scrollbar + collapse hover */}
      <style>{`
        @keyframes pondchat-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pondchat-scroller::-webkit-scrollbar {
          width: 6px;
        }
        .pondchat-scroller::-webkit-scrollbar-track {
          background: transparent;
        }
        .pondchat-scroller::-webkit-scrollbar-thumb {
          background: ${COLOR.ghost}22;
          border-radius: 3px;
        }
        .pondchat-scroller::-webkit-scrollbar-thumb:hover {
          background: ${COLOR.ghost}44;
        }
        .pondchat-scroller {
          scrollbar-width: thin;
          scrollbar-color: ${COLOR.ghost}22 transparent;
        }
        .pondchat-collapse:hover {
          color: ${COLOR.ghost};
        }
        /* Input — placeholder styling + disabled state */
        .pondchat-input::placeholder {
          color: ${COLOR.inkFaint};
          opacity: 0.65;
          font-style: italic;
        }
        .pondchat-input::-webkit-input-placeholder {
          color: ${COLOR.inkFaint};
          opacity: 0.65;
          font-style: italic;
        }
        .pondchat-input::-moz-placeholder {
          color: ${COLOR.inkFaint};
          opacity: 0.65;
          font-style: italic;
        }
        .pondchat-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        /* Send button — hover, active, disabled */
        .pondchat-send:hover:not(:disabled) {
          background: rgba(127,175,179,0.08);
          border-color: ${COLOR.ghost}77;
          color: ${COLOR.inkStrong};
        }
        .pondchat-send:active:not(:disabled) {
          background: rgba(127,175,179,0.14);
          transform: translateY(1px);
        }
        .pondchat-send:disabled {
          opacity: 0.32;
          cursor: default;
        }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ChatInscription — single message, attribution-after style
//
//  The body comes first, then the attribution on a smaller line below.
//  Reads like a guestbook entry — fitting for a wishing-fountain
//  space, less like a chat-app stream.
// ─────────────────────────────────────────────────────────────────

function ChatInscription({
  message,
  isYours,
  COLOR,
  FONT,
}: {
  message: ChatMessage;
  isYours: boolean;
  COLOR: ColorTokens;
  FONT: FontTokens;
}) {
  const isPond = message.kind === "pond";

  return (
    <div
      style={{
        marginBottom: 14,
        animation: "pondchat-fadein 360ms ease-out",
        // Pond messages get a subtle teal hairline on the left edge
        // and a touch of left padding so they read as a distinct
        // register without being heavy-handed.
        ...(isPond
          ? {
              paddingLeft: 10,
              borderLeft: `1px solid ${COLOR.ghostSoft}55`,
            }
          : {}),
      }}
    >
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: 14,
          color: isPond ? COLOR.inkMuted : COLOR.inkBody,
          lineHeight: 1.5,
          wordBreak: "break-word",
          // Pond observations render in italic — they read as
          // inscription rather than utterance.
          fontStyle: isPond ? "italic" : "normal",
        }}
      >
        {message.text}
      </div>
      <div
        style={{
          marginTop: 3,
          fontFamily: FONT.mono,
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: COLOR.inkFaint,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          rowGap: 2,
        }}
      >
        <span style={{ opacity: 0.6 }}>—</span>
        {isPond && (
          <span
            style={{
              color: COLOR.ghostSoft,
              opacity: 0.7,
              fontSize: 10,
              lineHeight: 1,
              transform: "translateY(-1px)",
            }}
          >
            ◇
          </span>
        )}
        <span
          style={{
            color: isPond
              ? COLOR.ghostSoft
              : isYours
              ? COLOR.ghost
              : COLOR.inkMuted,
            fontStyle: isPond ? "italic" : "normal",
          }}
        >
          {message.handle}
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ opacity: 0.6 }}>{relativeTime(message.at)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Relative time formatter
// ─────────────────────────────────────────────────────────────────

function relativeTime(atMs: number): string {
  const delta = Date.now() - atMs;
  if (delta < 30_000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`;
  return `${Math.floor(delta / 86_400_000)}d`;
}

// ─────────────────────────────────────────────────────────────────
//  Chat-count abbreviation
//
//  Used by the collapsed pill to show "how active has the pond been
//  while I've been here." Uncapped — keeps incrementing across the
//  whole session.
//
//    0–999          → as-is              (e.g. "0", "12", "999")
//    1,000–9,999    → one decimal k       (e.g. "1.0k", "1.2k", "9.9k")
//    10,000–999,999 → whole k             (e.g. "10k", "99k", "999k")
//    1,000,000+     → one decimal m / m   (e.g. "1.0m", "9.9m", "12m")
//
//  Floor is used rather than round so the displayed number never
//  over-promises ("9.9k" stays "9.9k" until the 10,000th message).
// ─────────────────────────────────────────────────────────────────

function formatChatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) {
    return `${(Math.floor(n / 100) / 10).toFixed(1)}k`;
  }
  if (n < 1_000_000) {
    return `${Math.floor(n / 1000)}k`;
  }
  if (n < 10_000_000) {
    return `${(Math.floor(n / 100_000) / 10).toFixed(1)}m`;
  }
  return `${Math.floor(n / 1_000_000)}m`;
}
