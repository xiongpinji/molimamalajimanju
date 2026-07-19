# aihubcc API 接入参考（Omni / Grok 视频 / GPT-Image-2）

> 来源：飞书文档《aihubcc客户 API 接入文档》（2026-07-10）
> 平台 A：`https://newapi.oairegbox.cc/v1`　平台 B：`https://newapi-2.oairegbox.cc/v1`
> （两平台能力一致，账号令牌独立不互通；鉴权统一 `Authorization: Bearer sk-xxx`）
> 提取的全文存档：`output/feishu-aihubcc-doc.txt`

## 0. 通用规则

- **同步能力**：文本、部分图像与音乐接口直接返回
- **异步能力**：视频及高清图像 → 提交任务 → 轮询 `GET /v1/videos/{task_id}` → 下载
- **失败一律不扣费**，成功出片/出图才计费
- 令牌分组必须与模型匹配，错误分组返回"无可用渠道"
- 错误码：400 参数问题 / 401 鉴权 / 404 路径错误（勿重复 /v1）/ 429 限速 / 5xx 直接重试

## 1. Omni 视频生成（基于 Gemini Veo）

### 模型
| 模型 | 能力 |
|------|------|
| `omni-fast` | 文生视频 / 图生视频 |
| `omni-fast-v2v` | 视频转视频（V2V） |
| `omni-fast-no-water` | 无水印版（多一个清洗 processing 阶段，稍慢） |
| `omni-fast-v2v-no-water` | V2V 无水印版 |

### 接口
- 提交：`POST /v1/videos`（JSON 或 multipart）
- 轮询：`GET /v1/videos/{task_id}`
- 下载：`GET /v1/videos/{task_id}/content` 或返回的 `data[0].url`
- **令牌分组：`gemini-高速`**

### 核心参数
| 参数 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `model` | 是 | - | 见上表 |
| `prompt` | 是 | - | 视频描述 |
| `aspect_ratio` | 否 | 16:9 | 仅 16:9 / 9:16（9:16 尽力而为） |
| `seconds`/`duration` | 否 | 10 | Gemini 固定输出约 10s |
| `image_url` | 否 | - | 单张参考图（URL 或 base64） |
| `first_image_url`/`last_image_url` | 否 | - | 首/末帧 |
| `video`/`video_url` | 否 | - | V2V 源视频（≤8MB、≤1920x1080） |
| `videos` | 否 | - | V2V 双源数组（最多 2 个） |
| `images` | 否 | - | 多参考图（最多 5 张，每张 ≤8MB） |

multipart 文件字段：`input_reference`（图，≤5 张）、`input_video`/`input_video2`（V2V，≤2 个）。

### 注意
- 生成 1-5 分钟，轮询间隔 5-10s；输出固定 720p
- 真人面孔参考图可能触发 Google 内容策略（见文末避坑指南）

## 2. Grok 视频（基于 xAI Grok Imagine）⭐重点

### 2.1 统一接口：`POST /v1/chat/completions`（按模型自动分发图像/视频）

```bash
curl https://YOUR_BASE/v1/chat/completions \
  -H "Authorization: Bearer sk-xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-video",
    "stream": true,
    "messages": [{"role":"user","content":"灯塔在日落时分，海浪拍打礁石"}],
    "video_config": {"seconds": 10, "size": "1280x720", "public_url": true}
  }'
```

图生视频：messages content 用数组 `[{"type":"text","text":"让画面动起来"},{"type":"image_url","image_url":{"url":"https://..."}}]`

**`video_config` 参数：**
| 参数 | 取值 | 默认 | 说明 |
|------|------|------|------|
| `seconds` | 6/10/12/16/20 | 6 | 最长 20s（16/20s 约 2-3 分钟） |
| `size` | 720x1280 / 1280x720 / 960x960 | 720x1280 | 仅 3 种 |
| `public_url` | true/false | false | 建议 true，返回完整下载链接 |

- `stream:true` 会推送「视频正在生成 NN%」进度
- 参考图最多 7 张，`@IMAGE1...@IMAGE7` 占位符；提示词 ≤4500 字符
- 客户端超时 ≥300s；**令牌必须为 grok 分组**
- 也支持 `POST /v1/videos`（multipart + 轮询）异步方式

### 2.2 CLI 专线：`POST /v1/videos`（仅异步，官方通道更稳）

| 模型 | 说明 |
|------|------|
| `grok-imagine-video-cli` | 标准生成 |
| `grok-imagine-video-cli-edit` | 视频局部编辑 |
| `grok-imagine-video-1.5-cli` | 1.5 图生视频（仅单图，必须带 `input_reference`；不支持文生/多图/编辑） |

