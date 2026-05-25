import test from "node:test";
import assert from "node:assert/strict";

import { AuthorizationStore } from "../src/core/authorization.js";

test("denies unconfirmed identities by default", () => {
  const store = new AuthorizationStore();

  assert.equal(store.isAuthorized({ channel: "wechat", stableId: "wxid_a" }), false);
});

test("allows only locally confirmed identities", () => {
  const store = new AuthorizationStore();
  const identity = {
    channel: "wechat",
    stableId: "wxid_owner",
    displayName: "Alice",
  };

  store.confirmIdentity(identity);

  assert.equal(store.isAuthorized(identity), true);
  assert.equal(store.isAuthorized({ channel: "wechat", stableId: "wxid_other" }), false);
});

test("removes identity authorization", () => {
  const store = new AuthorizationStore();
  const identity = { channel: "feishu", stableId: "ou_owner", displayName: "Alice" };

  store.confirmIdentity(identity);
  store.removeIdentity(identity);

  assert.equal(store.isAuthorized(identity), false);
});

test("lists confirmed identities without exposing internal mutation", () => {
  const store = new AuthorizationStore();

  store.confirmIdentity({
    channel: "wechat",
    stableId: "wxid_owner",
    displayName: "Alice",
    role: "operator",
  });

  const identities = store.listIdentities();
  identities[0].displayName = "Changed";

  assert.deepEqual(store.listIdentities(), [
    {
      channel: "wechat",
      stableId: "wxid_owner",
      displayName: "Alice",
      role: "operator",
    },
  ]);
}
);

test("tracks detected identities separately from confirmed identities", () => {
  const store = new AuthorizationStore();
  const identity = {
    channel: "wechat",
    stableId: "wx_account_1:wxid_owner",
    displayName: "Alice",
  };

  store.detectIdentity(identity);

  assert.equal(store.isAuthorized(identity), false);
  assert.deepEqual(store.listDetectedIdentities(), [
    {
      channel: "wechat",
      stableId: "wx_account_1:wxid_owner",
      displayName: "Alice",
      role: "operator",
    },
  ]);

  store.confirmIdentity(identity);

  assert.equal(store.isAuthorized(identity), true);
  assert.deepEqual(store.listDetectedIdentities(), []);
});
