# 多元探索 API（deepwl）— Grok 视频接入参考

> 来源：https://doc.deepwl.cn/zh （学习整理于 2026-07-19）
> Base URL：`https://zx1.deepwl.net`

## 1. 认证方式

| 场景 | 请求头 | 适用路由 |
|------|--------|----------|
| 绝大多数接口 | `Authorization: Bearer YOUR_API_KEY` | `/v1/*`、`/v1beta/*`、`/mj/*`、`/suno/*`、`/kling/v1/*`、`/dashboard/billing/*` |
| Claude 原生 | `x-api-key: KEY` + `anthropic-version: 2023-06-01` | `POST /v1/messages` |
| Gemini 原生 | `x-goog-api-key: KEY`（或 `?key=`） | `/v1beta/models/*` |

认证失败返回：relay 路由返回 `{"error": {"code": "invalid_api_key", ...}}`；`/api/*` 路由返回 `{"success": false, "message": "无效的令牌"}`。

## 2. 余额查询

- `GET /api/usage/token/` → API Key 维度额度（`total_granted` / `total_used` / `total_available`）
- `GET /dashboard/billing/subscription`、`GET /dashboard/billing/usage` → OpenAI 兼容结构

## 3. Grok 视频模型总览

### 3.1 模型清单

| 模型 | 请求格式 | 时长规则 | 清晰度 |
|------|----------|----------|--------|
| `grok-video-3` | multipart/form-data | 按传入 `seconds` | `size`: 720P/1080P |
| `grok-video-3-pro` | multipart/form-data | **固定 10s** | 同上 |
| `grok-video-3-max` | multipart/form-data | **固定 15s** | 同上 |
| `grok-imagine-video` | **JSON** | 自定义，最小 1s | `resolution`: 480P/720P |
| `grok-imagine-video-1.5-preview` | **JSON** | 自定义，最小 1s | `resolution`: 480P/720P |

### 3.2 两套接入链路

| 项目 | OpenAI 格式 | 统一视频（JSON） |
|------|-------------|------------------|
| 创建 | `POST /v1/videos`（multipart） | `POST /v1/video/create`（JSON） |
| 查询 | `GET /v1/videos/{task_id}` | `GET /v1/video/query?id={task_id}` |
| Remix | `POST /v1/videos/{video_id}/remix` | `POST /v1/video/remix`（Body 传 `task_id`） |
| Extend | `POST /v1/videos/{video_id}/extend` | `POST /v1/video/extend` |
| Extensions | `POST /v1/videos/extensions`（Body `video.url` 传原任务 ID） | 同左（两链路共用） |
| 参考图 | `input_reference`（文件，可多张） | `images`（URL/base64 数组，最多 6 张，prompt 里用 `@img1`/`@img2` 引用） |
| 时长字段 | `seconds` | `duration`（默认 10，支持 6/10/15） |

画幅 `aspect_ratio`：OpenAI 格式常用 `2:3`、`3:2`、`1:1`；统一视频支持 `16:9`、`9:16`、`2:3`、`3:2`、`1:1`。

## 4. 核心调用流程

### 4.1 提交任务（OpenAI 格式，multipart）

```bash
curl -X POST https://zx1.deepwl.net/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "model=grok-video-3" \
  -F "prompt=猫咪听歌摇头晃脑，下大雨" \
  -F "aspect_ratio=2:3" \
  -F "seconds=6" \
  -F "size=720P" \
  -F "input_reference=@reference.png"   # 图生视频时追加，可重复多张
```

响应：`{"id": "video_abc123", "object": "video", "status": "queued", "progress": 0, ...}`

### 4.2 提交任务（JSON 格式，grok-imagine 系列）

```json
POST /v1/videos  (Content-Type: application/json)
{
  "model": "grok-imagine-video",
  "prompt": "清晨的城市街道，镜头缓慢向前移动",
  "seconds": "8",
  "aspect_ratio": "16:9",
  "resolution": "720P",
  "image": "data:image/png;base64,..."
}
```

- `prompt` 最多 4096 字符；`seconds` 建议字符串，最小 `"1"`
- 单图用 `image`，多图用 `images`（数组），两者不共存
- `aspect_ratio` 支持 `1:1`/`16:9`/`9:16`/`4:3`/`3:4`/`3:2`/`2:3`/`2:1`/`1:2`/`19.5:9` 等及自定义 `数字:数字`

### 4.3 提交任务（统一视频，JSON）

```json
POST /v1/video/create
{
  "model": "grok-video-3",
  "prompt": "@img1 一只猫拿着刀追 @img2",
  "images": ["data:image/png;base64,...", "https://.../img2.png"],
  "aspect_ratio": "3:2",
  "size": "1080P",
  "duration": 6
}
```

- 文生视频 `images` 传 `[]`；首尾帧按顺序传 2 张；多图参考最多 6 张
- 响应：`{"id": "grok:xxx", "task_id": "...", "status": "processing"}`

### 4.4 轮询查询

