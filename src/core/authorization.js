function identityKey(identity) {
  if (!identity?.channel || !identity?.stableId) {
    throw new Error("identity requires channel and stableId");
  }
  return `${identity.channel}:${identity.stableId}`;
}

export class AuthorizationStore {
  constructor({ identities = [] } = {}) {
    this.identities = new Map();
    this.detectedIdentities = new Map();
    for (const identity of identities) {
      this.confirmIdentity(identity);
    }
  }

  confirmIdentity(identity) {
    const confirmed = {
      channel: identity.channel,
      stableId: identity.stableId,
      displayName: identity.displayName ?? identity.stableId,
      role: identity.role ?? "operator",
    };
    this.identities.set(identityKey(confirmed), confirmed);
    this.detectedIdentities.delete(identityKey(confirmed));
    return { ...confirmed };
  }

  detectIdentity(identity) {
    const detected = {
      channel: identity.channel,
      stableId: identity.stableId,
      displayName: identity.displayName ?? identity.stableId,
      role: identity.role ?? "operator",
    };
    const key = identityKey(detected);
    if (!this.identities.has(key)) {
      this.detectedIdentities.set(key, detected);
    }
    return { ...detected };
  }

  removeIdentity(identity) {
    return this.identities.delete(identityKey(identity));
  }

  isAuthorized(identity) {
    if (!identity?.channel || !identity?.stableId) {
      return false;
    }
    return this.identities.has(identityKey(identity));
  }

  listIdentities() {
    return Array.from(this.identities.values(), (identity) => ({ ...identity }));
  }

  listDetectedIdentities() {
    return Array.from(this.detectedIdentities.values(), (identity) => ({ ...identity }));
  }
}

export function describeIdentity(identity) {
  return `${identity.channel}:${identity.displayName ?? identity.stableId}`;
}
