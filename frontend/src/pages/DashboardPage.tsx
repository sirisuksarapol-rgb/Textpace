import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LogOut, Upload, MessageSquare, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Topbar from '../components/Topbar';

interface StoredUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function DashboardPage() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const rawUser = localStorage.getItem('user');

    if (!token || !rawUser) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      setUser(JSON.parse(rawUser) as StoredUser);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  const t = {
    th: {
      welcome: 'ยินดีต้อนรับ',
      subtitle: 'พื้นที่จัดการเอกสารและถาม-ตอบอัจฉริยะของคุณพร้อมใช้งานแล้ว',
      logout: 'ออกจากระบบ',
      uploadTitle: 'อัปโหลดเอกสารใหม่',
      uploadDesc: 'รองรับไฟล์ PDF, DOCX และ TXT สำหรับวิเคราะห์ด้วย AI',
      chatTitle: 'ถาม-ตอบจากคลังเอกสาร',
      chatDesc: 'สนทนาและค้นหาคำตอบพร้อมแหล่งอ้างอิงจากเอกสารของคุณ',
      comingSoon: 'กำลังพัฒนาในขั้นตอนถัดไป',
    },
    en: {
      welcome: 'Welcome',
      subtitle: 'Your AI document workspace is ready',
      logout: 'Log out',
      uploadTitle: 'Upload Documents',
      uploadDesc: 'Supports PDF, DOCX, and TXT files for AI analysis',
      chatTitle: 'Document AI Chat',
      chatDesc: 'Ask questions and get answers with citations from your files',
      comingSoon: 'Coming in next step',
    },
  }[lang];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Topbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* แถบข้อมูลผู้ใช้ & ปุ่มออกจากระบบ */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {t.welcome}, {user.first_name} {user.last_name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                @{user.username} • {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-sm font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>

        {/* การ์ดเมนูหลักเบื้องต้น */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>{t.uploadTitle}</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.uploadDesc}</p>
            <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {t.comingSoon}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">{t.chatTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.chatDesc}</p>
            <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {t.comingSoon}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}