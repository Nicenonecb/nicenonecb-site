# DeepSeek-V4 压缩稀疏注意力与 LiteKV Demo 验证

作者：王秉政

LiteKV GitHub：[https://github.com/Nicenonecb/deepseek-v4-csa-lite-m1](https://github.com/Nicenonecb/deepseek-v4-csa-lite-m1)

本文回答一个具体问题：百万 token 上下文的核心难点，到底是“位置能不能编码到 1M”，还是“每一步生成时还能不能负担注意力和 KV cache”？结合 DeepSeek 官方发布的论文 Native Sparse Attention，我的结论是：DeepSeek-V4 的关键不是让模型无差别地看更多 token，而是把历史组织成可压缩、可索引、可局部保真的分层记忆。

本文配套的 LiteKV demo 是作者为这次技术分享写的验证仓库，非 DeepSeek-V4 官方复现。角色定位为 mechanism microscope（机制显微镜）：用小规模、可运行、可画图的代码，把 dense attention、sliding window、CSA-lite 和新增的 NSA-lite 拆开，验证“压缩降低成本、稀疏选择保留远程线索、局部窗口保真细节”这条路线为什么成立。

![NSA、CSA 与 HCA 的机制桥接](/articles/deepseek-v4-litekv/image1.png)

## 一、长上下文真正贵在哪里？

传统 Transformer 自注意力的核心动作，是让当前 query 和历史 token 的 key/value 交互。上下文长度从几千增长到几十万、百万后，成本不是线性地“多放一些文本”，而是两个系统瓶颈同时变重。

第一是每步生成的 attention score 数量。Dense attention 下，当前 token 理论上要和所有历史 token 打分。序列越长，每一步 decoding 越像在翻一整座档案库。

第二是 KV cache。自回归生成时，模型会缓存历史 token 的 K/V，避免重复计算。上下文越长，KV cache 越像常驻显存里的数据库。即便 attention FLOPs 能被优化，长序列 decoding 往往也会被 KV 读取带宽卡住。

所以长上下文不是单纯的 RoPE 外推问题，而是 attention 计算图和 memory layout 问题。真正有价值的路线需要同时做到三点：

- 远处历史不能每次都逐 token 全量读取。
- 关键远程信息不能因为压缩而彻底丢失。
- 最近上下文不能被粗暴压缩，因为局部语法、指令和格式通常依赖原始 token 细节。

## 二、NSA 给出的答案：三条分支各司其职

Native Sparse Attention 论文的重要性在于把稀疏注意力做成可训练、硬件友好的原生结构。

论文里的 NSA 由三条并行分支组成：

- **Compressed attention**：把连续 token block 压成粗粒度表示，用于捕捉全局语义。
- **Selected attention**：根据压缩分支产生的 block 重要性，选择 top-n 连续原始 token block，保留细粒度信息。
- **Sliding attention**：保留最近窗口，专门处理局部依赖。

这个设计非常关键。只压缩，会丢掉块内细节；只选择 token，会有索引和内存访问开销；只看窗口，会漏掉远程信息。NSA 的思路是：用压缩分支做全局感知，用 blockwise selection 找回重要原文片段，用 sliding window 保住当前位置附近的高频局部模式。

论文还强调了“连续块”而不是“随机 token”的工程含义。连续 block 更符合 GPU/Tensor Core 的访问模式，也更接近 FlashAttention 一类高性能 kernel 的组织方式。NSA 在 64k context 的实验里报告了训练 forward 最高 9.0x、backward 最高 6.0x 的加速；decoding 阶段则把每步需要访问的 token 等价量从 65536 降到 5632，对应约 11.6x 的理论访问量优势。

这里有一个值得在分享时点出来的判断：稀疏注意力不是只看公式复杂度，真正难的是把稀疏模式变成硬件能吃满的连续块计算，并且让模型从预训练阶段就适应这种稀疏结构。

## 三、DeepSeek-V4 的注意力：CSA + HCA 的混合记忆系统

DeepSeek-V4 官方论文里，V4 系列把长上下文注意力明确写成 hybrid attention：CSA（Compressed Sparse Attention）和 HCA（Heavily Compressed Attention）交错使用。

报告称 V4-Pro 为 1.6T 参数、49B activated，V4-Flash 为 284B 参数、13B activated，二者都支持 1M context。更重要的是，报告给出了效率目标：在 1M context 下，V4-Pro 相比 DeepSeek-V3.2 只需要约 27% 单 token inference FLOPs 和 10% KV cache；V4-Flash 进一步降到约 10% FLOPs 和 7% KV cache。

CSA 可以拆成四步理解：

1. 先把每 m 个 token 的 KV 压成 1 个 compressed KV entry，序列长度约缩短为 1/m。
2. 用 lightning indexer 为当前 query 和压缩块打分。
3. 只选择 top-k 个 compressed KV entry 进入核心注意力。
4. 额外拼接最近 nwin 个未压缩 sliding window KV，补偿局部因果和近处细节。

HCA 则更像一个“超高压缩全局摘要层”。它使用更大的压缩率 m' >> m，把很多 token 压成一个 KV entry，然后在高度压缩后的短序列上做 attention。HCA 不追求像 CSA 那样按需选择 top-k，而是用更激进的压缩换全局覆盖。

V4 报告里还有几个容易被忽略但很工程化的细节：

- CSA/HCA 的 query 与 compressed KV entry 会额外做 RMSNorm，控制 attention logits 稳定性。
- RoPE 只施加在部分维度上，并对输出做位置抵消，让压缩 KV 的贡献仍然包含相对位置信息。
- KV 存储混用 BF16 与 FP8，indexer 计算使用 FP4，进一步降低长上下文推理成本。
- Sliding window 不是附属装饰，而是为了解决压缩块内不可见、近处 token 更相关、局部因果严格性这些具体问题。

这套设计可以概括为一句话：CSA 负责“远程压缩后按需取回”，HCA 负责“极长历史的粗粒度全局摘要”，sliding window 负责“当前位置附近的原始细节”。

![主动 KV 访问量公式投影](/articles/deepseek-v4-litekv/image2.png)

## 四、将 DeepSeek 注意力稀疏机制拆成可运行实验

LiteKV 构造了一个 synthetic retrieval case：在远程位置放一个 needle token，让它的 key 与 query 高度相似，并把它的 value 标记为目标信号。然后比较不同注意力策略能否找回这个远程信息，以及需要多少 KV entries 和 attention FLOPs。

当前 demo 支持五种模式：

- `dense`：完整看历史 token，作为正确性与成本上界。
- `sliding_window`：只看最近窗口，成本低，但远程目标在窗口外时必然漏检。
- `csa_lite`：每 4 个 token 均值压缩成一个 block，再 query-aware 选择 top-k compressed blocks。
- `csa_lite_local`：远程走 CSA-lite，近处保留未压缩 local window。
- `nsa_lite`：新增模式，模拟 NSA 的三分支：远程 compressed branch、top-k block 内原始 token selected branch、local window branch。

运行方式：

```bash
.venv/bin/python experiments/run_litekv.py
.venv/bin/python experiments/render_article_figures.py
```

主要产物：

- `results/metrics.csv`
- `results/metrics.json`
- `results/kv_cache_vs_context.png`
- `results/flops_vs_context.png`
- `results/latency_vs_context.png`
- `results/retrieval_accuracy.png`
- `results/retrieved_signal_vs_context.png`
- `results/topk_tradeoff.png`
- `results/attention_architecture_bridge.png`
- `results/active_kv_projection.png`

## 五、实验结果：块能召回，不等于细节无损

取 `context_length=4096`、`top_k=32`、`local_window=128`、`compression_ratio=4` 的代表 slice，结果如下：

| 模式 | KV bytes | FLOPs | Recall | Retrieved signal | 解释 |
| --- | ---: | ---: | ---: | ---: | --- |
| `dense` | 8,388,608 | 2,097,152 | 1.0 | 1.00 | 全量可见，成本最高 |
| `sliding_window` | 262,144 | 65,536 | 0.0 | 0.00 | 窗口外 needle 不可见 |
| `csa_lite` | 2,097,152 | 540,672 | 1.0 | 0.25 | 命中压缩块；value 被 4:1 稀释 |
| `csa_lite_local` | 2,293,760 | 589,824 | 1.0 | 0.25 | 局部保真；远程仍为压缩信号 |
| `nsa_lite` | 2,555,904 | 1,146,880 | 1.0 | 1.00 | 进入原始 token；细节信号恢复 |

这组数字比旧版 demo 更有解释力：

- `dense` 能精确找到目标，retrieved signal 为 1.00，但 KV 与 FLOPs 最大。
- `sliding_window` 成本最低，但远程 needle 在窗口外，recall 为 0。
- `csa_lite` 能选中目标所在 compressed block，所以 recall 为 1；但 4 个 token 被压成 1 个均值块，目标 value 被稀释到 0.25。
- `csa_lite_local` 证明 local window 能补局部细节，但远程目标如果仍在压缩块里，信号依旧是 0.25。
- `nsa_lite` 多访问 top-k 块内原始 token，成本高于 CSA-lite，但 retrieved signal 回到 1.00。这正好对应 NSA 论文中“只压缩会丢 fine-grained information，所以需要 selected attention”的动机。

![KV cache vs context](/articles/deepseek-v4-litekv/image3.png)

![FLOPs vs context](/articles/deepseek-v4-litekv/image4.png)

![Retrieval accuracy](/articles/deepseek-v4-litekv/image5.png)

![Retrieved signal vs context](/articles/deepseek-v4-litekv/image6.png)

![Top-k tradeoff](/articles/deepseek-v4-litekv/image7.png)

![Latency vs context](/articles/deepseek-v4-litekv/image8.png)

需要注意，LiteKV 的 latency 图只代表本地 Python demo timing，不代表 CUDA/MPS kernel 的生产性能。技术分享里更应该重点看 KV entries、FLOPs、recall 和 retrieved signal。

## 六、从 LiteKV demo 反推架构取舍

第一，sliding window 是必要但不充分的。它在局部语言建模上很有效，也能把成本压得很低，但它没有远程检索能力。只靠窗口把 context 做到 1M，体验上会变成“能放进去，但不一定能找回来”。

第二，压缩稀疏注意力的关键不是压缩本身，而是 query-aware selection。CSA-lite 的成本曲线说明，只要先把远程历史压成 block，再让 query 选 top-k block，就能大幅减少活跃 KV 和 score 数量。

第三，压缩召回和细节保真是两件事。CSA-lite 选中目标块，但 value 被压缩稀释；NSA-lite 通过 selected branch 进入块内原始 token，能把目标信号拿回来。这也是为什么真实架构不会只做一个“平均池化记忆”，而要把 compressed branch、selected branch、sliding branch 分工。

## 七、总结

DeepSeek-V4 的 1M 上下文把历史组织成分层记忆：近处保真，远处压缩，重要信息按需取回，超长历史保留粗粒度摘要。

这也是我认为长上下文模型真正的方向：窗口数字会越来越大，但体验的决定因素不是窗口上限，而是模型有没有一套高效、可训练、硬件友好的记忆管理机制。

## 参考资料

- `DeepSeek_V4.pdf`：重点阅读 2.3 Hybrid Attention with CSA and HCA。
- `Native_Sparse_Attention_2502.11089.pdf`：重点阅读 3.3 Algorithm Design、5 Efficiency Analysis、6 Discussion。
