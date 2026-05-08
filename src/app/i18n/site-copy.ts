export type Lang = "en" | "zh";

export const navItems = [
  { href: "/effects", id: "effects", en: "Effects", zh: "特效", featured: true },
  { id: "work", en: "Work", zh: "项目" },
  { id: "writing", en: "Writing", zh: "文章" },
  { id: "todo", en: "Todo", zh: "待办" },
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
      ],
    },
    work: {
      eyebrow: "Selected Work",
      title: "End-to-end project experience",
      count: "003 entries",
      items: [
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
        {
          name: "Private Ops System",
          type: "Fullstack System",
          description:
            "A private task and progress system with protected access and persistent data.",
          stack: "Cloudflare Access, D1, Workers",
        },
      ],
    },
    writing: {
      eyebrow: "Writing",
      title: "Writing as a second portfolio",
      posts: [
        "How to make a page feel like a product, not a template",
        "What a frontend-focused fullstack portfolio should prove",
        "From todolist to a personal operating system",
      ],
    },
    todo: {
      eyebrow: "Private System",
      title: "A locked personal todo system",
      description:
        "This area will be protected by Cloudflare Access and D1. Public visitors will not see private tasks or progress records.",
      preview: "todo.preview",
      locked: "locked",
      items: [
        ["Complete personal intro", "active"],
        ["Upload frontend effect demos", "next"],
        ["Deploy to Cloudflare", "queued"],
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
      title: "能落地，也能把界面做出记忆点",
      description:
        "这里展示我对动效、性能和交互反馈的处理方式：不是为了炫技堆效果，而是让产品在关键瞬间更清晰、更有质感。",
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
      ],
    },
    work: {
      eyebrow: "项目经历",
      title: "完整项目经验",
      count: "003 entries",
      items: [
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
        {
          name: "Private Ops System",
          type: "全栈系统",
          description: "只对本人开放的任务、记录和进度系统，带登录保护和持久化。",
          stack: "Cloudflare Access、D1、Workers",
        },
      ],
    },
    writing: {
      eyebrow: "技术文章",
      title: "文章会成为你的第二份简历",
      posts: [
        "如何把一个页面做得像产品而不是模板",
        "偏前端的全栈作品集应该证明什么",
        "从 todolist 到个人操作系统",
      ],
    },
    todo: {
      eyebrow: "私人系统",
      title: "Todolist 只对本人开放",
      description:
        "后续会把这里接入 Cloudflare Access 和 D1，用登录保护 /admin 区域，公开访客看不到任务和记录。",
      preview: "todo.preview",
      locked: "locked",
      items: [
        ["完善个人介绍", "active"],
        ["上传特效项目", "next"],
        ["部署到 Cloudflare", "queued"],
      ],
    },
  },
} as const;
