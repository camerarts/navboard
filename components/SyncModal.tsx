import React, { useState, useEffect, useCallback } from 'react';
import { X, Github, UploadCloud, DownloadCloud, AlertCircle, Check, Loader2, RefreshCw, Clock, Key, ExternalLink, HelpCircle, WifiOff } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  getData: () => any;
  onDataSync: (data: any) => void;
}

const GIST_FILENAME = 'flatnav_backup.json';

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, getData, onDataSync }) => {
  const [token, setToken] = useState('');
  const [gistId, setGistId] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });
  const [isChecking, setIsChecking] = useState(false);
  const [needsTokenConfig, setNeedsTokenConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedToken = localStorage.getItem('flatnav_github_token') || '';
      const storedGistId = localStorage.getItem('flatnav_gist_id') || '';
      
      setToken(storedToken);
      setGistId(storedGistId);
      setStatus({ type: 'idle', msg: '' });
      
      if (storedToken) {
        checkForBackup(storedToken);
        setNeedsTokenConfig(false);
      } else {
        setNeedsTokenConfig(true);
      }
    }
  }, [isOpen]);

  const handleError = (err: any) => {
      console.error(err);
      let msg = err.message || '未知错误';
      
      if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
          msg = '网络连接失败 (Failed to fetch)。请检查网络连接是否正常，或尝试使用 VPN 访问 GitHub API。';
      } else if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          msg = 'Token 无效或过期 (401)。请检查 Token 是否正确。';
          setNeedsTokenConfig(true);
      } else if (msg.includes('403')) {
          msg = '访问被拒绝 (403)。Token 可能权限不足或 API 调用超限。';
      } else if (msg.includes('404')) {
          msg = '未找到资源 (404)。';
      }

      setStatus({ type: 'error', msg });
      setIsChecking(false);
  };

  const saveToken = (newToken: string) => {
      // Clean token: remove spaces, newlines, control chars
      const cleanedToken = newToken.trim().replace(/[\r\n\s]/g, '');
      setToken(cleanedToken);
      localStorage.setItem('flatnav_github_token', cleanedToken);
      if (cleanedToken) {
          setNeedsTokenConfig(false);
          checkForBackup(cleanedToken);
      }
  };

  const checkForBackup = useCallback(async (authToken: string) => {
    if (!authToken) return;
    
    setIsChecking(true);
    setStatus({ type: 'loading', msg: '正在连接 GitHub...' });
    
    try {
      // Use Bearer and Accept header for better compatibility
      const res = await fetch('https://api.github.com/gists', {
        headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`GitHub API Error: ${res.status}`);
      }

      const gists = await res.json();
      
      const backupGist = gists.find((g: any) => g.files && g.files[GIST_FILENAME]);
      
      if (backupGist) {
        setGistId(backupGist.id);
        const updateTime = new Date(backupGist.updated_at).toLocaleString();
        setLastUpdated(updateTime);
        setStatus({ type: 'success', msg: `已关联云端备份` });
        localStorage.setItem('flatnav_gist_id', backupGist.id);
      } else {
        setGistId(''); 
        setLastUpdated(null);
        setStatus({ type: 'idle', msg: '未找到现有备份，上传后将自动创建。' });
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleUpload = async () => {
    if (!token) {
      setNeedsTokenConfig(true);
      return;
    }
    
    setStatus({ type: 'loading', msg: '正在上传数据...' });
    
    try {
      const dataContent = JSON.stringify(getData(), null, 2);
      
      // Double check current list in case it was created elsewhere since load
      let targetGistId = gistId;
      if (!targetGistId) {
           try {
                const res = await fetch('https://api.github.com/gists', {
                     headers: { 
                         'Authorization': `Bearer ${token}`,
                         'Accept': 'application/vnd.github.v3+json'
                     }
                });
                if (res.ok) {
                    const gists = await res.json();
                    const existing = gists.find((g: any) => g.files && g.files[GIST_FILENAME]);
                    if (existing) targetGistId = existing.id;
                }
           } catch (e) { /* ignore silent check */ }
      }

      const url = targetGistId ? `https://api.github.com/gists/${targetGistId}` : 'https://api.github.com/gists';
      const method = targetGistId ? 'PATCH' : 'POST';

      const body = {
        description: "FlatNav Dashboard Backup (由 FlatNav 自动同步)",
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
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
          throw new Error(`Upload failed: ${res.status}`);
      }

      const result = await res.json();
      setGistId(result.id);
      setLastUpdated(new Date().toLocaleString());
      localStorage.setItem('flatnav_gist_id', result.id);
      
      setStatus({ type: 'success', msg: '上传成功！数据已同步到云端。' });
    } catch (err: any) {
      handleError(err);
    }
  };

  const handleDownload = async () => {
    if (!token) {
       setNeedsTokenConfig(true);
       return;
    }

    if (!gistId) {
        setStatus({ type: 'error', msg: '未找到可下载的备份文件' });
        // Try to find it again just in case
        checkForBackup(token); 
        return;
    }

    setStatus({ type: 'loading', msg: '正在下载并恢复数据...' });

    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}?t=${Date.now()}`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) {
           throw new Error(`Download failed: ${res.status}`);
      }

      const result = await res.json();
      const file = result.files[GIST_FILENAME];

      if (!file || !file.content) throw new Error('备份文件内容为空');

      const parsedData = JSON.parse(file.content);
      
      onDataSync(parsedData);
      
      setStatus({ type: 'success', msg: '数据恢复成功！页面即将刷新...' });
      
      setTimeout(() => {
         window.location.reload();
      }, 1500);

    } catch (err: any) {
      handleError(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 bg-slate-50/80">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Github size={22} className="text-slate-900" />
            云端同步
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Token Configuration Section */}
          {needsTokenConfig ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                          <Key size={20} />
                      </div>
                      <div>
                          <h4 className="font-bold text-blue-900 text-sm">需要配置 GitHub Token</h4>
                          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                              为了同步您的私有数据，需要一个 GitHub 访问令牌 (Gist 权限)。
                          </p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <a 
                        href="https://github.com/settings/tokens/new?scopes=gist&description=FlatNav%20Sync" 
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
                      >
                          <ExternalLink size={14} />
                          第一步：点击获取 Token (已选好权限)
                      </a>
                      
                      <div className="relative">
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full bg-white border border-blue-200 rounded-lg pl-3 pr-3 py-2.5 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono shadow-sm"
                            placeholder="第二步：将生成的 ghp_... 粘贴在这里"
                        />
                      </div>

                      <button 
                        onClick={() => saveToken(token)}
                        disabled={!token.trim()}
                        className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                      >
                          保存并连接
                      </button>
                      
                      {/* Tips for connection issues */}
                      <p className="text-[10px] text-slate-500 text-center pt-2">
                        如果遇到连接错误，请检查网络是否能访问 api.github.com
                      </p>
                  </div>
              </div>
          ) : (
             /* Connected State */
             <>
                <div className={`p-4 rounded-xl border ${
                    status.type === 'error' ? 'bg-red-50 border-red-200' :
                    gistId ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                } transition-colors duration-300`}>
                    <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                            status.type === 'error' ? 'bg-red-100 text-red-600' :
                            gistId ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                            {isChecking ? <Loader2 size={16} className="animate-spin" /> : 
                             status.type === 'error' ? <WifiOff size={16} /> : 
                             gistId ? <Check size={16} /> : <HelpCircle size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold ${
                                status.type === 'error' ? 'text-red-800' :
                                gistId ? 'text-green-800' : 'text-slate-700'
                            }`}>
                                {isChecking ? '正在连接...' : status.type === 'error' ? '连接错误' : gistId ? '云端已连接' : '就绪'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">
                                {isChecking ? '正在验证 Token...' : 
                                 status.type === 'error' ? status.msg :
                                 gistId ? `ID: ${gistId}` : 
                                 '点击上传可创建新备份'}
                            </p>
                            {lastUpdated && (
                                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-green-700 bg-green-100/50 w-fit px-2 py-1 rounded-md">
                                    <Clock size={10} />
                                    {lastUpdated}
                                </div>
                            )}
                        </div>
                        {!isChecking && (
                            <button onClick={() => checkForBackup(token)} className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors" title="刷新状态">
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Message (Loading/Success) */}
                {status.msg && status.type !== 'idle' && status.type !== 'error' && (
                     <div className={`flex items-center gap-2 text-xs p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2 ${
                         status.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 
                         'bg-blue-50 text-blue-600 border border-blue-100'
                     }`}>
                        {status.type === 'loading' && <Loader2 size={14} className="animate-spin shrink-0" />}
                        {status.type === 'success' && <Check size={14} className="shrink-0" />}
                        <span className="font-medium">{status.msg}</span>
                     </div>
                )}

                <div className="grid gap-3 pt-2">
                    <button
                        onClick={handleUpload}
                        disabled={isChecking || status.type === 'loading'}
                        className="group relative overflow-hidden flex items-center justify-between bg-slate-900 hover:bg-blue-600 text-white rounded-xl px-4 py-3.5 font-medium transition-all shadow-md hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <UploadCloud size={18} className="text-blue-300 group-hover:text-white transition-colors" />
                            <div className="text-left">
                                <div className="text-sm font-bold">上传备份 (本机 &rarr; 云端)</div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={isChecking || status.type === 'loading' || !gistId}
                        className="group relative overflow-hidden flex items-center justify-between bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 rounded-xl px-4 py-3.5 font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <DownloadCloud size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                            <div className="text-left">
                                <div className="text-sm font-bold group-hover:text-blue-700">恢复数据 (云端 &rarr; 本机)</div>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-center">
                    <button 
                        onClick={() => setNeedsTokenConfig(true)} 
                        className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                        <Key size={10} />
                        更换 Token / 重新配置
                    </button>
                </div>
             </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SyncModal;