```bash
# OpenAI 格式
curl https://zx1.deepwl.net/v1/videos/{task_id} -H "Authorization: Bearer KEY"
# 统一视频
curl "https://zx1.deepwl.net/v1/video/query?id=grok:xxx" -H "Authorization: Bearer KEY"
```

- 状态：`queued` → `processing` → `completed` / `failed` / `cancelled`
- 结果地址读取顺序：`output.url` → `video_url` → `url` → `detail.url`
- 直接下载失败时回退：`GET /v1/videos/{task_id}/content`
- 注意 `expires_at`：结果 URL 有过期时间，完成后应尽快下载转存

### 4.5 衍生能力（OpenAI 格式示例）

```bash
# Remix：基于原任务做变体
POST /v1/videos/{video_id}/remix
{"model":"grok-video-3","prompt":"...","aspect_ratio":"3:2","size":"1080P","parent_post_id":"..."}

# Extend：从原视频第 N 秒延展
POST /v1/videos/{video_id}/extend
{"model":"grok-video-3","prompt":"...","start_time":4,"size":"1080P","upscale":true}

# Extensions：独立入口做片段扩展（video.url 填任务 ID，不是播放链接）
POST /v1/videos/extensions
{"model":"grok-video-3","prompt":"...","start_time":4,"duration":6,"video":{"url":"grok:xxx"}}
```

三者均返回新任务 `{"id": "grok:...", "status": "processing"}`，再按 4.4 轮询。

## 5. 文件上传（公网素材 URL 的来源）

两步预签名上传（接口不直接收文件）：

```bash
# 第一步：签发上传地址
PUT /v1/file/upload
{"headers": {"Content-Type": "image/png"}, "params": {}}
# 响应：{"upload_url": "https://...?signature=...", "download_url": "https://...", "method": "PUT", "expire": 3600}

# 第二步：PUT 文件本体到 upload_url（Content-Type 必须一致）
curl -X PUT "{upload_url}" -H "Content-Type: image/png" --data-binary @local.png
```

之后把 `download_url` 传给接受公网 URL 的接口（如统一视频的 `images`）。过期时间默认 900s，范围 60–3600s。

## 6. 其他视频模型速查（同平台）

| 家族 | 代表模型 | 入口 | 参考图字段 |
|------|----------|------|-----------|
| Veo | `veo_3_1`、`veo_3_1-fast` | `/v1/videos` | JSON `input_reference` |
| Omni | `omni-fast`、`omni-fast-v2v` | `/v1/videos` | `first_image_url`/`last_image_url`/`images`/`video` |
| Seedance-2 | `doubao-seedance-2-0-260128` | `/v1/video/generations` + 素材库 `asset://` | `content[]` 多模态 |
| 国产 AIGC | Vidu/Kling/即梦/Hailuo/wan2.6 等 | `/v1/videos` | `image`/`images`/`input_reference` |

## 8. 实测发现（2026-07-19）

> 用 Key（aixt_xiongpinji，62 模型）对 grok-1.5-video-10s 实测的结论：

### 文档未收录的新型号
`/v1/models` 与 `/api/pricing` 中存在但文档未写的型号：
`grok-1.5-video-6s/10s/15s`、`grok-video-3-10s/15s`（type: video，$0.4/次，
enable_groups: default/grok-long，supported_endpoint_types: openai/openai-response）。

### 五条接入路径实测结果
| 路径 | 结果 |
|------|------|
| `POST /v1/video/create`（统一 JSON） | ❌ 上游 Nexus：`no usable platform found` |
| `POST /v1/videos`（multipart，文档标准） | ❌ 同上 |
| `POST /v1/videos`（JSON） | ❌ 同上 |
| `POST /v1/chat/completions` | ⚠️ 到达 grok 智能体，但回复“无视频生成能力”（渠道配置不含视频工具） |
| `POST /v1/responses` | ❌ `bad_response_status_code` |

### 结论
调用方式与文档完全一致（kling-2.5-720p 用相同请求形态端到端成功），
**grok 全系列视频模型是平台上游未配置/故障，非客户端问题**。
报障可附 Nexus Trace ID（如 `e925a779d537ffcb41c9514a18701f6a`）。

### 附带发现
- kling 等模型只走 `POST /v1/videos`（JSON），结果在查询响应的 `metadata.url`
- 统一查询 `GET /v1/video/query?id=` 可同时查 OpenAI 格式创建的任务
- 平台分组体系：令牌分组决定可用渠道（如 codex 组无视频渠道；default/grok-long 组有 grok 视频定价）

## 7. 接入注意点

1. **异步任务制**：所有视频生成都是「提交 → 拿 task_id → 轮询 → 取 video_url」
2. **格式别混用**：`grok-video-3*` 走 multipart + `input_reference`；`grok-imagine-*` 走 JSON + `image`/`images` + `resolution`
3. **固定时长**：Pro=10s、Max=15s，传错会被服务端纠正
4. **结果会过期**：`expires_at` 之后 video_url 失效，务必及时下载
5. **任务 ID 格式**：统一链路返回的 ID 常带 `grok:` 前缀，作为路径参数时需 URL encode
