export function normalizeChannelMessage(message) {
  return {
    identity: {
      channel: message.identity.channel,
      stableId: message.identity.stableId,
      displayName: message.identity.displayName ?? message.identity.stableId,
    },
    text: String(message.text ?? "").trim(),
    attachments: message.attachments ?? [],
    // Conversation context (channel, conversationId, accountId) is carried
    // through so the router can route Codex output back to the same chat.
    conversation: message.conversation ?? null,
  };
}