生成参数：`prompt`、`seconds`（文生/单图 ≤15s，多图 ≤10s）、`size`（720x1280/1280x720）、`aspect_ratio`（1:1/16:9/9:16/4:3/3:4/3:2/2:3，可替代 size）、`resolution`（480p/720p 定短边）、`input_reference`（单首帧）、`reference_images`（≤10 张，与 input_reference 二选一）。

编辑参数（cli-edit）：`prompt` 只写要改的内容（如 "add a gold necklace"）；`video` 源视频三选一：①公网直链 `{"url":"https://..."}` ②base64 `{"url":"data:video/mp4;base64,..."}` ③multipart `-F video=@源.mp4`。源视频 ≤8.7s、≤25MB、H.264 MP4。②③平台临时转存约 2h。

失败提示已中文化：高峰限流/瞬时异常（平台自动换号重试，仍败则稍后重试）、xAI 审核拒（改提示词）、图片读取失败（换直链/base64）、源视频过长（裁剪 ≤8.7s）。

## 3. GPT-Image-2（文生图/图生图/Chat 生图）

### 3.1 三种调用
| 接口 | 方式 | 用途 |
|------|------|------|
| `POST /v1/images/generations` | JSON | 文生图 |
| `POST /v1/images/edits` | multipart | 图生图 |
| `POST /v1/chat/completions` | Chat | 对话生图（参考图须 base64） |

参数：`prompt`、`model`（默认 gpt-image-2）、`n`（1-4）、`size`（1024x1024/1536x1024/1024x1536/auto，只控比例≈150万像素）、`quality`（auto/low/medium/high）、`response_format`（b64_json 默认 / url 推荐）。

⚠️ `/v1/images/edits` 必须合法 multipart（curl `-F` / requests `files=`），**切勿手动设 Content-Type 或手拼 body**，否则 500 failed to parse multipart form。参考图 ≤2K（长边 ≤2048）。响应 15-60s，超时 ≥120s。

### 3.2 多档生图
| 模型 | 分辨率 | 方式 |
|------|--------|------|
| `gpt-image-2-1k` | ~1024² | **同步** `/v1/images/generations`（30-40s） |
| `gpt-image-2-2k` | ~2048² | **异步** `/v1/videos`（提交→轮询→`video_url` 取图） |
| `gpt-image-2-3.5k` / `gpt-image-2-4k` | ~2880² | 异步同上 |

异步返回的 `video_url` 字段是**图片**地址不是视频。图生图参考图 ≤6 张、总和 ≤5MB（别名 reference_images/images）。

## 4. 内容审查避坑指南（omni/veo 适用）

六大高危雷区：①可识别真人/名人（photorealistic+真人=最高危）②未成年人（零容忍）③性/裸露 ④暴力/血腥/危险 ⑤版权 IP（动漫角色/品牌 logo/影视形象）⑥医疗病症/政治/毒品/仇恨。

万能保险公式：**非写实风格 + 虚构不具名主体 + 脸部不可识别（背/侧/远景）+ 内容健康无版权**。

两类报错分清：「temporarily unavailable」→ 可重试；「didn't pass content review」→ 确定性拒绝，重试无用，必须改内容。

## 5. 其他

- **Gemini 图像**：`gemini-image` / `gemini-image-pro`，`POST /v1/images/generations`，`image` 支持字符串或数组（≤5 张每张 ≤5MB），`mask` 可局部重绘
- **Gemini 音乐**：`gemini-music`，走 `/v1/chat/completions`
- **Veo-Clean 去水印**：multipart 上传带水印视频（≤20MB），异步返回，20-60s，不消耗生成配额

## 6. 与 deepwl 平台的关系（已实测）

模型命名与分组体系（grok-cli / grok-long / gemini-高速）高度相似，疑似同源上游。

deepwl 实测结论（2026-07-19，模型 grok-1.5-video-10s）：
| 尝试 | 结果 |
|------|------|
| `/v1/chat/completions` 无 video_config | 智能体直接拒绝 |
| 加 `video_config` + `stream:false` | 触发媒体生成，但只产出**图片** |
| 加 `video_config` + `stream:true` | 智能体启动视频工作流（读 ffmpeg skill、规划分镜、准备生成帧），**最终仍回复“视频能力不可用”**，退化为图片 |
| `/v1/videos`、`/v1/video/create` | 上游 Nexus 无可用平台 |

**结论：请求格式已确认正确（与本文档一致），是 deepwl 的 grok 视频上游渠道未完成配置。**
如需立即可用的 grok 视频，可使用本文档的 aihubcc 平台（需 grok 分组令牌）。
