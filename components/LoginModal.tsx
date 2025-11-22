import React, { useState } from 'react';
import { X, Lock, Key, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => { success: boolean; message?: string };
  isFirstTime: boolean;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, isFirstTime }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isFirstTime) {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (password.length < 4) {
        setError('密码至少需要4个字符');
        return;
      }
    }

    const result = onLogin(password);
    if (result.success) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    } else {
      setError(result.message || '密码错误');
    }
  };

  const isLocked = error.includes('锁定') || error.includes('禁止');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            {isFirstTime ? <Key size={20} className="text-blue-500" /> : <Lock size={20} className="text-blue-500" />}
            {isFirstTime ? '设置管理员密码' : '管理员登录'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isFirstTime && (
             <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
               首次使用请设置一个管理员密码，用于后续管理书签。
             </div>
          )}

          <div>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLocked}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-slate-100 disabled:text-slate-400"
              placeholder={isFirstTime ? "输入新密码" : "输入管理员密码"}
              autoFocus
            />
          </div>

          {isFirstTime && (
            <div>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="确认新密码"
              />
            </div>
          )}

          {error && (
            <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${isLocked ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600'}`}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLocked}
            className={`w-full text-white rounded-lg px-4 py-3 font-medium transition shadow-md active:transform active:scale-95 ${
                isLocked
                ? 'bg-slate-400 cursor-not-allowed hover:bg-slate-400'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLocked ? '已锁定' : (isFirstTime ? '设置并登录' : '登录')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
