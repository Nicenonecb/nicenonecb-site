import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflareConfig = defineCloudflareConfig({
  // 目前页面均可静态生成，暂不启用 R2 增量缓存。
});

const openNextConfig = {
  ...cloudflareConfig,
  // OpenNext 会先调用这个命令产出 .next，再转换成 Cloudflare Worker 产物。
  buildCommand: "npm run build:next",
};

export default openNextConfig;
