import React, { useState, useEffect, useCallback } from 'react';
import { X, Github, UploadCloud, DownloadCloud, AlertCircle, Check, Eye, EyeOff, Loader2, RefreshCw, Clock } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  getData: () => any;
  onDataSync: (data: any) => void;
}

const GIST_FILENAME = 'flatnav_backup.json';
// Security Warning: In a real production app, use a backend proxy.
const DEFAULT_TOKEN = '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';

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, getData, onDataSync }) => {
  const [token, setToken] = useState(DEFAULT_TOKEN);
  const [gistId, setGistId] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });
  const [showToken, setShowToken] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Auto-discover backup on open
  const checkForBackup = useCallback(async (authToken: string) => {
    if (!authToken) return;
    
    setIsChecking(true);
    setStatus({ type: 'loading', msg: '正在连接 GitHub 查找现有备份...' });
    
    try {
      // 1. Get user's gists
      const res = await fetch('https://api.github.com/gists', {
        headers: { 
            'Authorization': `token ${authToken}`,
            'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error('Token 无效或无权限');
        throw new Error('连接 GitHub 失败');
      }

      const gists = await res.json();
      
      // 2. Find gist with specific filename
      const backupGist = gists.find((g: any) => g.files && g.files[GIST_FILENAME]);
      
      if (backupGist) {
        setGistId(backupGist.id);
        const updateTime = new Date(backupGist.updated_at).toLocaleString();
        setLastUpdated(updateTime);
        setStatus({ type: 'success', msg: `已关联云端备份 (上次更新: ${updateTime})` });
        localStorage.setItem('flatnav_gist_id', backupGist.id);
      } else {
        setGistId('');
        setLastUpdated(null);
        setStatus({ type: 'idle', msg: '未找到现有备份，首次上传将创建新文件。' });
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || '检查备份失败' });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const storedToken = localStorage.getItem('flatnav_github_token');
      const activeToken = storedToken || DEFAULT_TOKEN;
      setToken(activeToken);
      
      // Always check cloud for latest status when opening
      checkForBackup(activeToken);
    }
  }, [isOpen, checkForBackup]);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!token) {
      setStatus({ type: 'error', msg: '缺少 Token' });
      return;
    }
    
    setStatus({ type: 'loading', msg: '正在上传数据到云端...' });
    
    try {
      const dataContent = JSON.stringify(getData(), null, 2);
      
      // Decide whether to create new or update existing
      // We check gistId state, but also double check if we can find one to avoid duplicates if user cleared cache
      let targetGistId = gistId;
      
      if (!targetGistId) {
          // Double check search before creating new
           const res = await fetch('https://api.github.com/gists', {
                headers: { 'Authorization': `token ${token}` }
           });
           const gists = await res.json();
           const existing = gists.find((g: any) => g.files && g.files[GIST_FILENAME]);
           if (existing) targetGistId = existing.id;
      }

      const url = targetGistId ? `https://api.github.com/gists/${targetGistId}` : 'https://api.github.com/gists';
      const method = targetGistId ? 'PATCH' : 'POST';

      const body = {
        description: "FlatNav Dashboard Backup (不要删除此文件)",
        public: false, 
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

      if (!res.ok) throw new Error(`上传失败: ${res.statusText}`);

      const result = await res.json();
      setGistId(result.id);
      setLastUpdated(new Date().toLocaleString());
      localStorage.setItem('flatnav_gist_id', result.id);
      localStorage.setItem('flatnav_github_token', token);
      
      setStatus({ type: 'success', msg: '上传成功！其他设备现在可以同步此数据了。' });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: '上传出错，请检查网络或Token权限' });
    }
  };

  const handleDownload = async () => {
    if (!token) {
       setStatus({ type: 'error', msg: '缺少 Token' });
       return;
    }

    // Ensure we have an ID. If not, try to find it one last time.
    let targetId = gistId;
    if (!targetId) {
        setStatus({ type: 'loading', msg: '正在查找云端备份...' });
        try {
            const res = await fetch('https://api.github.com/gists', {
                headers: { 'Authorization': `token ${token}` }
            });
            const gists = await res.json();
            const existing = gists.find((g: any) => g.files && g.files[GIST_FILENAME]);
            if (existing) {
                targetId = existing.id;
                setGistId(existing.id);
            } else {
                throw new Error('云端没有找到备份文件 (flatnav_backup.json)');
            }
        } catch (e: any) {
            setStatus({ type: 'error', msg: e.message || '查找备份失败' });
            return;
        }
    }

    setStatus({ type: 'loading', msg: '正在下载并恢复数据...' });

    try {
      // Add timestamp to prevent caching
      const res = await fetch(`https://api.github.com/gists/${targetId}?t=${Date.now()}`, {
        headers: { 'Authorization': `token ${token}` }
      });

      if (!res.ok) throw new Error('下载请求失败');

      const result = await res.json();
      const file = result.files[GIST_FILENAME];

      if (!file || !file.content) throw new Error('文件内容为空');

      const parsedData = JSON.parse(file.content);
      
      onDataSync(parsedData);
      localStorage.setItem('flatnav_gist_id', targetId);
      localStorage.setItem('flatnav_github_token', token);

      setStatus({ type: 'success', msg: '数据恢复成功！页面即将刷新...' });
      
      setTimeout(() => {
         window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: '恢复失败: ' + err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Github size={22} className="text-slate-900" />
            多端数据同步
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Status Card */}
          <div className={`p-4 rounded-xl border ${
              gistId ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
          } transition-colors duration-300`}>
             <div className="flex items-start gap-3">
                 <div className={`mt-0.5 p-1.5 rounded-full ${gistId ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                    {isChecking ? <Loader2 size={16} className="animate-spin" /> : gistId ? <Check size={16} /> : <AlertCircle size={16} />}
                 </div>
                 <div className="flex-1">
                     <h4 className={`text-sm font-bold ${gistId ? 'text-green-800' : 'text-slate-700'}`}>
                         {isChecking ? '正在连接...' : gistId ? '云端状态：已连接' : '云端状态：未关联'}
                     </h4>
                     <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                         {isChecking 
                            ? '正在扫描 GitHub Gist...' 
                            : gistId 
                                ? '已自动关联到您的 GitHub 备份文件。您可以在任何设备上同步。' 
                                : '未检测到现有备份。首次点击“上传”将自动创建备份文件。'
                         }
                     </p>
                     {lastUpdated && (
                         <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-green-700 bg-green-100/50 w-fit px-2 py-1 rounded-md">
                             <Clock size={10} />
                             云端最后更新: {lastUpdated}
                         </div>
                     )}
                 </div>
                 {!isChecking && (
                    <button onClick={() => checkForBackup(token)} className="text-slate-400 hover:text-blue-600 p-1" title="刷新状态">
                        <RefreshCw size={14} />
                    </button>
                 )}
             </div>
          </div>

          {/* Action Buttons */}
          <div className="grid gap-4">
             <button
              onClick={handleUpload}
              disabled={isChecking || status.type === 'loading'}
              className="group relative overflow-hidden flex items-center justify-between bg-slate-900 hover:bg-blue-700 text-white rounded-xl px-5 py-4 font-medium transition-all shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                    <UploadCloud size={20} />
                  </div>
                  <div className="text-left">
                      <div className="text-sm font-bold">上传备份到云端</div>
                      <div className="text-[10px] text-slate-300 group-hover:text-blue-100">将当前浏览器的数据保存到 GitHub</div>
                  </div>
              </div>
            </button>

             <button
              onClick={handleDownload}
              disabled={isChecking || status.type === 'loading'}
              className="group relative overflow-hidden flex items-center justify-between bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 rounded-xl px-5 py-4 font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <DownloadCloud size={20} />
                  </div>
                  <div className="text-left">
                      <div className="text-sm font-bold group-hover:text-blue-700">从云端下载恢复</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-blue-400">覆盖当前数据 (解决跨设备不同步问题)</div>
                  </div>
              </div>
            </button>
          </div>

          {/* Status Message Area */}
          {status.msg && status.type !== 'idle' && (
             <div className={`flex items-center gap-2 text-xs p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2 ${
                 status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
                 status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 
                 'bg-blue-50 text-blue-600 border border-blue-100'
             }`}>
                {status.type === 'loading' && <Loader2 size={14} className="animate-spin shrink-0" />}
                {status.type === 'error' && <AlertCircle size={14} className="shrink-0" />}
                {status.type === 'success' && <Check size={14} className="shrink-0" />}
                <span className="font-medium">{status.msg}</span>
             </div>
          )}

          {/* Advanced / Token Settings */}
          <div className="pt-4 border-t border-slate-100">
            <details className="group">
                <summary className="text-[10px] text-slate-400 cursor-pointer flex items-center gap-1 hover:text-slate-600 w-fit select-none">
                    <span>高级设置 / 更换 Token</span>
                </summary>
                <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                    <div className="relative">
                        <input
                            type={showToken ? "text" : "password"}
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-9 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-[10px]"
                            placeholder="ghp_..."
                        />
                        <button 
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        >
                            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                    <div className="flex gap-2">
                         <input
                            type="text"
                            value={gistId}
                            readOnly
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-400 font-mono text-[10px] cursor-not-allowed"
                            placeholder="Gist ID (自动获取)"
                        />
                    </div>
                </div>
            </details>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SyncModal;
