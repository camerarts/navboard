
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Settings, User, LogOut, FolderPlus, Check, Compass, ChevronRight, ChevronLeft, Sun, Moon, Zap, X, Edit2, Download, Upload, Cloud, RefreshCw, AlertCircle } from 'lucide-react';
import SearchBar from './components/SearchBar';
import CategoryGroup from './components/CategoryGroup';
import BookmarkModal from './components/BookmarkModal';
import CategoryModal from './components/CategoryModal';
import LoginModal from './components/LoginModal';
import SiteConfigModal from './components/SiteConfigModal';
import DashboardWidgets from './components/DashboardWidgets';
import SyncModal from './components/SyncModal';
import { useGitHubSync } from './hooks/useGitHubSync';
import { Bookmark, Category } from './types';
import { INITIAL_BOOKMARKS, INITIAL_CATEGORIES, CATEGORY_ICONS } from './constants';

type ThemeType = 'light' | 'dark' | 'cyberpunk';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(INITIAL_BOOKMARKS);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // UI State
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSiteConfigModalOpen, setIsSiteConfigModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Theme State
  const [theme, setTheme] = useState<ThemeType>('light');
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Drag State
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  // App Config State
  const [appName, setAppName] = useState('FlatNav');
  const [appFontSize, setAppFontSize] = useState('text-xl');
  const [appSubtitle, setAppSubtitle] = useState('Dashboard');

  // --- GitHub Sync Hook Integration ---
  const { 
    token, setToken, autoSync, setAutoSync, status: syncStatus, lastSuccessTime, pushData, pullData 
  } = useGitHubSync();

  // --- Data Getter for Sync ---
  const getDashboardData = () => {
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      bookmarks,
      categories,
      config: {
        appName,
        appSubtitle,
        appFontSize,
        theme
      }
    };
  };

  // --- Data Restoration ---
  const handleLoadDashboardData = (json: any) => {
      if (json.bookmarks && Array.isArray(json.bookmarks)) setBookmarks(json.bookmarks);
      if (json.categories && Array.isArray(json.categories)) {
          setCategories(json.categories);
          // If current active category is invalid, reset it
          if (activeCategoryId && !json.categories.find((c: Category) => c.id === activeCategoryId)) {
               if (json.categories.length > 0) setActiveCategoryId(json.categories[0].id);
          }
      }
      
      if (json.config) {
          if (json.config.appName) {
              setAppName(json.config.appName);
              localStorage.setItem('flatnav_app_name', json.config.appName);
          }
          if (json.config.appSubtitle) {
              setAppSubtitle(json.config.appSubtitle);
              localStorage.setItem('flatnav_app_subtitle', json.config.appSubtitle);
          }
          if (json.config.appFontSize) {
              setAppFontSize(json.config.appFontSize);
              localStorage.setItem('flatnav_app_font_size', json.config.appFontSize);
          }
           if (json.config.theme) setTheme(json.config.theme);
      }
  };

  const handleManualUpload = () => {
      pushData(getDashboardData());
  };

  const handleManualDownload = async () => {
      try {
          const data = await pullData();
          if (data) {
              handleLoadDashboardData(data);
              alert('数据恢复成功！页面将刷新以应用所有更改。');
              setTimeout(() => window.location.reload(), 500);
          }
      } catch (e) {
          console.error(e);
          alert('恢复失败，请检查控制台或 Token 设置');
      }
  };

  // --- Auto-Sync PUSH Effect ---
  const isFirstRender = useRef(true);
  useEffect(() => {
      // Skip initial render to avoid syncing default state over cloud state
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }

      // Only push if autoSync is enabled AND we have a token AND the data is loaded (not empty default overriding cloud)
      if (autoSync && token) {
          const timer = setTimeout(() => {
              // Push changes silently (true = silent)
              pushData(getDashboardData(), true);
          }, 3000); // 3 seconds debounce

          return () => clearTimeout(timer);
      }
  }, [bookmarks, categories, appName, appSubtitle, appFontSize, theme, autoSync, token, pushData]);

  // --- Auto-Sync PULL Effect (On Mount) ---
  useEffect(() => {
    // 定义一个异步函数来处理初始数据加载
    const initCloudData = async () => {
        // 只有当 Token 存在时才尝试同步（Token 可能来自 constants 硬编码或 localStorage）
        if (token) {
            try {
                console.log('Auto-sync: Checking for cloud updates...');
                const data = await pullData();
                if (data) {
                    handleLoadDashboardData(data);
                    console.log('Auto-sync: Data synchronized from cloud.');
                }
            } catch (e: any) {
                // 如果是 404 或其他错误，通常不需要打扰用户，但在控制台记录
                console.warn('Auto-sync startup info:', e.message);
            }
        }
    };
    
    // 延迟一点执行，确保 React 状态稳定，且让用户先看到 UI 骨架
    const timer = setTimeout(() => {
        initCloudData();
    }, 500);

    return () => clearTimeout(timer);
  }, [token, pullData]); // 依赖项包含 token，确保一旦 Token 被解码或加载，立即触发同步

  // Initialize state from LocalStorage (Fallback if cloud fails or no token)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }

    const storedBookmarks = localStorage.getItem('flatnav_bookmarks');
    const storedCategories = localStorage.getItem('flatnav_categories');
    const storedTheme = localStorage.getItem('flatnav_theme') as ThemeType;
    const storedAppName = localStorage.getItem('flatnav_app_name');
    const storedAppFontSize = localStorage.getItem('flatnav_app_font_size');
    const storedAppSubtitle = localStorage.getItem('flatnav_app_subtitle');

    // Only load from local storage if state is currently empty/default to avoid overwriting cloud pull
    // However, since Cloud Pull is async, we load Local first to show *something* fast.
    if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
    if (storedCategories) {
        const parsedCats = JSON.parse(storedCategories);
        setCategories(parsedCats);
        if (parsedCats.length > 0) setActiveCategoryId(parsedCats[0].id);
    } else {
        if (INITIAL_CATEGORIES.length > 0) setActiveCategoryId(INITIAL_CATEGORIES[0].id);
    }
    
    if (storedTheme) {
        setTheme(storedTheme);
    }

    if (storedAppName) setAppName(storedAppName);
    if (storedAppFontSize) setAppFontSize(storedAppFontSize);
    if (storedAppSubtitle) setAppSubtitle(storedAppSubtitle);
  }, []);

  // Persist changes to LocalStorage
  useEffect(() => {
    localStorage.setItem('flatnav_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('flatnav_categories', JSON.stringify(categories));
  }, [bookmarks, categories]);

  // Persist Theme
  useEffect(() => {
      localStorage.setItem('flatnav_theme', theme);
  }, [theme]);

  const handleLogin = (password: string): { success: boolean; message?: string } => {
    const ADMIN_PASSWORD = '1211';
    const today = new Date().toLocaleDateString();
    const lastAttemptDate = localStorage.getItem('flatnav_last_attempt_date');
    let attempts = parseInt(localStorage.getItem('flatnav_login_attempts') || '0', 10);

    if (lastAttemptDate !== today) {
        attempts = 0;
        localStorage.setItem('flatnav_login_attempts', '0');
        localStorage.setItem('flatnav_last_attempt_date', today);
    }

    if (attempts >= 3) {
        return { success: false, message: '安全警告：今日密码错误次数过多，本设备已禁止登录。请明日再试。' };
    }

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('flatnav_login_attempts', '0');
      return { success: true };
    } else {
      attempts += 1;
      localStorage.setItem('flatnav_login_attempts', attempts.toString());
      localStorage.setItem('flatnav_last_attempt_date', today);
      
      if (attempts >= 3) {
           return { success: false, message: '安全警告：今日密码错误次数过多，本设备已禁止登录。请明日再试。' };
      }
      return { success: false, message: `密码错误。今日剩余尝试次数：${3 - attempts}` };
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsEditMode(false); 
  };

  const handleExportData = () => {
    const data = getDashboardData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flatnav-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        handleLoadDashboardData(json);
        alert('数据导入成功！您的书签和设置已恢复。');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        alert('导入失败：文件格式不正确');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveBookmark = (newBookmarkData: Omit<Bookmark, 'id'>) => {
    if (editingBookmark) {
        setBookmarks(prev => prev.map(b => b.id === editingBookmark.id ? { ...b, ...newBookmarkData } : b));
    } else {
        const newBookmark: Bookmark = {
            ...newBookmarkData,
            id: Date.now().toString(),
        };
        setBookmarks(prev => [...prev, newBookmark]);
    }
    setEditingBookmark(null);
  };

  const handleDeleteBookmark = (id: string) => {
      setBookmarks(prev => prev.filter(b => b.id !== id));
  }

  const handleSaveCategory = (categoryData: { id?: string; name: string; color: string }) => {
      if (categoryData.id) {
          setCategories(prev => prev.map(c => c.id === categoryData.id ? { ...c, name: categoryData.name, color: categoryData.color } : c));
      } else if (editingCategory) {
          setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryData, id: c.id } : c));
      } else {
          const newCategory: Category = {
              id: Date.now().toString(),
              name: categoryData.name,
              color: categoryData.color
          };
          setCategories(prev => [...prev, newCategory]);
      }
      setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
      setCategories(prev => prev.filter(c => c.id !== id));
      setBookmarks(prev => prev.filter(b => b.categoryId !== id));
  };

  const handleSaveSiteConfig = (name: string, fontSize: string, subtitle: string) => {
      setAppName(name);
      setAppFontSize(fontSize);
      setAppSubtitle(subtitle);
      localStorage.setItem('flatnav_app_name', name);
      localStorage.setItem('flatnav_app_font_size', fontSize);
      localStorage.setItem('flatnav_app_subtitle', subtitle);
  };

  const scrollToCategory = (categoryId: string) => {
      setActiveCategoryId(categoryId);
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
      }
  };

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
      if (!isEditMode) return;
      setDraggedCategoryIndex(index);
      e.dataTransfer.setData('type', 'category');
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (!isEditMode) return;

      if (e.dataTransfer.getData('type') === 'category' && draggedCategoryIndex !== null) {
          if (draggedCategoryIndex !== dropIndex) {
              const newCategories = [...categories];
              const [movedCategory] = newCategories.splice(draggedCategoryIndex, 1);
              newCategories.splice(dropIndex, 0, movedCategory);
              setCategories(newCategories);
          }
          setDraggedCategoryIndex(null);
      }
  };

  const handleMoveBookmark = (draggedId: string, targetId: string) => {
      const newBookmarks = [...bookmarks];
      const draggedIndex = newBookmarks.findIndex(b => b.id === draggedId);
      const targetIndex = newBookmarks.findIndex(b => b.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const draggedItem = newBookmarks[draggedIndex];
      const targetItem = newBookmarks[targetIndex];

      if (draggedItem.categoryId !== targetItem.categoryId) {
          draggedItem.categoryId = targetItem.categoryId;
      }

      newBookmarks.splice(draggedIndex, 1);
      const newTargetIndex = newBookmarks.findIndex(b => b.id === targetId);
      newBookmarks.splice(newTargetIndex, 0, draggedItem);

      setBookmarks(newBookmarks);
  };

  const handleMoveBookmarkToCategory = (bookmarkId: string, categoryId: string) => {
      const newBookmarks = [...bookmarks];
      const draggedIndex = newBookmarks.findIndex(b => b.id === bookmarkId);
      
      if (draggedIndex === -1) return;
      
      const draggedItem = newBookmarks[draggedIndex];
      
      if (draggedItem.categoryId !== categoryId) {
          draggedItem.categoryId = categoryId;
          newBookmarks.splice(draggedIndex, 1);
          newBookmarks.push(draggedItem);
          setBookmarks(newBookmarks);
      }
  };

  const openAddBookmarkModal = () => {
    setEditingBookmark(null);
    setIsBookmarkModalOpen(true);
  };

  const openEditBookmarkModal = (bookmark: Bookmark) => {
      setEditingBookmark(bookmark);
      setIsBookmarkModalOpen(true);
  };

  const openAddCategoryModal = () => {
      setEditingCategory(null);
      setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
      setEditingCategory(category);
      setIsCategoryModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-bg)] overflow-hidden transition-colors duration-300" data-theme={theme}>
      <style>{`
        :root {
            --bg-main: #f0f4f8;
            --bg-card: rgba(255, 255, 255, 0.75);
            --bg-subtle: rgba(241, 245, 249, 0.6);
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --border-color: rgba(226, 232, 240, 0.6);
            --accent-color: #2563eb;
            --accent-bg: rgba(37, 99, 235, 0.1);
            --shadow-color: rgba(148, 163, 184, 0.15);
            --hover-bg: rgba(248, 250, 252, 0.8);
            --backdrop-blur: 20px;
        }
        [data-theme='dark'] {
            --bg-main: #0f172a;
            --bg-card: rgba(30, 41, 59, 0.7);
            --bg-subtle: rgba(51, 65, 85, 0.5);
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border-color: rgba(51, 65, 85, 0.6);
            --accent-color: #60a5fa;
            --accent-bg: rgba(59, 130, 246, 0.15);
            --shadow-color: rgba(0, 0, 0, 0.4);
            --hover-bg: rgba(51, 65, 85, 0.6);
        }
        [data-theme='cyberpunk'] {
            --bg-main: #050505;
            --bg-card: rgba(18, 18, 18, 0.8);
            --bg-subtle: rgba(26, 26, 26, 0.7);
            --text-primary: #00ff9d;
            --text-secondary: #d946ef;
            --border-color: rgba(0, 255, 157, 0.3);
            --accent-color: #00ff9d;
            --accent-bg: rgba(0, 255, 157, 0.1);
            --shadow-color: rgba(0, 255, 157, 0.2);
            --hover-bg: rgba(26, 26, 26, 0.8);
            font-family: 'Courier New', monospace;
        }
      `}</style>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
            fixed inset-y-0 left-0 z-50 h-full
            bg-[var(--bg-card)] border-r border-[var(--border-color)] backdrop-blur-xl
            flex flex-col shadow-2xl md:shadow-sm shrink-0
            transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] overflow-hidden
            ${isSidebarOpen ? 'translate-x-0 w-64 md:w-72 opacity-100' : '-translate-x-full w-64 md:w-0 md:translate-x-0 md:opacity-0 md:border-r-0'}
            md:relative md:translate-x-0
        `}
      >
          <div className="w-full h-full flex flex-col">
            {/* Brand */}
            <div className="h-24 flex items-center justify-between px-6 shrink-0 relative">
                <a 
                    href="/"
                    onClick={(e) => { e.preventDefault(); window.location.reload(); }}
                    className="group flex items-center gap-3 cursor-pointer select-none focus:outline-none"
                >
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 group-hover:bg-blue-600 transition-all duration-500 ease-out group-hover:scale-110">
                        <Compass size={22} className="group-hover:rotate-45 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className={`${appFontSize} font-bold text-[var(--text-primary)] tracking-tight leading-none group-hover:text-blue-600 transition-all duration-300`}>
                                {appName}
                            </span>
                            {isAuthenticated && (
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSiteConfigModalOpen(true); }}
                                    className="text-[var(--text-secondary)] hover:text-blue-500 opacity-40 hover:opacity-100 p-1 rounded-md hover:bg-[var(--bg-subtle)] transition-all"
                                    title="修改标题"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                        <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-widest leading-none mt-1.5">
                            {appSubtitle}
                        </span>
                    </div>
                </a>
                <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-hide">
                <div className="px-4 mt-6 mb-4">
                    <div className="flex items-center gap-3 group">
                         <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] group-hover:text-[var(--accent-color)] transition-colors">
                             分类导航
                         </span>
                         <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent flex-1"></div>
                    </div>
                </div>
                
                {categories.map(category => {
                    const Icon = CATEGORY_ICONS[category.name] || CATEGORY_ICONS['日常办公'];
                    const isActive = activeCategoryId === category.id;
                    return (
                        <button
                            key={category.id}
                            onClick={() => scrollToCategory(category.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                                isActive 
                                ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] shadow-sm scale-[1.02]' 
                                : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] hover:scale-[1.02]'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <span className={`transition-colors duration-300 ${isActive ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:scale-110 transform'}`}>
                                    {Icon}
                                </span>
                                <span>{category.name}</span>
                            </div>
                            {isActive && <ChevronRight size={14} className="text-[var(--accent-color)]" />}
                        </button>
                    )
                })}

                {isAuthenticated && (
                    <button 
                        onClick={openAddCategoryModal}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-color)] hover:bg-[var(--accent-bg)] border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all mt-4 group hover:scale-[1.02]"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span>添加分类</span>
                    </button>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)]/50 shrink-0 space-y-3 backdrop-blur-sm">
                
                {/* Theme Switcher */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-[var(--bg-main)]/80 rounded-xl border border-[var(--border-color)]">
                    <button 
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all hover:scale-105 ${theme === 'light' ? 'bg-[var(--bg-card)] shadow-sm text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Sun size={16} />
                    </button>
                    <button 
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all hover:scale-105 ${theme === 'dark' ? 'bg-[var(--bg-card)] shadow-sm text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Moon size={16} />
                    </button>
                    <button 
                        onClick={() => setTheme('cyberpunk')}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-all hover:scale-105 ${theme === 'cyberpunk' ? 'bg-[var(--bg-card)] shadow-sm text-[#00ff9d]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <Zap size={16} />
                    </button>
                </div>

                {isAuthenticated && (
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
                            isEditMode 
                            ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/10' 
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)]'
                        }`}
                    >
                        {isEditMode ? <Check size={16} /> : <Settings size={16} />}
                        <span>{isEditMode ? '完成编辑' : '布局设置'}</span>
                    </button>
                )}

                {/* User / Auth */}
                {isAuthenticated ? (
                     <div className="flex flex-col gap-2 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[var(--accent-bg)] text-[var(--accent-color)] flex items-center justify-center relative">
                                <User size={18} />
                                {/* Cloud Status Indicator */}
                                {token && (
                                    <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                                        syncStatus.state === 'error' ? 'bg-red-500' :
                                        syncStatus.state === 'loading' ? 'bg-blue-500 animate-pulse' :
                                        syncStatus.state === 'success' ? 'bg-green-500' : 'bg-slate-300'
                                    }`}>
                                        <Cloud size={8} className="text-white" fill="currentColor"/>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">管理员</p>
                                <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                    {autoSync ? (
                                        <span className="flex items-center gap-1 text-green-600"><RefreshCw size={8} className={syncStatus.state === 'loading' ? 'animate-spin' : ''}/> 自动同步开</span>
                                    ) : '已登录'}
                                </p>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="退出登录"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-color)] mt-1">
                             <button
                                onClick={() => setIsSyncModalOpen(true)}
                                className={`col-span-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                                    syncStatus.state === 'error' ? 'bg-red-50 text-red-600' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-blue-50 hover:text-blue-600'
                                }`}
                                title="云端设置"
                            >
                                {syncStatus.state === 'error' ? <AlertCircle size={12}/> : <Cloud size={12} />} 
                                {syncStatus.state === 'error' ? '同步出错' : '云同步设置'}
                            </button>
                             <button
                                onClick={handleExportData}
                                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-blue-600 transition-colors"
                            >
                                <Download size={12} /> 备份
                            </button>
                            <label className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-green-600 transition-colors cursor-pointer">
                                <Upload size={12} /> 恢复
                                <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
                            </label>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsLoginModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all hover:scale-[1.02]"
                    >
                        <User size={18} />
                        <span>管理员登录</span>
                    </button>
                )}
            </div>
          </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto scroll-smooth relative z-0">
        <div className={`sticky top-8 z-40 h-0 overflow-visible transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${isSidebarOpen ? 'md:-left-3 -left-20' : 'left-4 md:left-6'}`}>
             <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-color)] p-2 rounded-full shadow-sm text-[var(--text-secondary)] hover:text-[var(--accent-color)] hover:shadow-md transition-all flex items-center justify-center hover:scale-110"
             >
                {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
             </button>
         </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 pb-32">
            <DashboardWidgets />
            <div className="mb-10 sticky top-4 z-30">
                <SearchBar />
            </div>

            {isAuthenticated && (
                <div className="flex justify-end mb-6">
                     <button 
                        onClick={openAddBookmarkModal}
                        className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:scale-105"
                    >
                        <Plus size={16} strokeWidth={3} />
                        添加书签
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-6">
                {categories.map((category, index) => (
                    <div
                        key={category.id}
                        id={`category-${category.id}`}
                        draggable={isEditMode}
                        onDragStart={(e) => handleCategoryDragStart(e, index)}
                        onDragOver={handleCategoryDragOver}
                        onDrop={(e) => handleCategoryDrop(e, index)}
                        className={`transition-all duration-500 ease-out w-full scroll-mt-24 ${
                            isEditMode ? 'cursor-move ring-2 ring-blue-100 hover:ring-blue-300 rounded-2xl opacity-90' : ''
                        }`}
                    >
                        <CategoryGroup 
                            category={category} 
                            bookmarks={bookmarks.filter(b => b.categoryId === category.id)}
                            onEditBookmark={openEditBookmarkModal}
                            onDeleteBookmark={handleDeleteBookmark}
                            onEditCategory={openEditCategoryModal}
                            onDeleteCategory={handleDeleteCategory}
                            isEditMode={isEditMode}
                            isAuthenticated={isAuthenticated}
                            onMoveBookmark={handleMoveBookmark}
                            onMoveToCategory={handleMoveBookmarkToCategory}
                        />
                    </div>
                ))}

                {categories.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-[var(--border-color)] rounded-3xl bg-[var(--bg-card)]/50 backdrop-blur-sm">
                        <FolderPlus size={48} className="mx-auto text-[var(--text-secondary)] mb-4" />
                        <h3 className="text-[var(--text-secondary)] font-medium">暂无分类</h3>
                        {isAuthenticated && (
                            <p className="text-[var(--text-secondary)] text-sm mt-2">点击左侧边栏“添加分类”开始使用</p>
                        )}
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-8 border-t border-[var(--border-color)] text-center">
                <p className="text-[var(--text-secondary)] text-xs font-medium tracking-wide">&copy; {new Date().getFullYear()} {appName} Dashboard.</p>
            </footer>
        </div>
      </main>

      {/* Modals */}
      <BookmarkModal 
        isOpen={isBookmarkModalOpen} 
        onClose={() => setIsBookmarkModalOpen(false)} 
        onSave={handleSaveBookmark}
        onDelete={handleDeleteBookmark}
        categories={categories}
        initialData={editingBookmark}
      />
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory} 
        initialData={editingCategory}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
      <SiteConfigModal
        isOpen={isSiteConfigModalOpen}
        onClose={() => setIsSiteConfigModalOpen(false)}
        onSave={handleSaveSiteConfig}
        initialName={appName}
        initialFontSize={appFontSize}
        initialSubtitle={appSubtitle}
      />
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        token={token}
        setToken={setToken}
        autoSync={autoSync}
        setAutoSync={setAutoSync}
        status={syncStatus}
        lastSuccessTime={lastSuccessTime}
        onUpload={handleManualUpload}
        onDownload={handleManualDownload}
      />
    </div>
  );
};

export default App;
