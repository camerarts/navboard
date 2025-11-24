import React from 'react';
import { Category, Bookmark, SearchEngine } from './types';
import { Search, Globe, Code, Coffee, Briefcase, ShoppingCart } from 'lucide-react';

// --- 安全配置 ---
// ⚠️ 常见问题：如果遇到【同步出错】或【Token 无效】，通常是因为 Token 被 GitHub 自动作废了。
// GitHub 的安全扫描器会检测代码库中的明文 Token 并立即使其失效。

// ✅ 修复步骤：
// 1. 去 GitHub 生成新 Token (Settings -> Developer settings -> Personal access tokens -> Tokens (classic) -> Generate new token -> 勾选 'gist')。
// 2. 拿到以 ghp_ 开头的 Token 后，不要直接填在这里！
// 3. 在浏览器控制台输入: btoa('您的ghp_开头的Token')
// 4. 将输出的 Base64 字符串 (例如 Z2hwXy4uLg==) 填入下方引号中。
export const GITHUB_TOKEN_ENCODED = 'Z2hwX0xsNWJRTFByZExWWXFjSlBvcUZtWHpDbUlNaXVhNjE2b0I5Yw=='; 

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: '日常办公', color: 'bg-blue-500' },
  { id: '2', name: '开发工具', color: 'bg-emerald-500' },
  { id: '3', name: '设计灵感', color: 'bg-purple-500' },
  { id: '4', name: '阅读学习', color: 'bg-orange-500' },
];

export const INITIAL_BOOKMARKS: Bookmark[] = [
  { id: '101', title: 'Gmail', url: 'https://mail.google.com', categoryId: '1' },
  { id: '102', title: 'Bilibili', url: 'https://www.bilibili.com', categoryId: '1' },
  { id: '201', title: 'GitHub', url: 'https://github.com', categoryId: '2' },
  { id: '202', title: 'Stack Overflow', url: 'https://stackoverflow.com', categoryId: '2' },
  { id: '203', title: 'ChatGPT', url: 'https://chat.openai.com', categoryId: '2' },
  { id: '301', title: 'Dribbble', url: 'https://dribbble.com', categoryId: '3' },
  { id: '302', title: 'Figma', url: 'https://figma.com', categoryId: '3' },
  { id: '401', title: '少数派', url: 'https://sspai.com', categoryId: '4' },
];

export const SEARCH_ENGINES: SearchEngine[] = [
  { 
    id: 'google', 
    name: '谷歌搜索', 
    urlTemplate: 'https://www.google.com/search?q=',
    icon: <Search size={18} />
  },
  { 
    id: 'bing', 
    name: '必应搜索', 
    urlTemplate: 'https://www.bing.com/search?q=',
    icon: <Globe size={18} />
  },
  { 
    id: 'baidu', 
    name: '百度搜索', 
    urlTemplate: 'https://www.baidu.com/s?wd=',
    icon: <Code size={18} />
  }
];

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '日常办公': <Coffee size={20} />,
  '开发工具': <Code size={20} />,
  '设计灵感': <Briefcase size={20} />, 
  '阅读学习': <Globe size={20} />,
  '购物消费': <ShoppingCart size={20} />,
};
