import assert from "node:assert/strict";
import test from "node:test";

import { qrDataUrl } from "../public/qr-code.js";

test("generates an inline SVG QR image for WeChat login URLs", () => {
  const value = "https://liteapp.weixin.qq.com/q/7GiQu1?qrcode=54fa7610219e9310f6167e7edc0525c7&bot_type=3";
  const dataUrl = qrDataUrl(value);

  assert.match(dataUrl, /^data:image\/svg\+xml;charset=utf-8,/);
  const svg = decodeURIComponent(dataUrl.split(",", 2)[1]);
  assert.match(svg, /<svg /);
  assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  assert.match(svg, /<path d="M/);
  assert.ok(svg.length > 1000);
});
