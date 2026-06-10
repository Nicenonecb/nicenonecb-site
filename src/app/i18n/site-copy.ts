export type Lang = "en" | "zh";

export const navItems = [
  { href: "/effects", id: "effects", en: "Effects", zh: "特效", featured: true },
  { id: "work", en: "Work", zh: "项目" },
  { id: "writing", en: "Writing", zh: "文章" },
];

// 首页文案集中维护，确保中英文切换时结构一致。
export const copy = {
  en: {
    eyebrow: "",
    headline: "Advance relentlessly. Improve endlessly.",
    intro:
      "7+ years in frontend engineering and 1+ year in backend services, focused on turning complex technology into polished, production-ready product capabilities. My work spans interaction design, visual effects, and cross-platform experiences, plus AI application infrastructure including Graph RAG, Harness Agent, and KV Cache compression.",
    primaryCta: "View Work",
    secondaryCta: "Contact me",
    profileTitle: "Nicenonecb.snapshot",
    online: "online",
    profile: {
      role: "fullstack developer, frontend-focused",
      focus: "effects, AI infrastructure, Graph RAG, Harness Agent",
      stack: "Next.js, NestJS, Go, Electron, React Native, Cloudflare",
      platforms: "web, desktop, mobile",
      status: "employed",
    },
    effects: {
      eyebrow: "Frontend Effects",
      title: "Ship the product. Shape the moment.",
      description:
        "A focused space for motion, performance, and interaction feedback. Effects are not decoration here; they make key product moments clearer and more memorable.",
      preview: "effect.preview",
      live: "live",
      openEffectsLab: "Open Effects",
      items: [
        {
          href: "/effects/glass-page",
          name: "GLASS PAGE",
          description: "Fragmented glass panels, chromatic edges, and pointer-reactive depth.",
        },
        {
          href: "/effects/liquid-layers-draw",
          name: "Liquid Layers",
          description: "PVFS liquid layers with drag cavities, columns, and rebound flow.",
        },
        {
          href: "/effects/tearable-ui",
          name: "Tearable UI",
          description: "A cloth-simulated canvas texture that stretches, tears, and reveals layers.",
        },
        {
          href: "/effects/reflective-signal-card",
          name: "Reflective Signal",
          description: "A React Bits-inspired card with pointer spotlight, metallic sheen, and 3D tilt.",
        },
      ],
    },
    work: {
      eyebrow: "Selected Work",
      title: "End-to-end project experience",
      count: "005 entries",
      pendingDialog: {
        eyebrow: "Project status",
        title: "In development...",
        description:
          "This project is still being polished. More details will be available once it is ready to share.",
        close: "Close",
      },
      items: [
        {
          name: "Cool Codex",
          type: "AI Agent Reliability",
          description:
            "A macOS CLI that classifies Codex and agent-browser Chrome processes, then cools down runaway local automation without killing normal tabs.",
          stack: "Bash, macOS, Chrome for Testing, process classification",
          href: "https://github.com/Nicenonecb/cool-codex",
        },
        {
          name: "LiteKV",
          type: "AI Infrastructure",
          description:
            "A DeepSeek-V4 article demo for running, measuring, and explaining long-context attention trade-offs on a local machine.",
          stack: "Python, uv, pytest, KV Cache, sparse attention",
          href: "https://github.com/Nicenonecb/deepseek-v4-csa-lite-m1",
        },
        {
          name: "RepoMap",
          type: "AI Agent Tooling",
          description:
            "A CLI that generates stable, reproducible structural maps so humans and AI agents can understand large repositories before editing.",
          stack: "TypeScript, Node.js, CLI, repository analysis",
          href: "https://github.com/Nicenonecb/RepoMap",
        },
        {
          name: "AI Knowledge Base",
          type: "AI Infrastructure",
          description:
            "Built core AI application paths across Graph RAG, Harness Agent orchestration, retrieval-generation, and KV Cache compression.",
          stack: "Next.js, NestJS, Graph RAG, Harness Agent, KV Cache",
        },
        {
          name: "Cross-platform Client",
          type: "Web, Desktop, Mobile",
          description:
            "Built shared product workflows across browser, Electron, and React Native clients.",
          stack: "React, Electron, React Native",
        },
      ],
    },
    writing: {
      eyebrow: "Writing",
      title: "Technical notes with working evidence",
      posts: [
        {
          href: "/writing/cool-codex-mac-heat",
          title: "Cool Codex: taming AI Agent Chrome leftovers on macOS",
        },
        {
          href: "/writing/deepseek-v4-litekv",
          title: "DeepSeek-V4 attention mechanics and LiteKV validation",
        },
        {
          href: "/writing/ai-memory-harness",
          title: "From AI memory to Harness engineering",
        },
      ],
    },
  },
  zh: {
    eyebrow: "",
    headline: "不断进取，无限进步。",
    intro:
      "7 年+前端工程经验，1 年+后端服务实践，擅长把复杂技术沉淀为高质感、可落地的产品能力：从页面交互、视觉特效与多端体验，到 AI 应用基础设施、Graph RAG、Harness Agent、KV Cache 压缩等核心链路均有深入实践。",
    primaryCta: "查看项目",
    secondaryCta: "联系我",
    profileTitle: "Nicenonecb.snapshot",
    online: "online",
    profile: {
      role: "全栈开发（偏前端）",
      focus: "特效、AI 基建、Graph RAG、Harness Agent",
      stack: "Next.js、NestJS、Go、Electron、React Native、Cloudflare",
      platforms: "网页端、桌面端、移动端",
      status: "在职",
    },
    effects: {
      eyebrow: "前端特效",
      title: "把界面做出记忆点",
      description:
        "这里展示我对动效、性能和交互反馈的处理方式：让产品在关键瞬间更有质感。",
      preview: "effect.preview",
      live: "live",
      openEffectsLab: "打开特效库",
      items: [
        {
          href: "/effects/glass-page",
          name: "GLASS PAGE",
          description: "玻璃碎片、色散边缘和跟随指针变化的空间层次。",
        },
        {
          href: "/effects/liquid-layers-draw",
          name: "Liquid Layers",
          description: "PVFS 液体层，拖拽时形成空腔、液柱和回流。",
        },
        {
          href: "/effects/tearable-ui",
          name: "Tearable UI",
          description: "把界面贴到布料网格上，拖拽后可拉伸、撕裂并露出下一层。",
        },
        {
          href: "/effects/reflective-signal-card",
          name: "Reflective Signal",
          description: "受 React Bits 启发的交互卡片，指针聚光、金属反射和 3D 倾斜同源联动。",
        },
      ],
    },
    work: {
      eyebrow: "项目经历",
      title: "完整项目经验",
      count: "005 entries",
      pendingDialog: {
        eyebrow: "项目状态",
        title: "正在研发中...",
        description: "这个项目还在打磨中，准备好后会开放更多细节。",
        close: "关闭",
      },
      items: [
        {
          name: "Cool Codex",
          type: "AI Agent 可靠性",
          description:
            "面向 Codex 重度会话的 macOS 降温 CLI，基于完整命令行区分自动化 Chrome 与普通标签页，安全清理残留进程。",
          stack: "Bash、macOS、Chrome for Testing、进程分类",
          href: "https://github.com/Nicenonecb/cool-codex",
        },
        {
          name: "LiteKV",
          type: "AI 应用基建",
          description:
            "面向 DeepSeek-V4 技术文章的小型实验项目，用本地可运行方式测量和解释长上下文注意力的成本权衡。",
          stack: "Python、uv、pytest、KV Cache、稀疏注意力",
          href: "https://github.com/Nicenonecb/deepseek-v4-csa-lite-m1",
        },
        {
          name: "RepoMap",
          type: "AI Agent 工具",
          description:
            "生成稳定、可复现的仓库结构地图，帮助开发者和 AI Agent 在修改大型代码库前快速理解模块与入口。",
          stack: "TypeScript、Node.js、CLI、仓库分析",
          href: "https://github.com/Nicenonecb/RepoMap",
        },
        {
          name: "AI Knowledge Base",
          type: "AI 应用基建",
          description:
            "覆盖 Graph RAG、Harness Agent、检索生成与 KV Cache 压缩等 AI 应用核心链路。",
          stack: "Next.js、NestJS、Graph RAG、Harness Agent、KV Cache",
        },
        {
          name: "Cross-platform Client",
          type: "网页端、桌面端、移动端",
          description:
            "构建覆盖浏览器、Electron 和 React Native 的多端产品工作流。",
          stack: "React、Electron、React Native",
        },
      ],
    },
    writing: {
      eyebrow: "技术文章",
      title: "对技术的一些思考",
      posts: [
        {
          href: "/writing/cool-codex-mac-heat",
          title: "别迷信大模型：Codex 也能把 Mac 推到 98°C",
        },
        {
          href: "/writing/deepseek-v4-litekv",
          title: "DeepSeek-V4 注意力机制与 LiteKV 验证",
        },
        {
          href: "/writing/ai-memory-harness",
          title: "从 AI 记忆到 Harness 工程：AI Coding 与应用市场落地探讨",
        },
      ],
    },
  },
} as const;
