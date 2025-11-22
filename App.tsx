import React, { useState, useEffect } from 'react';
import { Plus, Settings, LayoutGrid, User, LogOut, FolderPlus, Check, Compass } from 'lucide-react';
import SearchBar from './components/SearchBar';
import CategoryGroup from './components/CategoryGroup';
import BookmarkModal from './components/BookmarkModal';
import CategoryModal from './components/CategoryModal';
import LoginModal from './components/LoginModal';
import { Bookmark, Category } from './types';
import { INITIAL_BOOKMARKS, INITIAL_CATEGORIES } from './constants';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(INITIAL_BOOKMARKS);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // UI State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Drag State
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const storedBookmarks = localStorage.getItem('flatnav_bookmarks');
    const storedCategories = localStorage.getItem('flatnav_categories');
    const storedPassword = localStorage.getItem('flatnav_password'); // Note: In a real app, use secure backend/hash
    
    if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
    if (storedCategories) setCategories(JSON.parse(storedCategories));
    
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
      // First time setup
      localStorage.setItem('flatnav_password', password);
      setHasPassword(true);
      setIsAuthenticated(true);
      return true;
    } else {
      // Verify password
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
    setIsEditMode(false); // Automatically exit edit mode
  };

  const handleSaveBookmark = (newBookmarkData: Omit<Bookmark, 'id'>) => {
    if (editingBookmark) {
        // Update existing
        setBookmarks(prev => prev.map(b => b.id === editingBookmark.id ? { ...b, ...newBookmarkData } : b));
    } else {
        // Create new
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
          // Update existing by ID (from Manager) or editingCategory state
          setCategories(prev => prev.map(c => c.id === categoryData.id ? { ...c, name: categoryData.name, color: categoryData.color } : c));
      } else if (editingCategory) {
          // Fallback if ID not passed but state exists
          setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryData, id: c.id } : c));
      } else {
          // Create new
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
      // Remove category
      setCategories(prev => prev.filter(c => c.id !== id));
      // Remove bookmarks associated with that category to prevent orphans
      setBookmarks(prev => prev.filter(b => b.categoryId !== id));
  };

  // --- Drag and Drop Handlers ---

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
      if (!isEditMode) return;
      setDraggedCategoryIndex(index);
      e.dataTransfer.setData('type', 'category');
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Allow drop
      e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (!isEditMode) return;

      // Handle Category Reordering
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

      // If moving between categories, adopt the target's category
      if (draggedItem.categoryId !== targetItem.categoryId) {
          draggedItem.categoryId = targetItem.categoryId;
      }

      // Move item
      newBookmarks.splice(draggedIndex, 1);
      // Re-find target index as removal might have shifted it
      const newTargetIndex = newBookmarks.findIndex(b => b.id === targetId);
      // Insert before target
      newBookmarks.splice(newTargetIndex, 0, draggedItem);

      setBookmarks(newBookmarks);
  };

  const handleMoveBookmarkToCategory = (bookmarkId: string, categoryId: string) => {
      const newBookmarks = [...bookmarks];
      const draggedIndex = newBookmarks.findIndex(b => b.id === bookmarkId);
      
      if (draggedIndex === -1) return;
      
      const draggedItem = newBookmarks[draggedIndex];
      
      // Only move if category is different or just to append to end
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
      setEditingCategory(null); // Null means "Add Mode"
      setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
      setEditingCategory(category);
      setIsCategoryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 flex flex-col">
      
      {/* Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/40 to-transparent -z-10 pointer-events-none"></div>

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/50 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            {/* Brand */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <Compass size={20} />
                </div>
                <span className="text-xl font-bold text-slate-800 tracking-tight">FlatNav</span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
                {isAuthenticated && (
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                            isEditMode 
                                ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' 
                                : 'bg-white/80 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        {isEditMode ? <Check size={14} /> : <Settings size={14} />}
                        {isEditMode ? '完成修改' : '布局设置'}
                    </button>
                )}

                {/* Auth Button */}
                {isAuthenticated ? (
                  <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm"
                    title="退出登录"
                  >
                    <LogOut size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm"
                    title={hasPassword ? '管理员登录' : '设置密码'}
                  >
                    <User size={16} />
                  </button>
                )}
            </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Search Area - Centered and Prominent */}
        <div className="mt-4 mb-12">
            <SearchBar />
        </div>

        {/* Content Grid Header */}
        <div className="flex justify-between items-end mb-6 px-1">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <LayoutGrid size={20} className="text-blue-500" />
                我的导航
            </h2>
            
            {/* Action Buttons - Only visible if authenticated */}
            {isAuthenticated && (
                <div className="flex gap-2">
                    <button 
                        onClick={openAddCategoryModal}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                    >
                        <FolderPlus size={14} />
                        分类
                    </button>
                    <button 
                        onClick={openAddBookmarkModal}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors shadow-md"
                    >
                        <Plus size={14} />
                        书签
                    </button>
                </div>
            )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            {categories.map((category, index) => (
                <div
                    key={category.id}
                    draggable={isEditMode}
                    onDragStart={(e) => handleCategoryDragStart(e, index)}
                    onDragOver={handleCategoryDragOver}
                    onDrop={(e) => handleCategoryDrop(e, index)}
                    className={`rounded-2xl transition-all duration-200 ${
                        isEditMode ? 'cursor-move ring-2 ring-blue-100 hover:ring-blue-300 scale-[0.98] opacity-90' : ''
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
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
        <p className="text-slate-400 text-xs">&copy; {new Date().getFullYear()} FlatNav. Designed for simplicity.</p>
      </footer>

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