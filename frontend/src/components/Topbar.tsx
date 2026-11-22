import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sun, Moon, Globe, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Topbar() {
  const { lang, toggleLang, theme, toggleTheme } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const text = {
    th: {
      login: 'เข้าสู่ระบบ',
      signup: 'สมัครสมาชิก',
      openMenu: 'เปิดเมนู',
      closeMenu: 'ปิดเมนู',
    },
    en: {
      login: 'Log in',
      signup: 'Sign up',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
  }[lang];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* ซ้ายสุด: โลโก้ */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 group"
        >
          <div className="p-1.5 sm:p-2 rounded-xl bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            Textspace
          </span>
        </Link>

        {/* ฝั่งขวา (Tablet & Desktop: >= 640px) */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3">
          {/* ปุ่มสลับ 2 ภาษา */}
          <button
            type="button"
            onClick={toggleLang}
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* ปุ่ม Dark Mode */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
          </button>

          {/* เส้นคั่น */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* ปุ่ม Login */}
          <Link
            to="/login"
            className="px-3 md:px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {text.login}
          </Link>

          {/* ปุ่ม Sign up */}
          <Link
            to="/signup"
            className="px-3.5 md:px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors whitespace-nowrap"
          >
            {text.signup}
          </Link>
        </div>

        {/* ฝั่งขวา (Mobile: < 640px) */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            type="button"
            onClick={toggleLang}
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase">{lang}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? text.closeMenu : text.openMenu}
            className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* เมนูดรอปดาวน์สำหรับหน้าจอมือถือ (< 640px) */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 px-4 py-3 space-y-2 shadow-lg">
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {text.login}
          </Link>
          <Link
            to="/signup"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            {text.signup}
          </Link>
        </div>
      )}
    </header>
  );
}