# 茉莉妈妈2 后端服务

## deepwl 平台客户端（视频 + 图像生成）

封装多元探索（deepwl）及同源平台（aihubcc 等 New API 系）的多媒体生成能力。
零第三方依赖，要求 Node.js ≥ 18（原生 `fetch` / `FormData` / `Blob`）。

- API 文档整理：[`../docs/deepwl-api-grok-video.md`](../docs/deepwl-api-grok-video.md)、[`../docs/aihubcc-api-integration.md`](../docs/aihubcc-api-integration.md)

### 配置

```bash
cp .env.example .env   # 填入 DEEPWL_API_KEY
```

| 环境变量 | 说明 | 默认 |
|----------|------|------|
| `DEEPWL_API_KEY` | 平台 API Key（必填） | — |
| `DEEPWL_BASE_URL` | API 地址（可指向同源其他平台） | `https://zx1.deepwl.net` |

### 能力总览

| 能力 | 高层函数 | 底层 |
|------|----------|------|
| 视频生成（Grok/Kling/Omni/Veo） | `generateVideo(opts)` | `createVideo` / `queryTask` / `waitForTask` |
| Grok Chat 视频（video_config） | `generateGrokChatVideo(opts)` | `chatVideo` |
| Remix / Extend | — | `remixVideo` / `extendVideo` |
| 文生图（1K 同步） | `generateImageNow(opts)` | `generateImage` |
| 图生图（multipart） | `editImageNow(opts)` | `editImage` |
| 高清图（2K/3.5K/4K 异步） | `generateImageHD(opts)` | `createImageTask` |
| 文件上传 | — | `uploadFile`（预签名两步） |
| 余额 | — | `getBalance` |

### 快速开始

```js
const {
  generateVideo, generateGrokChatVideo,
  generateImageNow, editImageNow, generateImageHD,
} = require('./src/services/deepwl');

// 视频（提交+轮询+下载）
await generateVideo({
  endpoint: 'openai',            // 'openai'(/v1/videos，omni/kling) 或 'unified'(/v1/video/create)
  model: 'kling-2.5-720p',
  prompt: '猫咪听歌摇头晃脑',
  images: [],                    // 文生传 []；图生传 URL 数组
  duration: 5,
  outputDir: 'output/videos',
  onProgress: (i) => console.log(i.status, i.progress),
});

// Grok Chat 视频（流式进度）
await generateGrokChatVideo({
  model: 'grok-1.5-video-10s',
  prompt: 'A cat in the rain, cinematic',
  seconds: 10, size: '1280x720', public_url: true, stream: true,
  outputDir: 'output/videos',
});

// 1K 同步文生图
await generateImageNow({ prompt: '橘猫水彩画', outputDir: 'output/images' });

// 2K/4K 异步高清图
await generateImageHD({ model: 'gpt-image-2-2k', prompt: '产品摄影', outputDir: 'output/images' });
```

### 运行示例

```bash
node --env-file=.env examples/text2video.js          # 文生视频
node --env-file=.env examples/image2video.js 图.png   # 图生视频
node --env-file=.env examples/omni-video.js           # Omni（Gemini Veo）
node --env-file=.env examples/image-gen.js            # GPT-Image-2
node --env-file=.env examples/grok-chat-video.js      # Grok Chat 视频
```

### 自测

```bash
npm run selftest   # 15 项用例，本地 mock，无需真实 Key
```

### 关键注意点

1. **任务 ID 常带 `grok:` 前缀**，已自动清洗为合法文件名
2. **结果 URL 会过期**，高层函数完成后立即下载
3. **高清图任务的 `video_url` 字段是图片地址**，不是视频
4. **multipart 绝不手动设 Content-Type**（库自动带 boundary，否则网关 500）
5. **omni 结果在 `data[0].url`** 且可能是相对路径，已自动补全
6. 结果提取兼容 `output.url` / `video_url` / `url` / `detail.url` / `metadata.url` / `data[0].url`
7. 所有模型**失败不计费**（平台规则）；内容审查被拒须改提示词，重试无用
