import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ToolId = 'image-studio' | 'json' | 'base64' | 'url' | 'jwt' | 'uuid' | 'hash' | 'timestamp' | 'text' | 'color' | 'regex' | 'html' | 'xml' | 'sql' | 'json-types' | 'diff' | 'case' | 'text-cleaner' | 'markdown' | 'password' | 'number-base' | 'roman' | 'chmod' | 'url-parser' | 'http-status' | 'mime' | 'image-base64' | 'image-converter' | 'favicon' | 'svg-optimizer' | 'cron' | 'curl-to-code' | 'lorem' | 'ascii' | 'html-entities' | 'binary-text' | 'base64-file' | 'basic-auth' | 'chronometer' | 'device-info' | 'email-normalizer' | 'emoji-picker' | 'hmac' | 'iban' | 'ipv4-address' | 'ipv4-range' | 'ipv4-subnet' | 'ipv6-ula' | 'json-csv' | 'json-xml' | 'keycode' | 'list-converter' | 'mac-generator' | 'meta-tags' | 'numeronym' | 'otp' | 'password-strength' | 'percentage' | 'random-port' | 'slugify' | 'obfuscator' | 'svg-placeholder' | 'temperature' | 'nato' | 'unicode' | 'token' | 'ulid' | 'user-agent' | 'xml-json' | 'docker-compose' | 'json-yaml' | 'yaml-json' | 'yaml-viewer' | 'json-toml' | 'toml-json' | 'toml-yaml' | 'math-evaluator' | 'eta-calculator' | 'encryption' | 'json-diff' | 'camera-recorder' | 'safe-link' | 'mac-lookup' | 'regex-memo' | 'git-memo' | 'benchmark' | 'rsa-key-pair' | 'json-minify'
export type Category = '图片' | '编码' | '开发' | '文本' | '生成' | '转换' | '参考' | '安全' | '网络'
export type CategoryFilter = Category | '全部工具'

export type ToolDefinition = {
  id: ToolId
  name: string
  description: string
  category: Category
  icon: LucideIcon
  tags: string[]
  accent: string
  component: ComponentType
  sourceId?: string
  featured?: boolean
  fullPage?: boolean
  workspaceClassName?: string
}
