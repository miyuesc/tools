# Lumen Tools

一个面向开发者的现代本地工具箱。参考 [IT-Tools](https://github.com/CorentinTh/it-tools) 的本地优先理念重新设计，所有转换都在浏览器内完成，不需要登录，也不会上传输入内容。

## 已有工具

- JSON 格式化、压缩与校验
- Base64 / URL 编解码
- JWT 内容解码
- UUID v4 批量生成
- SHA-1 / SHA-256 / SHA-512 摘要
- Unix 时间戳转换
- 文本统计
- HEX / RGB / HSL 颜色转换
- 正则表达式测试

站点还包含命令面板搜索、分类筛选、收藏、最近使用、明暗主题与移动端导航。

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
