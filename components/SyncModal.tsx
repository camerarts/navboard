import React, { useState, useEffect } from 'react';
import { X, Github, UploadCloud, DownloadCloud, AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  getData: () => any;
  onDataSync: (data: any) => void;
}

const GIST_FILENAME = 'flatnav_backup.json';
// Security Warning: Hardcoding tokens in frontend code is risky if the code is public.
const DEFAULT_TOKEN = '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';

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, getData, onDataSync }) => {
  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [gistId, setGistId] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedToken = localStorage.getItem('flatnav_github_token');
      const storedGistId = localStorage.getItem('flatnav_gist_id');
      
      // Use stored token if available, otherwise use default hardcoded token
      if (storedToken) {
        setToken(storedToken);
      } else {
        setToken(DEFAULT_TOKEN);
      }
      
      if (storedGistId) setGistId(storedGistId);
      setStatus({ type: 'idle', msg: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveConfig = (newToken: string, newGistId: string) => {
    // Only save to local storage if it's different from default to avoid clutter, 
    // or just save it to ensure persistence if they change it.
    localStorage.setItem('flatnav_github_token', newToken);
    if (newGistId) localStorage.setItem('flatnav_gist_id', newGistId);
  };

  const handleUpload = async () => {
    if (!token) {
      setStatus({ type: 'error', msg: '请输入 GitHub Token' });
      return;
    }
    
    setStatus({ type: 'loading', msg: '正在上传数据...' });
    
    try {
      const dataContent = JSON.stringify(getData(), null, 2);
      const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
      const method = gistId ? 'PATCH' : 'POST';

      const body = {
        description: "FlatNav Dashboard Backup",
        public: false, // Private Gist
        files: {
          [GIST_FILENAME]: {
            content: dataContent
          }
        }
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const result = await res.json();
      const newGistId = result.id;
      setGistId(newGistId);
      saveConfig(token, newGistId);
      
      setStatus({ type: 'success', msg: '云端同步成功！' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: '上传失败，请检查 Token 权限' });
    }
  };

  const handleDownload = async () => {
    if (!token || !gistId) {
      setStatus({ type: 'error', msg: '需要 Token 和 Gist ID' });
      return;
    }

    setStatus({ type: 'loading', msg: '正在下载数据...' });

    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${token}`,
        }
      });

      if (!res.ok) {
        throw new Error('Download failed');
      }

      const result = await res.json();
      const file = result.files[GIST_FILENAME];

      if (!file || !file.content) {
        throw new Error('Valid backup file not found in Gist');
      }

      const parsedData = JSON.parse(file.content);
      onDataSync(parsedData);
      saveConfig(token, gistId);

      setStatus({ type: 'success', msg: '数据已恢复！即将刷新...' });
      
      setTimeout(() => {
         window.location.reload();
      }, 1500);

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: '下载失败，请检查 Gist ID' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Github size={20} className="text-slate-800" />
            云端同步 (GitHub Gist)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto">
          
          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed border border-blue-100">
            <strong>说明：</strong> 系统已预置 Token。点击“上传备份”即可将数据保存到云端。
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">GitHub Token</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <button 
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {token === DEFAULT_TOKEN && (
                <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <Check size={10} /> 已加载默认 Token
                </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Gist ID (自动生成/填入)</label>
            <input
              type="text"
              value={gistId}
              onChange={(e) => setGistId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
              placeholder="e.g. 8f6b..."
            />
            <p className="text-[10px] text-slate-400 mt-1">首次上传会自动填入 ID。在其他电脑恢复时请手动填入该 ID。</p>
          </div>

          {/* Status Message */}
          {status.msg && (
             <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                 status.type === 'error' ? 'bg-red-50 text-red-600' : 
                 status.type === 'success' ? 'bg-green-50 text-green-600' : 
                 'bg-slate-50 text-slate-600'
             }`}>
                {status.type === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {status.type === 'error' && <AlertCircle size={16} />}
                {status.type === 'success' && <Check size={16} />}
                <span>{status.msg}</span>
             </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleUpload}
              disabled={status.type === 'loading'}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-4 py-3 font-medium transition shadow-md active:scale-95 disabled:opacity-50"
            >
              <UploadCloud size={18} />
              上传备份
            </button>
             <button
              onClick={handleDownload}
              disabled={status.type === 'loading'}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-3 font-medium transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <DownloadCloud size={18} />
              下载恢复
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
