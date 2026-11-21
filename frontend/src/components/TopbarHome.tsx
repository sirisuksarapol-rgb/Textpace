import { Link, useNavigate } from 'react-router-dom';
import { FileText, Sun, Moon, Globe, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface StoredUser {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface TopbarHomeProps {
  activeTitle?: string;
}

export default function TopbarHome({ activeTitle }: TopbarHomeProps) {
  const { lang, toggleLang, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  const token = localStorage.getItem('access_token');
  let currentUser: StoredUser | null = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) currentUser = JSON.parse(raw) as StoredUser;
  } catch {
    currentUser = null;
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const displayName =
    currentUser?.first_name || currentUser?.username || currentUser?.email || 'User';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const text = {
    th: {
      login: 'เข้าสู่ระบบ',
      signup: 'สมัครสมาชิก',
      logout: 'ออกจากระบบ',
      switchLang: 'เปลี่ยนเป็นภาษาอังกฤษ',
      switchTheme: theme === 'light' ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง',
    },
    en: {
      login: 'Log in',
      signup: 'Sign up',
      logout: 'Log out',
      switchLang: 'Switch to Thai',
      switchTheme: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode',
    },
  }[lang];

  return (
    <header className="sticky top-0 z-20 w-full h-14 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors shrink-0">
      <div className="h-full px-4 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link to={token ? '/home' : '/'} className="flex items-center gap-2.5 group shrink-0">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Textspace
            </span>
          </Link>

          {activeTitle && (
            <>
              <span className="text-slate-300 dark:text-slate-700 hidden md:inline">/</span>
              <span className="hidden md:block text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-sm">
                {activeTitle}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLang}
            title={text.switchLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{lang}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title={text.switchTheme}
            aria-label={text.switchTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {token ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center">
                  {avatarInitial}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                  {displayName}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title={text.logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{text.logout}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {text.login}
              </Link>
              <Link
                to="/signup"
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                {text.signup}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}