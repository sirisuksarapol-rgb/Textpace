import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, KeyRound, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import Topbar from "../components/Topbar";
import { authApi } from "../api/authApi";

function saveAuthSession(accessToken: string, user: unknown, rememberMe: boolean): void {
  const serializedUser = JSON.stringify(user);

  // เก็บลง sessionStorage เสมอ เพื่อให้แต่ละแท็บแยกบัญชีกันอิสระ
  sessionStorage.setItem("access_token", accessToken);
  sessionStorage.setItem("user", serializedUser);

  // เก็บลง localStorage เฉพาะตอนติ๊กจดจำการเข้าสู่ระบบ
  if (rememberMe) {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("user", serializedUser);
  } else {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  }
}

export default function LoginPage() {
  const { lang, theme } = useApp();
  const navigate = useNavigate();

  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      setIsLoading(true);
      const res = await authApi.login(email, password, rememberMe);
      saveAuthSession(res.access_token, res.user, rememberMe);
      navigate("/home");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      setIsLoading(true);
      await authApi.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    th: {
      loginTitle: "ยินดีต้อนรับกลับมา",
      loginDesc: "เข้าสู่ระบบเพื่อจัดการคลังเอกสารและถาม-ตอบกับ AI",
      email: "อีเมล",
      password: "รหัสผ่าน",
      rememberMe: "จดจำการเข้าสู่ระบบ",
      showPassword: "แสดงรหัสผ่าน",
      hidePassword: "ซ่อนรหัสผ่าน",
      forgotPassword: "ลืมรหัสผ่าน?",
      loginBtn: "เข้าสู่ระบบ",
      loggingIn: "กำลังเข้าสู่ระบบ...",
      orContinue: "หรือดำเนินการต่อด้วย",
      noAccount: "ยังไม่มีบัญชีผู้ใช้งาน?",
      goSignup: "สมัครสมาชิกใหม่",
      securityNote: "เชื่อมต่ออย่างปลอดภัยด้วยการเข้ารหัสมาตรฐาน",
      forgotTitle: "กู้คืนรหัสผ่าน",
      forgotDesc:
        "กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้คุณ",
      sendResetBtn: "ส่งลิงก์รีเซ็ตรหัสผ่าน",
      sendingReset: "กำลังส่งลิงก์...",
      forgotSuccess:
        "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบกล่องจดหมาย",
      backToLogin: "กลับไปหน้าเข้าสู่ระบบ",
    },
    en: {
      loginTitle: "Welcome back",
      loginDesc: "Sign in to manage your documents and AI workspace",
      email: "Email address",
      password: "Password",
      rememberMe: "Remember me",
      showPassword: "Show password",
      hidePassword: "Hide password",
      forgotPassword: "Forgot password?",
      loginBtn: "Log in",
      loggingIn: "Logging in...",
      orContinue: "Or continue with",
      noAccount: "Don't have an account?",
      goSignup: "Create an account",
      securityNote: "Protected with end-to-end encrypted session",
      forgotTitle: "Reset Password",
      forgotDesc:
        "Enter your registered email and we will send you a password reset link.",
      sendResetBtn: "Send Reset Link",
      sendingReset: "Sending link...",
      forgotSuccess:
        "A password reset link has been sent to your email. Please check your inbox.",
      backToLogin: "Back to Log in",
    },
  }[lang];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 w-[540px] h-[280px] bg-blue-500/10 dark:bg-blue-500/15 blur-3xl rounded-full"
      />

      <Topbar />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px]">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

            <div className="p-7 sm:p-9">
              {!isForgotMode ? (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">
                      {t.loginTitle}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t.loginDesc}
                    </p>
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

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-email"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                      >
                        {t.email}
                      </label>
                      <div className="relative group">
                        <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="login-password"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                        >
                          {t.password}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg("");
                            setForgotSent(false);
                            setIsForgotMode(true);
                          }}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer"
                        >
                          {t.forgotPassword}
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="login-password"
                          type={showPass ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          aria-label={
                            showPass ? t.hidePassword : t.showPassword
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPass ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {t.rememberMe}
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      <span>{isLoading ? t.loggingIn : t.loginBtn}</span>
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>

                  <div className="relative flex items-center">
                    <div className="grow border-t border-slate-200 dark:border-slate-800" />
                    <span className="shrink mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      {t.orContinue}
                    </span>
                    <div className="grow border-t border-slate-200 dark:border-slate-800" />
                  </div>

                  <div className="w-full flex justify-center">
                    <GoogleLogin
                      onSuccess={async (
                        credentialResponse: CredentialResponse,
                      ) => {
                        if (!credentialResponse.credential) return;
                        try {
                          setIsLoading(true);
                          setErrorMsg("");
                          const res = await authApi.googleLogin(
                            credentialResponse.credential,
                          );
                          saveAuthSession(res.access_token, res.user, rememberMe);
                          navigate("/home");
                        } catch (err) {
                          setErrorMsg(
                            err instanceof Error
                              ? err.message
                              : "เชื่อมต่อ Google ไม่สำเร็จ",
                          );
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      onError={() => {
                        setErrorMsg(
                          lang === "th"
                            ? "การเชื่อมต่อ Google ถูกยกเลิก"
                            : "Google login failed",
                        );
                      }}
                      theme={theme === "dark" ? "filled_black" : "outline"}
                      size="large"
                      width="368"
                      text="continue_with"
                      shape="pill"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center text-sm text-slate-600 dark:text-slate-400">
                    {t.noAccount}{" "}
                    <Link
                      to="/signup"
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t.goSignup}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {t.forgotTitle}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t.forgotDesc}
                    </p>
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

                  {forgotSent ? (
                    <div
                      role="status"
                      className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3 leading-relaxed"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.forgotSuccess}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="forgot-email"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                        >
                          {t.email}
                        </label>
                        <div className="relative group">
                          <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="forgot-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {isLoading ? t.sendingReset : t.sendResetBtn}
                      </button>
                    </form>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg("");
                        setIsForgotMode(false);
                      }}
                      className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t.backToLogin}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.securityNote}</span>
          </div>
        </div>
      </main>
    </div>
  );
}