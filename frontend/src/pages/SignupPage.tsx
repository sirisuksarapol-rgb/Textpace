import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import Topbar from "../components/Topbar";
import { authApi } from "../api/authApi";

export default function SignupPage() {
  const { lang, theme } = useApp();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const googleContainerRef = useRef<HTMLDivElement | null>(null);
  const [googleBtnWidth, setGoogleBtnWidth] = useState<number>(320);

  // ปรับความกว้างปุ่ม Google Signup อัตโนมัติให้พอดีกับการ์ดในทุกขนาดหน้าจอ
  useEffect(() => {
    const el = googleContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const containerWidth = Math.floor(el.getBoundingClientRect().width);
      if (containerWidth > 0) {
        setGoogleBtnWidth(Math.min(400, Math.max(200, containerWidth)));
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (form.password !== form.confirmPassword) {
      setErrorMsg(
        lang === "th"
          ? "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน"
          : "Passwords do not match",
      );
      return;
    }

    try {
      setIsLoading(true);
      await authApi.signup({
        username: form.username,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        password: form.password,
      });

      navigate("/verify-otp", {
        state: {
          email: form.email,
          username: form.username,
          firstName: form.firstName,
          lastName: form.lastName,
        },
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    th: {
      signupTitle: "สร้างบัญชีผู้ใช้งาน",
      signupDesc: "กรอกข้อมูลส่วนตัวเพื่อรับรหัสยืนยันตัวตนทางอีเมล",
      username: "ชื่อผู้ใช้งาน (Username)",
      firstName: "ชื่อจริง",
      lastName: "นามสกุล",
      email: "อีเมล",
      password: "รหัสผ่าน",
      confirmPassword: "ยืนยันรหัสผ่าน",
      showPassword: "แสดงรหัสผ่าน",
      hidePassword: "ซ่อนรหัสผ่าน",
      signupBtn: "ดำเนินการต่อเพื่อยืนยัน OTP",
      sendingOtp: "กำลังส่งรหัส OTP...",
      orContinue: "หรือดำเนินการต่อด้วย",
      hasAccount: "มีบัญชีผู้ใช้งานอยู่แล้ว?",
      goLogin: "เข้าสู่ระบบ",
      securityNote: "ข้อมูลของคุณถูกเข้ารหัสและปกป้องตามมาตรฐานความปลอดภัย",
    },
    en: {
      signupTitle: "Create an account",
      signupDesc: "Fill in your details to receive an email verification code",
      username: "Username",
      firstName: "First name",
      lastName: "Last name",
      email: "Email address",
      password: "Password",
      confirmPassword: "Confirm password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      signupBtn: "Continue to OTP Verification",
      sendingOtp: "Sending OTP...",
      orContinue: "Or continue with",
      hasAccount: "Already have an account?",
      goLogin: "Log in",
      securityNote:
        "Your data is encrypted and protected with standard security",
    },
  }[lang];

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-[580px] h-[220px] sm:h-[300px] bg-blue-500/10 dark:bg-blue-500/15 blur-3xl rounded-full"
      />

      <Topbar />

      <main className="relative z-10 flex-1 flex items-center justify-center px-3.5 sm:px-6 py-6 sm:py-10 md:py-14">
        <div className="w-full max-w-[480px]">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-black/50 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

            <div className="p-5 sm:p-7 md:p-9 space-y-5 sm:space-y-6">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">
                  {t.signupTitle}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.signupDesc}
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-username"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    {t.username}
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-username"
                      type="text"
                      required
                      minLength={3}
                      autoComplete="username"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      placeholder="somchai_dev"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-firstname"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                    >
                      {t.firstName}
                    </label>
                    <input
                      id="signup-firstname"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      placeholder={lang === "th" ? "สมชาย" : "Somchai"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-lastname"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                    >
                      {t.lastName}
                    </label>
                    <input
                      id="signup-lastname"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      placeholder={lang === "th" ? "ใจดี" : "Jaidee"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                  >
                    {t.email}
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                    >
                      {t.password}
                    </label>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-password"
                        type={showPass ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? t.hidePassword : t.showPassword}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-confirm-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                    >
                      {t.confirmPassword}
                    </label>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-confirm-password"
                        type={showConfirmPass ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={(e) =>
                          setForm({ ...form, confirmPassword: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        aria-label={
                          showConfirmPass ? t.hidePassword : t.showPassword
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPass ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-center leading-snug transition-all disabled:opacity-60 cursor-pointer"
                >
                  <span>{isLoading ? t.sendingOtp : t.signupBtn}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4 shrink-0" />}
                </button>
              </form>

              <div className="relative flex items-center">
                <div className="grow border-t border-slate-200 dark:border-slate-800" />
                <span className="shrink mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {t.orContinue}
                </span>
                <div className="grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <div
                ref={googleContainerRef}
                className="w-full flex justify-center overflow-hidden"
              >
                <GoogleLogin
                  onSuccess={async (credentialResponse: CredentialResponse) => {
                    if (!credentialResponse.credential) return;
                    try {
                      setIsLoading(true);
                      setErrorMsg("");
                      const res = await authApi.googleLogin(
                        credentialResponse.credential,
                      );
                      localStorage.setItem("access_token", res.access_token);
                      localStorage.setItem("user", JSON.stringify(res.user));
                      navigate("/login");
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
                        : "Google signup failed",
                    );
                  }}
                  theme={theme === "dark" ? "filled_black" : "outline"}
                  size="large"
                  width={String(googleBtnWidth)}
                  text="signup_with"
                  shape="pill"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {t.hasAccount}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-block"
                >
                  {t.goLogin}
                </Link>
              </div>
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