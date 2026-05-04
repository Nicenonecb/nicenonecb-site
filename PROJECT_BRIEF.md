# NiceNoneCB Personal Site Brief

## 项目目标

这是一个个人求职向网站，用来集中展示个人介绍、技术文章、前端特效项目，以及一个只允许本人访问的 todolist 系统。

网站需要既能作为简历补充，也能作为长期维护的个人内容和作品展示空间。

## 核心需求

### 公开区域

- 首页展示个人大体介绍、职业定位、技术方向和联系方式。
- 提供完整的个人介绍页面，方便招聘方快速了解背景、技能和求职方向。
- 支持发布个人文章，主要用于记录技术思考、项目复盘和前端经验。
- 展示前端特效项目，包括动效、Canvas、WebGL、Three.js、交互实验等。
- 每个项目应包含项目说明、技术栈、难点、截图或在线预览链接。

### 私密区域

- 网站需要包含 todolist 功能。
- todolist 只能被本人看到，不能对公开访客暴露。
- todolist 需要保存任务记录，包括创建、完成、恢复、归档等历史。
- 私密区域建议放在 `/admin` 或 `/admin/todos` 下。
- 私密权限不能只依赖前端隐藏，需要服务端和数据库层一起保护。

## 推荐技术栈

### 第一阶段

- Next.js
- TypeScript
- Tailwind CSS
- MDX
- Cloudflare Pages / Workers
- Cloudflare D1
- Cloudflare Access

### 技术选择说明

- Next.js 用于统一处理页面、路由、文章、项目展示和后续后台功能。
- TypeScript 保证项目结构清晰，适合长期维护。
- Tailwind CSS 用于快速实现克制、现代、响应式的界面。
- MDX 用于早期文章发布，方便直接在代码仓库中管理文章。
- Cloudflare Pages / Workers 用于免费优先的部署方案。
- Cloudflare D1 用于保存 todolist 和任务历史。
- Cloudflare Access 用于保护 `/admin` 私密区域，限制只有本人邮箱可访问。

## 页面结构草案

```text
/
/about
/projects
/projects/[slug]
/labs
/blog
/blog/[slug]
/admin
/admin/todos
/admin/todos/history
```

## 数据库草案

### todos

```text
id
user_id
title
detail
status
priority
due_at
completed_at
created_at
updated_at
```

### todo_events

```text
id
todo_id
user_id
event_type
note
created_at
```

## 隐私策略

todolist 的隐私保护需要分三层：

1. `/admin` 路由需要登录。
2. 服务端接口需要验证当前访问者身份。
3. 数据库查询只能返回本人数据。

第一版可以优先使用 Cloudflare Access 限制本人邮箱访问，后续再根据需要扩展自定义登录系统。

## UI 设计方向

整体风格：极客简约、克制、专业、像高级前端工程师的个人作品集。

设计关键词：

- 深色背景
- 精细网格
- 单色主体
- 少量绿色高亮
- 字体层级清晰
- 信息密度适中
- 不做花哨营销页
- 不堆叠卡片
- 重点突出项目、文章和工程能力

交互方向：

- 页面滚动自然，动效克制。
- 项目展示可以适度使用 Canvas、WebGL、Three.js 或细腻 hover 效果。
- 首页第一屏要快速传达身份、技术方向和可联系状态。
- 公开区域保持专业，私密 todolist 区域保持工具化、效率化。

## 开发阶段建议

### Phase 1

- 完成首页基础视觉。
- 完成个人介绍内容。
- 完成项目列表和项目详情页。
- 完成文章列表和 MDX 文章详情。

### Phase 2

- 接入 Cloudflare 部署。
- 配置自定义域名。
- 接入 Cloudflare Access。
- 创建 D1 数据库。
- 实现私密 todolist。

### Phase 3

- 增加 todolist 历史记录。
- 增加文章标签和搜索。
- 增加项目在线 demo。
- 增加简历 PDF 下载。
- 根据需要增加英文版。

## 当前项目状态

- 已创建 Next.js 项目。
- 已配置 TypeScript 和 Tailwind CSS。
- 已完成第一版首页视觉雏形。
- 本地开发地址：`http://127.0.0.1:3000`
