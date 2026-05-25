import test from "node:test";
import assert from "node:assert/strict";

import { createServer } from "../src/server/app.js";

test("wechat runtime APIs expose config, manual polling, and start-stop controls", async () => {
  const calls = [];
  const state = {
    channels: {
      wechat: { getStatus: () => ({ state: "adapter_ready" }) },
      feishu: { getStatus: () => ({ state: "adapter_ready" }) },
    },
    connectors: {
      desktop: { getStatus: () => ({ state: "not_connected" }) },
      cli: { getStatus: () => ({ state: "available" }) },
    },
    authorization: { listIdentities: () => [], listDetectedIdentities: () => [] },
    projects: { listProjects: () => [] },
    runtime: {
      wechat: {
        getConfig: () => ({ enabled: false, accountId: "default", loggedIn: false }),
        configure: async (config) => calls.push(["configure", config]),
        getStatus: () => ({ state: "configured", cursor: null }),
        pollOnce: async () => ({ inbound: 1, outbound: 1 }),
        start: () => ({ state: "running" }),
        stop: () => ({ state: "configured" }),
        startLogin: async () => ({ loginId: "login_1", qrUrl: "https://qr.example/1" }),
        getLoginStatus: async ({ loginId }) => ({ state: "confirmed", accountId: loginId }),
      },
    },
    persist: async () => calls.push(["persist"]),
  };
  const app = createServer(state);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const configResponse = await fetch(`http://127.0.0.1:${port}/api/channels/wechat/config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      enabled: true,
      accountId: "wx_account_1",
    }),
  });
  const pollResponse = await fetch(`http://127.0.0.1:${port}/api/channels/wechat/runtime/poll`, {
    method: "POST",
  });
  const startResponse = await fetch(`http://127.0.0.1:${port}/api/channels/wechat/runtime/start`, {
    method: "POST",
  });
  const stopResponse = await fetch(`http://127.0.0.1:${port}/api/channels/wechat/runtime/stop`, {
    method: "POST",
  });
  const loginResponse = await fetch(`http://127.0.0.1:${port}/api/channels/wechat/login/start`, {
    method: "POST",
  });
  const loginStatusResponse = await fetch(
    `http://127.0.0.1:${port}/api/channels/wechat/login/status?loginId=login_1`,
  );

  assert.equal(configResponse.status, 200);
  assert.deepEqual(await pollResponse.json(), { inbound: 1, outbound: 1 });
  assert.deepEqual(await startResponse.json(), { state: "running" });
  assert.deepEqual(await stopResponse.json(), { state: "configured" });
  assert.deepEqual(await loginResponse.json(), { loginId: "login_1", qrUrl: "https://qr.example/1" });
  assert.deepEqual(await loginStatusResponse.json(), { state: "confirmed", accountId: "login_1" });
  assert.deepEqual(calls[0], [
    "configure",
    {
      enabled: true,
      accountId: "wx_account_1",
    },
  ]);
  server.close();
});

test("feishu runtime APIs expose QR login and websocket controls", async () => {
  const calls = [];
  const state = {
    channels: {
      wechat: { getStatus: () => ({ state: "adapter_ready" }) },
      feishu: { getStatus: () => ({ state: "adapter_ready" }) },
    },
    connectors: {
      desktop: { getStatus: () => ({ state: "not_connected" }) },
      cli: { getStatus: () => ({ state: "available" }) },
    },
    authorization: { listIdentities: () => [], listDetectedIdentities: () => [] },
    projects: { listProjects: () => [] },
    runtime: {
      feishu: {
        getConfig: () => ({ enabled: true, appId: "cli_a", hasAppSecret: true, domain: "feishu" }),
        configure: async (config) => calls.push(["configure", config]),
        getStatus: () => ({ state: "configured", driver: { appId: "cli_a" } }),
        start: async () => ({ state: "running" }),
        stop: () => ({ state: "configured" }),
        startLogin: async ({ domain }) => ({
          loginId: "device_1",
          qrUrl: "https://accounts.feishu.cn/scan?device_code=device_1",
          domain,
        }),
        getLoginStatus: async ({ loginId }) => ({ state: "confirmed", appId: "cli_new", loginId }),
      },
    },
    persist: async () => calls.push(["persist"]),
  };
  const app = createServer(state);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const runtimeResponse = await fetch(`http://127.0.0.1:${port}/api/channels/feishu/runtime`);
  const startResponse = await fetch(`http://127.0.0.1:${port}/api/channels/feishu/runtime/start`, {
    method: "POST",
  });
  const stopResponse = await fetch(`http://127.0.0.1:${port}/api/channels/feishu/runtime/stop`, {
    method: "POST",
  });
  const loginResponse = await fetch(`http://127.0.0.1:${port}/api/channels/feishu/login/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ domain: "feishu" }),
  });
  const loginStatusResponse = await fetch(
    `http://127.0.0.1:${port}/api/channels/feishu/login/status?loginId=device_1`,
  );

  assert.deepEqual(await runtimeResponse.json(), { state: "configured", driver: { appId: "cli_a" } });
  assert.deepEqual(await startResponse.json(), { state: "running" });
  assert.deepEqual(await stopResponse.json(), { state: "configured" });
  assert.deepEqual(await loginResponse.json(), {
    loginId: "device_1",
    qrUrl: "https://accounts.feishu.cn/scan?device_code=device_1",
    domain: "feishu",
  });
  assert.deepEqual(await loginStatusResponse.json(), { state: "confirmed", appId: "cli_new", loginId: "device_1" });
  server.close();
});

test("API token protects mutating local APIs when configured", async () => {
  const app = createServer(undefined, { apiToken: "local_secret" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const denied = await fetch(`http://127.0.0.1:${port}/api/identities/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "wechat", stableId: "wx:owner", displayName: "Alice" }),
  });
  const allowed = await fetch(`http://127.0.0.1:${port}/api/identities/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-comote-token": "local_secret",
    },
    body: JSON.stringify({ channel: "wechat", stableId: "wx:owner", displayName: "Alice" }),
  });
  server.close();

  assert.equal(denied.status, 401);
  assert.equal(allowed.status, 201);
});

test("identity API can remove a previously confirmed user", async () => {
  const app = createServer();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  await fetch(`http://127.0.0.1:${port}/api/identities/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "wechat", stableId: "wx:owner", displayName: "Alice" }),
  });
  const deleteResponse = await fetch(
    `http://127.0.0.1:${port}/api/identities/${encodeURIComponent("wechat")}/${encodeURIComponent("wx:owner")}`,
    { method: "DELETE" },
  );
  const listResponse = await fetch(`http://127.0.0.1:${port}/api/identities`);
  const identities = await listResponse.json();
  server.close();

  assert.equal(deleteResponse.status, 204);
  assert.deepEqual(identities, []);
});
