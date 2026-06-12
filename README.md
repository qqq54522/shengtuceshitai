# Image Lab

内部多 API 生图测试台，支持 OpenAI 兼容生图接口、Provider 管理、文生图、改图、扩图、高清放大参数、资产库和参数复用。

## 本地运行

```bash
npm install
npm run prisma:generate
npm run db:init
npm run dev
```

依赖会安装在当前项目的 `node_modules/`，数据库在 `prisma/dev.db`，上传图片在 `public/uploads/`。这些都属于当前项目，不会影响其他环境。

复制 `.env.example` 为 `.env` 后可以改自己的 `PROVIDER_SECRET`。当前仓库已包含本地 `.env` 方便直接测试。

## Provider 说明

Provider 使用 OpenAI 兼容接口：

- 文生图：`POST {baseUrl}/images/generations`
- 改图/扩图：`POST {baseUrl}/images/edits`
- 高清放大：`POST {baseUrl}/images/upscale`
- 测试连接：`GET {baseUrl}/models`

不同第三方平台如果路径或字段不一致，后续可以在 `lib/openai-image.ts` 增加适配器。
