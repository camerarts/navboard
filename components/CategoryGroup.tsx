import React, { useState, useEffect } from 'react';
import { Bookmark, Category } from '../types';
import { ExternalLink, Trash2, Edit2, GripVertical } from 'lucide-react';
import { CATEGORY_ICONS } from '../constants';

interface CategoryGroupProps {
  category: Category;
  bookmarks: Bookmark[];
  onEditBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark?: (id: string) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (id: string) => void;
  isEditMode: boolean;
  isAuthenticated: boolean;
  onMoveBookmark?: (draggedId: string, targetId: string) => void;
  onMoveToCategory?: (bookmarkId: string, categoryId: string) => void;
}

// Internal helper component for Delete with local confirmation state
const DeleteButton = ({ 
    onDelete, 
    size = 16, 
    className = "" 
}: { 
    onDelete: () => void; 
    size?: number; 
    className?: string;
}) => {
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (confirming) {
            const timer = setTimeout(() => setConfirming(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [confirming]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Critical: Stop event from bubbling to parent links
        
        if (confirming) {
            onDelete();
            setConfirming(false);
        } else {
            setConfirming(true);
        }
    };

    return (
        <button 
            onClick={handleClick}
            className={`${className} transition-all duration-200 flex items-center justify-center gap-1 ${
                confirming 
                    ? 'bg-red-500 text-white w-auto px-2 hover:bg-red-600 border-transparent shadow-sm' 
                    : ''
            }`}
            title={confirming ? "再次点击确认删除" : "删除"}
        >
            <Trash2 size={size} />
            {confirming && <span className="text-xs font-bold whitespace-nowrap">确认</span>}
        </button>
    );
};

const CategoryGroup: React.FC<CategoryGroupProps> = ({ 
  category, 
  bookmarks, 
  onEditBookmark, 
  onDeleteBookmark,
  onEditCategory, 
  onDeleteCategory, 
  isEditMode,
  isAuthenticated,
  onMoveBookmark,
  onMoveToCategory
}) => {
  // Keep visible if it has bookmarks OR if we are authenticated (to allow adding) OR in edit mode
  if (bookmarks.length === 0 && !isEditMode && !isAuthenticated) return null;

  const Icon = CATEGORY_ICONS[category.name] || CATEGORY_ICONS['日常办公'];

  // --- Drag Handlers for Bookmarks ---

  const handleBookmarkDragStart = (e: React.DragEvent, bookmarkId: string) => {
      e.stopPropagation(); // Prevent category drag
      e.dataTransfer.setData('type', 'bookmark');
      e.dataTransfer.setData('bookmarkId', bookmarkId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleBookmarkDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const type = e.dataTransfer.getData('type');
      const draggedId = e.dataTransfer.getData('bookmarkId');
      
      if (type === 'bookmark' && draggedId && draggedId !== targetId && onMoveBookmark) {
          onMoveBookmark(draggedId, targetId);
      }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
      // This handles dropping a bookmark into a category (e.g. empty space or empty category)
      // Note: We must prevent default to stop browser from opening link
      e.preventDefault();
      // If we dropped ON a bookmark, handleBookmarkDrop stops propagation, so this won't run.
      // This only runs if we drop on the header or empty space in container.
      
      const type = e.dataTransfer.getData('type');
      const draggedId = e.dataTransfer.getData('bookmarkId');

      if (type === 'bookmark' && draggedId && onMoveToCategory) {
          onMoveToCategory(draggedId, category.id);
      }
  };

  return (
    <div 
        className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 relative h-full ${bookmarks.length === 0 ? 'border-dashed bg-slate-50/50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); }} // Allow drop
        onDrop={handleContainerDrop}
    >
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-50 h-10">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${category.color}`}>
          {Icon}
        </div>
        <h2 className="text-md font-semibold text-slate-700 truncate">{category.name}</h2>
        
        {/* Edit/Delete Category Controls */}
        {isEditMode ? (
            <div className="ml-auto flex items-center gap-1">
                {onEditCategory && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditCategory(category);
                        }}
                        className="text-slate-400 hover:text-blue-500 p-1.5 hover:bg-blue-50 rounded transition-colors border border-transparent"
                        title="编辑分类"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
                {onDeleteCategory && (
                    <DeleteButton 
                        onDelete={() => onDeleteCategory(category.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded border border-transparent"
                        size={16}
                    />
                )}
                {/* Visual handle indicator for category drag */}
                <div className="cursor-move text-slate-300 p-1 ml-1" title="拖动排序">
                    <GripVertical size={16} />
                </div>
            </div>
        ) : (
            <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
              {bookmarks.length}
            </span>
        )}
      </div>

      {/* Bookmarks Grid/List */}
      {/* Mobile: 4 cols | Tablet (sm): 5 cols | Desktop (lg): 1 col (List) | EditMode: 1 col */}
      <div className={`grid gap-2 sm:gap-3 min-h-[40px] ${
          !isEditMode ? 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-1' : 'grid-cols-1'
      }`}>
        {bookmarks.map((bookmark) => (
          <div 
            key={bookmark.id} 
            className="relative group"
            draggable={isEditMode}
            onDragStart={(e) => handleBookmarkDragStart(e, bookmark.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleBookmarkDrop(e, bookmark.id)}
          >
             <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                 if (isEditMode) {
                     e.preventDefault(); 
                     e.stopPropagation();
                 }
              }}
              className={`flex items-center rounded-xl bg-white border transition-all duration-200 relative overflow-hidden ${
                  isEditMode 
                    ? 'border-slate-200 pr-24 cursor-move flex-row p-3 gap-3' // Edit Mode: List view with space for buttons
                    : 'border-slate-200 hover:border-blue-400 hover:shadow-md flex-col lg:flex-row justify-center lg:justify-start p-2 lg:p-3 gap-1.5 lg:gap-3 h-full' // View Mode: Grid on mobile/tablet, List on desktop
              }`}
            >
              <img 
                src={`https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`} 
                alt="" 
                className={`rounded-sm opacity-80 shrink-0 ${
                    !isEditMode ? 'w-8 h-8 lg:w-5 lg:h-5' : 'w-5 h-5'
                }`}
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/20/20'; }}
              />
              <span className={`font-medium truncate w-full ${
                  !isEditMode ? 'text-[10px] leading-tight lg:text-sm text-slate-700 text-center lg:text-left' : 'text-sm text-slate-700'
              }`}>
                  {bookmark.title}
              </span>
              
              {/* External Link Icon - Only visible on Desktop List View */}
              {!isEditMode && <ExternalLink size={14} className="hidden lg:block text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />}
            </a>
            
            {/* Edit Mode Controls for Bookmark */}
            {isEditMode && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-30">
                <button 
                    onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        onEditBookmark(bookmark); 
                    }}
                    className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-md text-slate-500 hover:text-blue-600 hover:border-blue-300 transition shrink-0"
                    title="编辑书签"
                >
                    <Edit2 size={14} />
                </button>
                {onDeleteBookmark && (
                    <DeleteButton 
                        onDelete={() => onDeleteBookmark(bookmark.id)}
                        size={14}
                        className="p-1.5 bg-white shadow-sm border border-slate-200 rounded-md text-slate-500 hover:text-red-600 hover:border-red-300 shrink-0"
                    />
                )}
                <div className="p-1 text-slate-300 cursor-move">
                    <GripVertical size={14} />
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Empty State Indicator */}
        {bookmarks.length === 0 && (
            <div className={`text-xs text-slate-400 text-center py-6 flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 rounded-xl ${!isEditMode ? 'col-span-4 sm:col-span-5 lg:col-span-1' : ''}`}>
                <span className="opacity-50">暂无书签</span>
                {isEditMode && <span className="opacity-40">拖动书签至此</span>}
                {isAuthenticated && !isEditMode && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                        点击上方“添加书签”
                    </span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CategoryGroup;