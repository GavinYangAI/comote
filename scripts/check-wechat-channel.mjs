import { WeChatChannelAdapter } from "../src/channels/wechat/adapter.js";
import { WeChatIlinkDriver } from "../src/channels/wechat/ilink-driver.js";

const adapter = new WeChatChannelAdapter({
  commandRouter: {
    handleMessageAsync: async () => ({ kind: "text", text: "ok" }),
  },
});

console.log("Comote WeChat channel");
console.log(`  runtime: ${adapter.getStatus().runtime}`);
console.log(`  driver: ${adapter.getStatus().driver}`);
console.log(`  channel id: ${adapter.getStatus().channelId}`);
console.log("  third-party agent host: not required");
console.log("");
console.log("Driver configuration");
const driver = new WeChatIlinkDriver({
  accountId: process.env.COMOTE_WECHAT_ACCOUNT_ID ?? "default",
});
console.log(`  state: ${driver.getStatus().state}`);
console.log(`  gateway: ${driver.getStatus().baseUrl}`);
console.log(`  login: ${driver.getStatus().hasToken ? "connected" : "scan required"}`);
