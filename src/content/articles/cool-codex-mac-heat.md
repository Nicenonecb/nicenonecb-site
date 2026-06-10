# 别迷信大模型：Codex 也能把 Mac 推到 98°C，而我们用算法把它拉回来

> 说明：本文是一次 AI Agent 本地资源治理案例复盘。项目事实来自 `chrome-process-guard` / `Cool Codex` 的代码、README、历史会话检索和本机命令验证；图表中的 CPU、温度和残留进程数量为复盘模拟数据，用于表达趋势和算法效果，不伪装成当时截图。

## 摘要

很多人谈 AI 编程工具时，关注点都在“模型有多强”“代码写得多快”“能不能自动完成需求”。这些当然重要，但真实开发现场会提醒我们：AI Agent 不是悬浮在云端的神，它会打开终端、调用浏览器、启动 Chrome for Testing、创建临时 profile、连 remote debugging port、跑 renderer、拉起 GPU 进程。也就是说，AI 的能力越强，它在本地留下的副作用也越真实。

这个项目的起点就是一次很狼狈的现场：Codex 相关任务跑完后，后台留下了一批自动化 Chrome 进程，CPU 被吃满，机身温度接近 98°C。没有截图，但体感非常直接：风扇狂转，系统卡顿，活动监视器里一堆 Chrome Helper。更值得警惕的是，这不是普通意义上的“电脑有点慢”，而是 AI 工具链把浏览器自动化残留、系统渲染压力、进程回收边界一起推到了高风险区。

所以这篇文章想表达一个更强的观点：大家不要慕强。Codex 很强，但强不代表没有工程问题；大模型能生成代码，不代表它启动的工具都会自动收干净。真正成熟的 AI 使用方式，不是盲目信任某个品牌或模型，而是给 AI Agent 的副作用建立观测、分类、执行和复查算法。Cool Codex 就是这样一个小而硬核的案例：它不是“杀进程脚本”，而是把 AI 本地资源污染建模成一个可解释的分类与清理问题。

![AI Agent 性能故障与算法治理](/articles/cool-codex-mac-heat/image1.png)

## 1. 问题不是 Chrome，而是 AI Agent 的工具链副作用

从表面看，现场问题像是 Chrome 太多：活动监视器里出现大量 `Google Chrome Helper (Renderer)`，CPU 持续飙高。手工处理时，第一反应很容易是“把 Chrome Helper 都杀了”。但这恰恰是危险做法，因为 macOS 上普通 Chrome 标签页、扩展进程、GPU 进程、Chrome for Testing、agent-browser 启动的自动化浏览器，都可能长得很像。

真正的问题不是 Chrome 本身，而是 AI Agent 的工具链副作用。Codex 在完成某些任务时，会通过浏览器自动化查看页面、截图、调试、运行 Web 应用。这个链路通常包含：

```text
LLM 规划任务
  -> 调用本地工具
  -> 启动 browser / Playwright / agent-browser
  -> 创建 Chrome for Testing 或临时用户目录
  -> 产生 renderer / GPU / utility 进程
  -> 任务异常中断或上下文未及时回收
  -> 残留进程持续消耗 CPU
```

这条链路解释了为什么“会写代码的 AI”也会造成严重性能问题。模型输出只是上层结果，底层执行依赖一组本地进程。只要进程生命周期管理出问题，再强的 AI 也会把电脑拖慢。不要慕强，就是不要把“模型强”误解成“系统一定可靠”。

历史会话也能支撑这个判断。2026 年 5 月 29 日左右，已经发生过一次高 CPU 清理现场，当时清掉了大量被识别为 Codex / agent-browser 启动的 Chrome 子进程。流程不是粗暴杀光，而是先发送 `SIGTERM`，仍存活再发送 `SIGKILL`。清理之后仍可能存在普通 Chrome renderer、Chrome GPU、WindowServer、Codex Helper 等热源，因此结论要准确：自动化 Chrome 残留是可治理的一类 AI 副作用，但不是所有发热都能简单归因给 Codex。

![发热曲线复盘](/articles/cool-codex-mac-heat/image2.png)

## 2. 把发热问题建模成算法问题

Cool Codex 的关键价值，不是写了一个 `kill` 命令，而是完成了一次建模：把“电脑很烫，好像 Codex 搞的”转化为“从进程样本中识别 AI 自动化浏览器，并对高置信度目标执行可回滚边界内的清理”。

这个建模可以拆成三层算法。

第一层是观测算法。脚本通过 `pgrep -f` 枚举 Chrome、Chrome for Testing、agent-browser-chrome 等候选进程，再通过 `ps -p "$pid" -o command=` 读取完整 command line。这里的重点是完整命令行，而不是短进程名。短进程名只能告诉我们“它像 Chrome”，完整命令行才能告诉我们“它从哪里启动、带了什么参数、用了什么 profile”。

第二层是分类算法。`classify_command` 会根据路径、临时目录和启动参数，把候选进程分为几类：

