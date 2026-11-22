import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  MailCheck,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Topbar from '../components/Topbar';
import { authApi } from '../api/authApi';

interface SignupLocationState {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export default function VerifyOtpPage() {
  const { lang } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state as SignupLocationState) || {};
  const email = state.email;

  const [isLoading, setIsLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // โฟกัสช่องแรกอัตโนมัติเมื่อเปิดหน้า
  useEffect(() => {
    if (email) {
      otpRefs.current[0]?.focus();
    }
  }, [email]);

  // นับถอยหลังสำหรับปุ่มขอรหัสใหม่
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // หากเข้า URL /verify-otp มาตรง ๆ โดยไม่ได้ผ่านหน้าสมัครสมาชิก ให้เด้งกลับไป /signup
  if (!email) {
    return <Navigate to="/signup" replace />;
  }

  const handleOtpChange = (index: number, value: string) => {
    setErrorMsg('');
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    if (clean && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMsg('');
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading) return;
    try {
      setErrorMsg('');
      await authApi.resendOtp(email);
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(60);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถส่งรหัสใหม่ได้');
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg(lang === 'th' ? 'กรุณากรอกรหัส OTP ให้ครบทั้ง 6 หลัก' : 'Please enter all 6 digits');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      await authApi.verifyOtp(email, code);
      setIsVerified(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'รหัส OTP ไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    th: {
      docBadge: 'VERIFICATION • STEP 2/2',
      title: 'ยืนยันรหัส OTP',
      desc: 'เราได้ส่งรหัสยืนยัน 6 หลักไปยังอีเมล',
      otpPrompt: 'กรอกรหัสยืนยันที่ได้รับทางอีเมล',
      verifyBtn: 'ยืนยันรหัสและเปิดใช้งานบัญชี',
      verifyingBtn: 'กำลังตรวจสอบรหัส...',
      noCode: 'ไม่ได้รับรหัสยืนยัน?',
      resendBtn: 'ส่งรหัสอีกครั้ง',
      resendWait: 'ขอรหัสใหม่ได้ใน',
      backToSignup: 'แก้ไขอีเมลหรือข้อมูลสมัครสมาชิก',
      successTitle: 'ยืนยันตัวตนสำเร็จ!',
      successDesc: 'บัญชีของคุณพร้อมใช้งานแล้ว กำลังพาไปยังหน้าเข้าสู่ระบบ...',
      securityNote: 'รหัส OTP มีอายุการใช้งาน 30 นาทีเพื่อความปลอดภัยของบัญชี',
    },
    en: {
      docBadge: 'VERIFICATION • STEP 2/2',
      title: 'Verify your email',
      desc: 'We sent a 6-digit verification code to',
      otpPrompt: 'Enter the 6-digit code from your inbox',
      verifyBtn: 'Verify & Activate Account',
      verifyingBtn: 'Verifying code...',
      noCode: "Didn't receive the code?",
      resendBtn: 'Resend code',
      resendWait: 'Resend available in',
      backToSignup: 'Edit email or registration details',
      successTitle: 'Email Verified!',
      successDesc: 'Your account is now active. Redirecting to log in...',
      securityNote: 'OTP codes expire in 30 minutes for your account security',
    },
  }[lang];

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden">
      {/* พื้นหลังลายจุดจาง ๆ + แสง Glow ด้านบน */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-[540px] h-[220px] sm:h-[280px] bg-blue-500/10 dark:bg-blue-500/15 blur-3xl rounded-full"
      />

      <Topbar />

      <main className="relative z-10 flex-1 flex items-center justify-center px-3.5 sm:px-6 py-6 sm:py-10 md:py-14">
        <div className="w-full max-w-[440px]">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 overflow-hidden">
            {/* แถบสีด้านบนสุด */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400" />

            <div className="p-5 sm:p-7 md:p-9">
              {!isVerified ? (
                <div className="space-y-5 sm:space-y-6">
                  {/* ส่วนหัวการ์ด */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-[10px] sm:text-[11px] font-mono font-semibold tracking-wide">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      <span>{t.docBadge}</span>
                    </div>

                    <div className="flex items-start gap-3 sm:gap-3.5 pt-0.5 sm:pt-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <MailCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {t.title}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          {t.desc}{' '}
                          <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">
                            {email}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* แจ้งเตือน Error */}
                  {errorMsg && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="break-words">{errorMsg}</span>
                    </div>
                  )}

                  {/* ฟอร์มกรอก OTP 6 หลัก */}
                  <form onSubmit={handleVerifySubmit} className="space-y-4 sm:space-y-5">
                    <div className="space-y-2 sm:space-y-2.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-center">
                        {t.otpPrompt}
                      </label>

                      <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                            aria-label={`OTP digit ${idx + 1}`}
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            onPaste={handleOtpPaste}
                            className="w-full h-11 sm:h-13 text-center font-mono font-bold text-base sm:text-xl rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-white shadow-2xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-center leading-snug transition-all disabled:opacity-60 cursor-pointer"
                    >
                      <span>{isLoading ? t.verifyingBtn : t.verifyBtn}</span>
                      {!isLoading && <ArrowRight className="w-4 h-4 shrink-0" />}
                    </button>
                  </form>

                  {/* ปุ่มส่งรหัส OTP อีกครั้ง */}
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p>{t.noCode}</p>
                    {countdown > 0 ? (
                      <p className="font-mono text-slate-400 dark:text-slate-500">
                        {t.resendWait}{' '}
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {countdown}s
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="inline-flex items-center gap-1.5 py-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.resendBtn}</span>
                      </button>
                    )}
                  </div>

                  {/* ย้อนกลับไปแก้ไขอีเมล */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 inline-flex items-center justify-center gap-1.5 py-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.backToSignup}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* สถานะเมื่อยืนยัน OTP สำเร็จ */
                <div role="status" className="py-4 sm:py-6 text-center space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {t.successTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t.successDesc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 sm:mt-5 px-2 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{t.securityNote}</span>
          </div>
        </div>
      </main>
    </div>
  );
}