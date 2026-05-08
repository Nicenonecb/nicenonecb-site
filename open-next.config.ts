import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // 目前页面均可静态生成，暂不启用 R2 增量缓存。
});