```text
agent-browser-chrome                         -> CODEX_AGENT_BROWSER
~/.agent-browser/browsers/                   -> CODEX_AGENT_BROWSER
Google Chrome for Testing + /T/ user-data-dir -> CHROME_FOR_TESTING_TEMP
Google Chrome for Testing + remote-debugging -> CHROME_FOR_TESTING_AUTOMATION
/Applications/Google Chrome.app/             -> NORMAL_GOOGLE_CHROME
无法确认的 Chrome Helper                    -> UNKNOWN_CHROME_RELATED
```

这个分类规则很朴素，但它体现的是算法思想：用稳定特征代替主观猜测。普通用户看到的是一堆 Chrome Helper，算法看到的是特征空间：路径、二进制名称、临时 profile、remote debugging 参数、agent-browser marker。只要特征足够明确，就可以把“疑似热源”变成“可处理目标”。

第三层是执行算法。清理不是一次性 `kill -9`，而是两阶段终止：

```bash
kill -TERM "$pid"
sleep 2
重新读取 command line 并再次分类
如果仍是 AI 自动化浏览器，再 kill -KILL "$pid"
```

这一步看似简单，其实非常关键。PID 可能退出，可能被系统复用，进程分类也可能发生变化。强杀前重新分类，相当于给执行动作加了一次一致性校验。算法原则是：只对高置信度目标下手；证据消失或分类变化，就跳过。

![进程分类与清理流程](/articles/cool-codex-mac-heat/image3.png)

## 3. 为什么这和 AI 强相关

如果只是普通 Chrome 发热，这个项目最多是一个运维脚本。但它和 AI 强相关，是因为问题来源于 Agentic AI 的执行模式。

传统开发工具大多是被动的：编辑器打开文件，终端跑命令，浏览器由人操作。AI Agent 则是主动编排工具：它会决定什么时候打开网页，什么时候运行浏览器测试，什么时候截图，什么时候继续下一步。能力提升的同时，资源生命周期也变复杂了。一个 agent 如果没有把 browser context、renderer、debug session、临时目录全部收干净，就可能留下“模型任务已经结束，但本地副作用还在继续”的状态。

这也是为什么不要慕强。Codex 是先进的 AI 编程产品，但它依然运行在普通操作系统上，依然要面对进程、CPU、内存、窗口渲染和信号处理。模型可以很聪明，进程却不会因为模型聪明就自动消失。AI 工具的可靠性，不只取决于推理能力，也取决于工具编排、资源回收和故障隔离。

Cool Codex 的思路可以抽象成一个 AI Agent 资源治理模式：

```text
Agent 产生本地副作用
  -> 采集系统状态
  -> 识别副作用归属
  -> 区分用户正常资源和 agent 资源
  -> 对 agent 资源做有限清理
  -> 再次观测验证效果
```

这个模式比“一键杀进程”更像工程系统。它承认 AI 会犯错，也承认用户环境复杂；它不靠崇拜模型解决问题，而靠证据和边界解决问题。

## 4. 安全边界：强工具必须先学会克制

Cool Codex 的 README 里有一个很重要的原则：不会只凭短进程名杀 Chrome。这个原则决定了工具的安全性。

为什么？因为本机当前执行 `cool-codex list` 时，可以看到大量普通 Chrome 进程被分类为 `NORMAL_GOOGLE_CHROME`。它们中有 renderer、GPU、网络、音视频 utility 进程。它们也叫 Chrome Helper，但属于用户正常浏览器会话。如果工具只按短名处理，误杀概率会非常高，用户可能会丢掉正在看的文档、登录态、调试页面甚至会议页面。

未知进程也要跳过。`UNKNOWN_CHROME_RELATED` 不是“看起来可疑就杀掉”，而是“打印出来让人检查”。这体现了可靠性工程里非常重要的一点：自动化系统要知道自己的不确定性。一个工具越强，越要知道什么时候不该动手。

WindowServer 也是同样道理。macOS 上 WindowServer 高 CPU 可能和窗口数量、外接屏、动画、浏览器渲染有关。直接杀 WindowServer 基本等于强制登出，代价太高。Cool Codex 选择重启 Dock、SystemUIServer、ControlCenter 这类轻量 UI agent，并提供降低/恢复透明度和动态效果的命令。这不是怂，这是边界感。

## 5. 数据化复盘：把“很烫”变成可比较指标

当时没有截图，所以本文使用复盘模拟数据表达趋势：清理前 CPU 接近满载，温度峰值接近 98°C，自动化残留进程数量明显偏高；执行安全清理后，目标进程减少，CPU 和温度随时间回落。这个数据不是为了证明具体数值，而是为了说明：AI 工具链故障必须被指标化。

一次靠谱的 AI 性能事故复盘，至少要看四类指标：

```text
Top CPU                  当前主要热源是谁
Browser / Web renderers   是否存在自动化浏览器残留
WindowServer              是否是系统渲染压力
Before / After            清理是否真的减少了目标进程
```

