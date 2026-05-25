# WeChat Channel

Comote owns the WeChat channel runtime boundary. The user should run Comote next to Codex Desktop; they should not install a separate agent host just to make phone control work.

The current implementation has two layers:

- `WeChatChannelAdapter` normalizes mobile WeChat messages into Comote command messages and enforces local identity authorization.
- `WeChatIlinkDriver` is the Comote-owned driver boundary for Tencent mobile WeChat bot/iLink-style JSON APIs: `get_bot_qrcode`, `get_qrcode_status`, `getupdates`, `sendmessage`, and `sendtyping`.
- `WeChatRuntimeService` polls inbound updates, routes them through Comote, delivers queued outbound replies, and retries failed sends.

Runtime check:

```bash
npm run wechat:check
```

Comote accepts normalized inbound messages at:

```text
POST /api/channels/wechat/inbound
```

Minimum payload:

```json
{
  "accountId": "wx_account_1",
  "peer": {
    "id": "wxid_owner",
    "name": "Alice"
  },
  "conversation": {
    "id": "dm_wxid_owner",
    "type": "direct"
  },
  "message": {
    "id": "msg_1",
    "text": "/status"
  }
}
```

The stable Comote identity is:

```text
wechat:<accountId>:<peer.id>
```

The local app must confirm this identity before any command can operate Codex. Unconfirmed identities are recorded as local confirmation candidates and receive no remote reply.

Group messages are ignored until a separate group workflow is designed and explicitly enabled.

Outbound delivery boundary:

```text
GET  /api/channels/wechat/outbound
POST /api/channels/wechat/outbound/<id>/ack
```

The driver or a future bundled worker polls this queue, delivers text/media to WeChat, then acknowledges the entry after platform send succeeds.

Runtime and login APIs:

```text
GET  /api/channels/wechat/config
PUT  /api/channels/wechat/config
GET  /api/channels/wechat/runtime
POST /api/channels/wechat/runtime/start
POST /api/channels/wechat/runtime/stop
POST /api/channels/wechat/runtime/poll
POST /api/channels/wechat/login/start
GET  /api/channels/wechat/login/status?loginId=<id>
```

The login endpoints call the Comote WeChat driver. They expose QR login state through the Tencent iLink gateway; they do not depend on a third-party agent host and do not ask the user for URL or token fields.

Optional account hint:

```bash
COMOTE_WECHAT_ACCOUNT_ID=wx_account_1
npm run wechat:check
```

The user does not provide a WeChat API URL or token. Comote uses the default Tencent iLink gateway, starts a QR login session, and stores the returned bot token locally after scan confirmation.
