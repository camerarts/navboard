import React, { useState, useEffect } from 'react';
import { Plus, Settings, User, LogOut, FolderPlus, Check, Compass, ChevronRight, ChevronLeft } from 'lucide-react';
import SearchBar from './components/SearchBar';
import CategoryGroup from './components/CategoryGroup';
import BookmarkModal from './components/BookmarkModal';
import CategoryModal from './components/CategoryModal';
import LoginModal from './components/LoginModal';
import { Bookmark, Category } from './types';
import { INITIAL_BOOKMARKS, INITIAL_CATEGORIES, CATEGORY_ICONS } from './constants';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(INITIAL_BOOKMARKS);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // UI State
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Sidebar State - Default to true for desktop, will check on mount
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Drag State
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  // Initialize sidebar state and load data
  useEffect(() => {
    // Handle responsive default state
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }

    const storedBookmarks = localStorage.getItem('flatnav_bookmarks');
    const storedCategories = localStorage.getItem('flatnav_categories');
    const storedPassword = localStorage.getItem('flatnav_password'); 
    
    if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
    if (storedCategories) {
        const parsedCats = JSON.parse(storedCategories);
        setCategories(parsedCats);
        if (parsedCats.length > 0) setActiveCategoryId(parsedCats[0].id);
    } else {
        if (INITIAL_CATEGORIES.length > 0) setActiveCategoryId(INITIAL_CATEGORIES[0].id);
    }
    
    if (storedPassword) {
      setHasPassword(true);
    }
  }, []);

  // Persist changes
  useEffect(() => {
    localStorage.setItem('flatnav_bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('flatnav_categories', JSON.stringify(categories));
  }, [bookmarks, categories]);

  const handleLogin = (password: string): boolean => {
    if (!hasPassword) {
      localStorage.setItem('flatnav_password', password);
      setHasPassword(true);
      setIsAuthenticated(true);
      return true;
    } else {
      const stored = localStorage.getItem('flatnav_password');
      if (password === stored) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsEditMode(false); 
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

  // --- Navigation & Scrolling ---

  const scrollToCategory = (categoryId: string) => {
      setActiveCategoryId(categoryId);
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  // --- Drag and Drop Handlers ---

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

  // --- Modals ---

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
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 overflow-hidden">
      
      {/* Sidebar - Fixed Left */}
      <aside 
        className={`${
            isSidebarOpen ? 'w-72 border-r opacity-100' : 'w-0 border-r-0 opacity-0'
        } bg-white border-slate-200 flex flex-col shadow-sm shrink-0 z-20 relative transition-all duration-300 ease-in-out overflow-hidden`}
      >
          {/* Inner Container with Fixed Width to prevent content squash during transition */}
          <div className="w-72 h-full flex flex-col">
            {/* Brand */}
            <div className="h-24 flex items-center px-8 shrink-0">
                <a 
                    href="/"
                    onClick={(e) => { e.preventDefault(); window.location.reload(); }}
                    className="group flex items-center gap-3 cursor-pointer select-none focus:outline-none w-full"
                >
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 group-hover:bg-blue-600 transition-all duration-500 ease-out">
                        <Compass size={22} className="group-hover:rotate-45 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-xl font-bold text-slate-800 tracking-tight leading-none group-hover:text-blue-600 transition-colors duration-300">
                            FlatNav
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-1.5">
                            Dashboard
                        </span>
                    </div>
                </a>
            </div>

            {/* Navigation List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-hide">
                
                {/* Redesigned Category Header */}
                <div className="px-4 mt-6 mb-4">
                    <div className="flex items-center gap-3 group">
                         <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">
                             分类导航
                         </span>
                         <div className="h-px bg-gradient-to-r from-slate-100 to-transparent flex-1"></div>
                    </div>
                </div>
                
                {categories.map(category => {
                    const Icon = CATEGORY_ICONS[category.name] || CATEGORY_ICONS['日常办公'];
                    const isActive = activeCategoryId === category.id;
                    return (
                        <button
                            key={category.id}
                            onClick={() => scrollToCategory(category.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                                isActive 
                                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    {Icon}
                                </span>
                                <span>{category.name}</span>
                            </div>
                            {isActive && <ChevronRight size={14} className="text-blue-400" />}
                        </button>
                    )
                })}

                {/* Add Category (Sidebar) */}
                {isAuthenticated && (
                    <button 
                        onClick={openAddCategoryModal}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 border border-dashed border-slate-200 hover:border-blue-200 transition-all mt-4 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span>添加分类</span>
                    </button>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                {/* Edit Mode Toggle */}
                {isAuthenticated && (
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isEditMode 
                            ? 'bg-slate-800 text-white shadow-lg shadow-slate-900/10' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                    >
                        {isEditMode ? <Check size={16} /> : <Settings size={16} />}
                        <span>{isEditMode ? '完成编辑' : '布局设置'}</span>
                    </button>
                )}

                {/* User / Auth */}
                {isAuthenticated ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-100 shadow-sm">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">管理员</p>
                            <p className="text-[10px] text-slate-400 truncate">已登录</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="退出登录"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsLoginModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all"
                    >
                        <User size={18} />
                        <span>管理员登录</span>
                    </button>
                )}
            </div>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto scroll-smooth relative">
        
        {/* Sidebar Toggle Button */}
        <div className={`absolute top-8 z-40 transition-all duration-300 ${isSidebarOpen ? '-left-3' : 'left-6'}`}>
             <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-white border border-slate-200 p-1.5 rounded-full shadow-sm text-slate-400 hover:text-blue-600 hover:shadow-md transition-all flex items-center justify-center"
                title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
             >
                {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
             </button>
         </div>

        <div className="max-w-5xl mx-auto px-8 py-10 pb-32">
            
            {/* Search Area */}
            <div className="mb-10 sticky top-4 z-30">
                <SearchBar />
            </div>

            {/* Header Actions (Add Bookmark) */}
            {isAuthenticated && (
                <div className="flex justify-end mb-6">
                     <button 
                        onClick={openAddBookmarkModal}
                        className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <Plus size={16} strokeWidth={3} />
                        添加书签
                    </button>
                </div>
            )}

            {/* Category List - Vertical Stack */}
            <div className="flex flex-col gap-8">
                {categories.map((category, index) => (
                    <div
                        key={category.id}
                        id={`category-${category.id}`} // ID for scrolling
                        draggable={isEditMode}
                        onDragStart={(e) => handleCategoryDragStart(e, index)}
                        onDragOver={handleCategoryDragOver}
                        onDrop={(e) => handleCategoryDrop(e, index)}
                        className={`transition-all duration-300 w-full scroll-mt-24 ${
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

                {/* Empty State if no categories */}
                {categories.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                        <FolderPlus size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-slate-500 font-medium">暂无分类</h3>
                        {isAuthenticated && (
                            <p className="text-slate-400 text-sm mt-2">点击左侧边栏“添加分类”开始使用</p>
                        )}
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
                <p className="text-slate-400 text-xs font-medium tracking-wide">&copy; {new Date().getFullYear()} FlatNav Dashboard.</p>
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
        isFirstTime={!hasPassword}
      />
    </div>
  );
};

export default App;