这四个指标的意义，是把情绪变成证据。我们当然可以说“Codex 把电脑搞炸了”，但工程复盘要进一步回答：是哪些进程？来自哪里？为什么判断它们属于 AI 自动化？清理后目标是否减少？普通 Chrome 有没有被保留？WindowServer 是否仍然高？只有回答这些问题，才能从吐槽进入治理。

![清理前后对比](/articles/cool-codex-mac-heat/image4.png)

## 6. 命令设计：让算法变成日常操作

一个好的内部工具，不应该只给作者自己用。Cool Codex 把算法流程封装成几个命令：

```text
cool-codex cooldown          只诊断，不清理
cool-codex list              列出 Chrome 相关进程并分类
cool-codex inspect <pid>     检查指定 PID 的完整命令和分类
cool-codex kill-agent        只清理 AI 自动化 Chrome 进程
cool-codex cooldown-watch    每 5 秒持续观察热源
coolcodex                    一键安全降温
```

这里最值得强调的是 `coolcodex`。它不是盲目杀进程，而是等价于 `cool-codex cooldown-safe`：先打印热源诊断，再清理自动化 Chrome，再重启轻量 UI agent，最后再次打印诊断。这相当于把“观察 -> 执行 -> 验证”固化成一条命令。

项目后来从 `chrome-process-guard` 改名为 `cool-codex`，并保留旧命令作为兼容别名。`package.json` 里三个 bin 都指向同一个主脚本：

```json
{
  "cool-codex": "./cool-codex.sh",
  "coolcodex": "./cool-codex.sh",
  "chrome-process-guard": "./cool-codex.sh"
}
```

这个设计也有工程价值。历史会话里曾经出现过 wrapper 和全局 symlink 路径解析问题，后来直接让 npm bin 指向主脚本，减少了一层不确定性。小工具也要讲架构：能少一层 wrapper，就少一层故障面。

## 7. 这件事给 AI 使用者的提醒

第一，不要慕强。Codex 很强，但它仍然可能出现严重性能问题。强模型不等于强资源治理，强产品不等于没有本地副作用。越是强大的 AI Agent，越可能调用更多工具、打开更多上下文、制造更多进程状态。

第二，不要把 AI 问题神秘化。CPU 被吃满、温度接近 98°C，本质上仍然是操作系统里的进程、信号、命令行参数、资源占用和生命周期问题。AI 让问题出现的路径更复杂，但解决问题仍然要回到工程基本功。

第三，不要写危险的自动化。能杀进程不算本事，能证明“为什么这个进程该杀、为什么那个进程不能杀”才算本事。分类、置信度、复查、跳过未知目标，这些机制比 `kill -9` 更重要。

第四，把每次事故变成工具。一次发热现场如果只停留在抱怨，就只是糟糕体验；如果沉淀成观测脚本、分类算法、清理命令和复盘文档，它就会变成团队资产。Cool Codex 的意义就在这里：它把 AI 工具链的一个坑，变成了可复用的本地可靠性方案。

## 8. 后续可以继续“吹”的方向

如果要把这个项目继续做大，可以沿三个方向升级。

第一，补充测试样本库。把不同来源的 command line 做成 fixture，包括普通 Chrome、Chrome for Testing、agent-browser、未知 Chrome Helper。每次修改分类规则，都自动验证是否误伤普通浏览器。

第二，加入 dry-run 解释模式。执行清理前，先输出“PID、分类、命中特征、将执行动作”。这样用户不仅知道会清理什么，还知道为什么清理它。

第三，做资源治理报告。每次 `coolcodex` 前后保存一份快照，记录 CPU、目标 PID、分类结果、清理动作和时间戳。以后再遇到“AI 把电脑跑烫了”，就不需要靠回忆，而是有证据链。

更进一步，Cool Codex 可以变成一种通用 AI Agent guard：不仅看 Chrome，也看 Python、Node、Playwright、临时下载目录、debug port、长时间空闲的 agent 子进程。核心不是绑定 Codex，而是建立一套 AI 工具链副作用治理框架。

## 结语

这篇文章的标题可以很狠：“别迷信大模型，Codex 也能把 Mac 推到 98°C”。但它不是为了黑 Codex，而是为了提醒我们：AI 时代的工程师不能只崇拜模型能力，也要治理模型调用工具后留下的现实世界副作用。

Cool Codex 只有 400 多行 Bash，但它讲清楚了一个大问题：AI Agent 的可靠性不只在云端，也在本地；不只在 token 和推理，也在进程、浏览器、CPU 和温度。真正靠谱的 AI 工程实践，是既敢用强工具，也不迷信强工具；既承认 Codex 能提高效率，也承认 Codex 可能制造严重性能问题。

最后一句话送给所有 AI 使用者：不要慕强，慕证据；不要迷信模型，迷信可观测性；不要只看 AI 写了多少代码，也要看它留下了多少进程。
