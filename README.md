# Lumen Tools

Lumen Tools 是一组在浏览器中运行的开发工具，设计参考了 [IT-Tools](https://github.com/CorentinTh/it-tools)。无需登录，输入内容不会上传到服务器。

## 已有工具

- 图片编辑：无限工作区、原始像素渲染、多选、裁剪、吸附，以及按内容边界复制或导出透明 PNG
- JSON 格式化、压缩与校验
- Base64 / URL 编解码
- JWT 内容解码
- UUID v4 批量生成
- SHA-1 / SHA-256 / SHA-512 摘要
- Unix 时间戳转换
- 文本统计
- HEX / RGB / HSL 颜色转换
- 正则表达式测试
- HTML / XML / SQL 格式化、SVG 压缩
- JSON 转 TypeScript、Markdown 转 HTML、文本差异比较
- 文本清理、大小写转换、密码生成、进制转换、罗马数字转换
- chmod 权限计算、URL 解析、HTTP 状态码和 MIME 类型参考
- 图片转 Base64、PNG / JPEG / WebP 转换、Favicon 生成
- Basic Auth、HMAC、AES-GCM、OTP、RSA 密钥对、IBAN 和密码强度分析
- IPv4 地址/范围/子网、IPv6 ULA、MAC 地址、User Agent 和安全链接
- JSON / YAML / TOML / XML / CSV 互转、数学表达式、ETA、摄像头录制

目前共 88 个工具，其中 78 个入口带有官方 `src/tools/<source-id>` 对应关系。对应关系保存在 `src/tools/registry.ts` 的 `sourceId` 字段，工具详情页会显示官方目录名。站点支持命令搜索、分类筛选、收藏、最近打开、明暗主题和移动端导航；扩展工具集中在 `src/tools/extended/index.tsx` 与 `src/tools/advanced.tsx`。

尚未直接实现的官方目录主要是依赖大型词库或第三方运行时的工具（Bcrypt、BIP39、电话解析、PDF 签名、QR/Wi-Fi QR、完整 MAC OUI 数据库等），以及需要外部网络服务的 DNS、Ping、Whois、IP 地理位置类工具；这些入口没有伪造对应关系或空壳功能。

## 本地开发

要求 Node.js 22+。

```bash
npm install
npm run dev
```

生产校验：

```bash
npm run lint
npm run build
npm run preview
```

## 发布到 Cloudflare Pages

### 本地直接发布

先登录 Cloudflare：

```bash
npx wrangler login
```

首次创建 Pages 项目：

```bash
npx wrangler pages project create lumen-tools --production-branch=main
```

以后运行：

```bash
npm run deploy
```

### GitHub 推送后自动发布

仓库已包含 [Cloudflare Pages 工作流](.github/workflows/cloudflare-pages.yml)。在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

- `CLOUDFLARE_API_TOKEN`：拥有 Cloudflare Pages Edit 权限的 API Token
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Account ID

推送到 `main` 后，GitHub Actions 会先检查并构建，再把 `dist` 发布到 `lumen-tools.pages.dev`。也可以从 Actions 页面手动触发。

> Cloudflare Direct Upload 项目和 Git Integration 项目不能原地互相切换。当前配置使用 Direct Upload + GitHub Actions。

## 推送到 GitHub

```bash
git init
git add .
git commit -m "feat: launch Lumen Tools"
git branch -M main
git remote add origin git@github.com:<your-account>/lumen-tools.git
git push -u origin main
```

## 技术栈

React 19、TypeScript、Vite、Lucide Icons、Cloudflare Pages。

## License

[MIT](LICENSE)
