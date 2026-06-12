# Image Lab

内部多 API 生图测试台，支持 OpenAI 兼容生图接口、Provider 管理、文生图、改图、扩图、高清放大参数、资产库和参数复用。

这个仓库只上传了项目源码、依赖锁文件、Prisma 结构和示例配置。运行时生成的文件、密钥、本地数据库和上传图片没有上传，需要在自己的电脑或服务器上重新生成。

## 仓库里有什么

- `app/`：Next.js 页面和 API 路由。
- `lib/`：Provider 调用、加密、数据校验、Prisma 客户端等公共逻辑。
- `prisma/schema.prisma`：SQLite 数据库模型。
- `prisma/init.sql`：本地 SQLite 初始化 SQL。
- `public/uploads/.gitkeep`：保留上传目录，真正上传的图片不会进 Git。
- `.env.example`：环境变量模板。
- `package.json` / `package-lock.json`：依赖和脚本。

## 没有上传的东西

这些文件在 `.gitignore` 里被排除了，clone 之后需要自己生成或配置：

- `.env`：本地环境变量，里面会放数据库地址和 Provider 密钥加密用的密钥。
- `node_modules/`：依赖目录，通过 `npm install` 重新安装。
- `.next/`：Next.js 构建缓存/构建产物，通过 `npm run dev` 或 `npm run build` 自动生成。
- `tsconfig.tsbuildinfo`：TypeScript 增量编译缓存，自动生成。
- `prisma/dev.db`：本地 SQLite 数据库，运行初始化命令后生成。
- `public/uploads/*`：你上传到测试台的原图、结果图等本地素材。仓库只保留 `public/uploads/.gitkeep`。

没有上传这些文件是正常的：它们要么体积大，要么是本地生成物，要么包含密钥/业务数据，不适合放到 GitHub。

## 首次本地运行

先安装 Node.js，建议使用 Node.js 20 或更新版本。

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:init
npm run dev
```

启动后打开：

```text
http://localhost:3000
```

如果你的电脑没有 `sqlite3` 命令，`npm run db:init` 可能会失败。可以改用 Prisma 创建数据库：

```bash
npm run prisma:push
```

这两种方式的目的都是生成 `prisma/dev.db` 这个本地 SQLite 数据库。

## `.env` 怎么配

复制 `.env.example` 后会得到：

```env
DATABASE_URL="file:./dev.db"
PROVIDER_SECRET="replace-this-with-a-long-random-secret"
```

字段说明：

- `DATABASE_URL`：Prisma 的数据库地址。当前项目使用 SQLite，默认 `file:./dev.db` 表示数据库文件在 `prisma/dev.db`。
- `PROVIDER_SECRET`：用于加密保存 Provider API Key 的密钥。请改成一串足够长、随机、只有你自己知道的字符串。

注意：`PROVIDER_SECRET` 一旦用于保存 Provider 后，后面不要随便更换。因为数据库里保存的是加密后的 API Key，换掉这个密钥后，旧 Provider 的 API Key 可能无法解密，需要重新填写。

## Provider 怎么配

页面里的 Provider 是一个 OpenAI 兼容生图接口配置。每个 Provider 大致需要这些信息：

- 名称：自己好识别就行，比如 `OpenAI`、`Test API`、`公司内网生图服务`。
- Base URL：接口基础地址，不要填到具体方法路径。代码会自动拼接下面这些路径。
- API Key：对应平台的密钥，会用 `PROVIDER_SECRET` 加密后存入本地数据库。
- 默认模型：比如平台要求的图片模型名。
- 支持模式：按平台能力勾选文生图、改图、扩图、高清放大。

当前代码按 OpenAI 兼容接口调用：

- 文生图：`POST {baseUrl}/images/generations`
- 改图/扩图：`POST {baseUrl}/images/edits`
- 高清放大：`POST {baseUrl}/images/upscale`
- 测试连接：`GET {baseUrl}/models`

如果某个平台的路径、请求字段或返回字段不一样，需要在 `lib/openai-image.ts` 里加适配逻辑。

## 数据和图片存在哪里

- Provider 配置、任务记录、资产记录存在 `prisma/dev.db`。
- 上传图片和生成图片保存在 `public/uploads/`。
- 页面资产库读取的是数据库记录和 `public/uploads/` 里的文件。

如果你删除 `prisma/dev.db`，Provider、任务历史和资产记录会丢失。如果你删除 `public/uploads/` 里的图片，数据库记录可能还在，但页面图片会加载失败。

## 常用命令

```bash
npm run dev
```

启动开发环境。

```bash
npm run build
```

构建生产版本。

```bash
npm run start
```

启动已构建的生产版本，需要先运行 `npm run build`。

```bash
npm run prisma:generate
```

根据 `prisma/schema.prisma` 生成 Prisma Client。

```bash
npm run prisma:push
```

把 Prisma schema 同步到 SQLite 数据库。

```bash
npm run db:init
```

使用 `prisma/init.sql` 初始化 SQLite 数据库。需要本机安装 `sqlite3` 命令。

## 部署提醒

这个项目默认用 SQLite 和本地 `public/uploads/`，更适合本地测试台或单机部署。如果要部署到线上多人使用，建议额外考虑：

- 换成更稳定的数据库，例如 PostgreSQL。
- 图片上传改成对象存储，例如 S3、OSS、COS 等。
- 在部署平台配置环境变量，不要上传 `.env`。
- 固定并妥善保存 `PROVIDER_SECRET`。
- 给 Provider API Key 做权限隔离和额度限制。

## 常见问题

### 页面提示没有 Provider

先在页面左侧或设置区域新增 Provider，填好 Base URL、API Key、默认模型和支持模式，然后测试连接。

### 测试连接失败

检查 Base URL 是否只填了基础地址，检查 API Key 是否有效，并确认目标服务是否支持 `GET /models`。有些第三方平台不支持这个接口，但生图接口本身可能仍可用，这种情况需要按平台文档调整适配逻辑。

### 生成图片失败

常见原因是模型名不对、Provider 不支持当前模式、图片尺寸不在平台允许范围内、API Key 没额度或接口返回格式不兼容。可以先用最简单的文生图、`1024 x 1024`、`count = 1` 测试。

### 换电脑后原来的 Provider 不能用了

如果你复制了 `prisma/dev.db`，也要使用原来的 `PROVIDER_SECRET`。否则数据库里的 API Key 无法正确解密。更简单的办法是重新新建 Provider。
