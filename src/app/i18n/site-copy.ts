export type Lang = "en" | "zh";

export const navItems = [
  { id: "work", en: "Work", zh: "项目" },
  { id: "effects", en: "Effects", zh: "特效" },
  { id: "writing", en: "Writing", zh: "文章" },
  { id: "todo", en: "Todo", zh: "待办" },
];

// 首页文案集中维护，确保中英文切换时结构一致。
export const copy = {
  en: {
    eyebrow: "Fullstack Developer / Frontend-focused",
    headline: "Advance relentlessly. Improve endlessly.",
    intro:
      "I turn complex capabilities into clear product experiences across AI/RAG, backend services, multi-platform interfaces, and interaction details users can actually feel.",
    primaryCta: "View Work",
    secondaryCta: "nicenonecb@gmail.com",
    profileTitle: "profile.snapshot",
    online: "online",
    profile: {
      role: "fullstack developer / frontend-focused",
      focus: "AI apps / RAG / backend / effects",
      stack: "Next.js / NestJS / Go / Electron / React Native / Cloudflare",
      platforms: "web / desktop / mobile",
      status: "employed",
    },
    effects: {
      eyebrow: "Frontend Effects",
      title: "Ship the product. Shape the moment.",
      description:
        "A focused space for motion, performance, and interaction feedback. Effects are not decoration here; they make key product moments clearer and more memorable.",
      preview: "effect.preview",
      live: "live",
      openGlassHero: "Open Effects",
      items: [
        {
          name: "Scroll Choreography",
          description: "Narrative scrolling, parallax layers, and page rhythm.",
        },
        {
          name: "Canvas Particles",
          description: "Particle fields, trail feedback, and lightweight tuning.",
        },
        {
          name: "Micro Interaction",
          description: "Stateful motion for buttons, cards, lists, and flows.",
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
          type: "RAG Application",
          description:
            "Designed a retrieval flow for documents, answers, citations, and admin review.",
          stack: "Next.js / NestJS / Vector DB / LLM",
        },
        {
          name: "Cross-platform Client",
          type: "Web / Desktop / Mobile",
          description:
            "Built shared product workflows across browser, Electron, and React Native clients.",
          stack: "React / Electron / React Native",
        },
        {
          name: "Private Ops System",
          type: "Fullstack System",
          description:
            "A private task and progress system with protected access and persistent data.",
          stack: "Cloudflare Access / D1 / Workers",
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
    eyebrow: "全栈开发 / 偏前端方向",
    headline: "不断进取，无限进步。",
    intro:
      "我擅长把复杂能力做成清晰好用的产品体验：从 AI/RAG、后端服务到多端界面与交互动效，既能搭建系统，也能打磨用户真正感受到的细节。",
    primaryCta: "查看项目",
    secondaryCta: "nicenonecb@gmail.com",
    profileTitle: "profile.snapshot",
    online: "online",
    profile: {
      role: "全栈开发 / 偏前端方向",
      focus: "AI 应用 / RAG / 后端 / 特效",
      stack: "Next.js / NestJS / Go / Electron / React Native / Cloudflare",
      platforms: "网页端 / 桌面端 / 移动端",
      status: "在职",
    },
    effects: {
      eyebrow: "前端特效",
      title: "能落地，也能把界面做出记忆点",
      description:
        "这里展示我对动效、性能和交互反馈的处理方式：不是为了炫技堆效果，而是让产品在关键瞬间更清晰、更有质感。",
      preview: "effect.preview",
      live: "live",
      openGlassHero: "打开特效库",
      items: [
        {
          name: "Scroll Choreography",
          description: "滚动叙事、视差层级和页面节奏控制。",
        },
        {
          name: "Canvas Particles",
          description: "粒子场、轨迹反馈和轻量性能优化。",
        },
        {
          name: "Micro Interaction",
          description: "按钮、卡片、列表状态的细节动效。",
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
          type: "RAG 应用",
          description: "设计文档检索、回答生成、引用溯源和后台审核流程。",
          stack: "Next.js / NestJS / Vector DB / LLM",
        },
        {
          name: "Cross-platform Client",
          type: "网页端 / 桌面端 / 移动端",
          description:
            "构建覆盖浏览器、Electron 和 React Native 的多端产品工作流。",
          stack: "React / Electron / React Native",
        },
        {
          name: "Private Ops System",
          type: "全栈系统",
          description: "只对本人开放的任务、记录和进度系统，带登录保护和持久化。",
          stack: "Cloudflare Access / D1 / Workers",
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
