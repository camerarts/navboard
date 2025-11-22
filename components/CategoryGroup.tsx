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
        e.stopPropagation(); 
        
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

  const handleBookmarkDragStart = (e: React.DragEvent, bookmarkId: string) => {
      e.stopPropagation(); 
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
      e.preventDefault();
      const type = e.dataTransfer.getData('type');
      const draggedId = e.dataTransfer.getData('bookmarkId');

      if (type === 'bookmark' && draggedId && onMoveToCategory) {
          onMoveToCategory(draggedId, category.id);
      }
  };

  return (
    <div 
        className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 relative h-full w-full ${bookmarks.length === 0 ? 'border-dashed bg-slate-50/50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); }} 
        onDrop={handleContainerDrop}
    >
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-50">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${category.color}`}>
          {Icon}
        </div>
        <h2 className="text-lg font-bold text-slate-800">{category.name}</h2>
        
        {/* Edit/Delete Category Controls */}
        {isEditMode ? (
            <div className="ml-auto flex items-center gap-2">
                {onEditCategory && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditCategory(category);
                        }}
                        className="text-slate-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑分类"
                    >
                        <Edit2 size={16} />
                    </button>
                )}
                {onDeleteCategory && (
                    <DeleteButton 
                        onDelete={() => onDeleteCategory(category.id)}
                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"
                        size={16}
                    />
                )}
                <div className="cursor-move text-slate-300 p-2" title="拖动排序">
                    <GripVertical size={16} />
                </div>
            </div>
        ) : (
            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {bookmarks.length}
            </span>
        )}
      </div>

      {/* Bookmarks Grid */}
      {/* Updated grid for full-width layout: 
          Mobile: 1 col, Tablet: 3 cols, Desktop: 4-5 cols.
          Removed the xl:grid-cols-1 forcing to ensure it looks good in full width rows. 
      */}
      <div className={`grid gap-3 min-h-[40px] max-h-[280px] overflow-y-auto pr-2 ${
          !isEditMode 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
            : 'grid-cols-1'
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
              className={`flex items-center rounded-xl bg-slate-50 border border-transparent transition-all duration-200 relative overflow-hidden h-full ${
                  isEditMode 
                    ? 'border-slate-200 pr-24 cursor-move flex-row p-3 gap-3 bg-white' 
                    : 'hover:bg-white hover:border-blue-200 hover:shadow-md p-3 gap-3' 
              }`}
            >
              <img 
                src={`https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`} 
                alt="" 
                className="w-5 h-5 rounded-sm shrink-0 opacity-90"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/20/20'; }}
              />
              <span className="text-sm font-medium text-slate-700 truncate w-full text-left">
                  {bookmark.title}
              </span>
              
              {!isEditMode && <ExternalLink size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />}
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
        
        {bookmarks.length === 0 && (
            <div className={`text-sm text-slate-400 text-center py-8 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-100 rounded-xl ${!isEditMode ? 'col-span-full' : ''}`}>
                <span className="opacity-60">此分类下暂无书签</span>
                {isAuthenticated && !isEditMode && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                        点击右上角“添加书签”
                    </span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CategoryGroup;
