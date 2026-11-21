import { Link } from 'react-router-dom';
import { FileText, Sun, Moon, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Topbar() {
  const { lang, toggleLang, theme, toggleTheme } = useApp();

  const text = {
    th: { login: 'เข้าสู่ระบบ', signup: 'สมัครสมาชิก' },
    en: { login: 'Log in', signup: 'Sign up' },
  }[lang];

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* ซ้ายสุด: โลโก้ */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            Textspace
          </span>
        </Link>

        {/* ฝั่งขวา: 2 ภาษา + Dark Mode + Login / Sign up */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ปุ่มสลับ 2 ภาษา */}
          <button
            onClick={toggleLang}
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* ปุ่ม Dark Mode (พระอาทิตย์ / พระจันทร์) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
          </button>

          {/* เส้นคั่นบาง ๆ */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* ปุ่ม Login */}
          <Link
            to="/login"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {text.login}
          </Link>

          {/* ปุ่ม Sign up */}
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            {text.signup}
          </Link>
        </div>
      </div>
    </header>
  );
}