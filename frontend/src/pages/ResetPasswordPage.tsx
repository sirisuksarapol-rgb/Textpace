import { useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Topbar from '../components/Topbar';
import { authApi } from '../api/authApi';

export default function ResetPasswordPage() {
  const { lang } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg(lang === 'th' ? 'ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน' : 'Missing reset token');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(lang === 'th' ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.resetPassword(token, newPassword);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    th: {
      title: 'ตั้งรหัสผ่านใหม่',
      desc: 'กรอกรหัสผ่านใหม่ที่คุณต้องการใช้เข้าสู่ระบบ Textspace',
      newPass: 'รหัสผ่านใหม่',
      confirmPass: 'ยืนยันรหัสผ่านใหม่',
      submitBtn: 'บันทึกรหัสผ่านใหม่',
      savingBtn: 'กำลังบันทึก...',
      successTitle: 'เปลี่ยนรหัสผ่านสำเร็จ!',
      successDesc: 'กำลังพาคุณกลับไปยังหน้าเข้าสู่ระบบ...',
      backLogin: 'กลับไปหน้าเข้าสู่ระบบ',
    },
    en: {
      title: 'Set new password',
      desc: 'Enter a new password for your Textspace account',
      newPass: 'New password',
      confirmPass: 'Confirm new password',
      submitBtn: 'Save New Password',
      savingBtn: 'Saving...',
      successTitle: 'Password Updated!',
      successDesc: 'Redirecting you to log in...',
      backLogin: 'Back to Log in',
    },
  }[lang];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Topbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />
          <div className="p-7 sm:p-9">
            {!isSuccess ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h1 className="text-2xl font-bold">{t.title}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.desc}</p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {t.newPass}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {t.confirmPass}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isLoading ? t.savingBtn : t.submitBtn}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <Link
                    to="/login"
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t.backLogin}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold">{t.successTitle}</h2>
                <p className="text-sm text-slate-500">{t.successDesc}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}