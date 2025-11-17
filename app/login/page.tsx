// app/login/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(true); // tema padrão

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Carrega e-mail salvo (se houver)
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
      setTimeout(() => passwordInputRef.current?.focus(), 0);
    } else {
      setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, []);

  // Carrega tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem("loginTheme");
    if (savedTheme === "light") setIsDark(false);
    if (savedTheme === "dark") setIsDark(true);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("loginTheme", next ? "dark" : "light");
      return next;
    });
  };

  // Mapeia melhor as mensagens de erro do Supabase
  const friendlyError = useMemo(() => {
    if (!errorMsg) return null;
    const lower = errorMsg.toLowerCase();

    if (lower.includes("invalid login credentials")) {
      return "E-mail ou senha inválidos.";
    }
    if (lower.includes("email not confirmed")) {
      return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
    }
    if (lower.includes("too many requests")) {
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }
    return errorMsg; // fallback
  }, [errorMsg]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Preencha e-mail e senha para continuar.");
      return;
    }

    setLoading(true);
    try {
      if (rememberEmail) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDownPassword = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState?.("CapsLock") ?? false);
  };

  // Helpers de tema
  const bgClass = isDark
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
    : "bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900";

  const topGlow = isDark ? (
    <>
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute bottom-[-6rem] left-1/3 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.06),_transparent_55%)]" />
    </>
  ) : (
    <>
      <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
      <div className="absolute -right-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute bottom-[-6rem] left-1/3 h-56 w-56 rounded-full bg-emerald-100 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_55%)]" />
    </>
  );

  const cardClass = isDark
    ? "bg-slate-900/80 shadow-2xl shadow-slate-950/60 ring-1 ring-slate-700/70"
    : "bg-white/90 shadow-xl shadow-slate-200/80 ring-1 ring-slate-200";

  const inputWrapperClass = (extra?: string) =>
    (isDark
      ? "border-slate-700 bg-slate-950/60 text-slate-50 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-indigo-500/40"
      : "border-slate-200 bg-slate-50/60 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-indigo-500/30") +
    " " +
    (extra || "");

  const labelClass = isDark
    ? "text-xs sm:text-sm font-medium text-slate-200"
    : "text-xs sm:text-sm font-medium text-slate-700";

  const smallMutedText = isDark ? "text-slate-400" : "text-slate-500";
  const helperMutedText = isDark ? "text-slate-500" : "text-slate-400";

  const heroTitleSpan = isDark
    ? "bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent"
    : "bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent";

  const heroBoxClass = isDark
    ? "rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-700/80"
    : "rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200";

  const rememberText = isDark ? "text-slate-200" : "text-slate-700";

  const footerTextClass = isDark ? "text-slate-500" : "text-slate-400";

  const topbarSubtitle = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`relative min-h-screen overflow-hidden ${bgClass}`}>
      {/* Elementos decorativos */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {topGlow}
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div
              className={
                isDark
                  ? "flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 ring-1 ring-slate-700/70"
                  : "flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
              }
            >
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663030929233/ycNQdXNbXTCnDwvQ.png"
                alt="Projeto BPO"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                Projeto BPO
              </span>
              <span className={`text-[11px] ${topbarSubtitle}`}>
                ERP financeiro para múltiplas empresas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de tema */}
            <button
              type="button"
              onClick={toggleTheme}
              className={
                isDark
                  ? "flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-200 ring-1 ring-slate-700/80 hover:bg-slate-800"
                  : "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              }
              aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
            >
              {isDark ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Badge conexão segura */}
            <div
              className={`hidden items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium sm:flex ${
                isDark
                  ? "bg-slate-900/70 text-slate-300 ring-1 ring-slate-700/80"
                  : "bg-white/80 text-slate-600 shadow-sm ring-1 ring-slate-200"
              }`}
            >
              <span
                className={
                  isDark
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600/90 text-[10px] font-bold text-emerald-50"
                    : "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
                }
              >
                ●
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${
                    isDark ? "text-slate-200" : "text-emerald-600"
                  }`}
                  aria-hidden="true"
                />
                Conexão segura
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* Lado esquerdo */}
            <section className="space-y-8">
              <div
                className={
                  isDark
                    ? "inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30"
                    : "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100"
                }
              >
                <span
                  className={
                    isDark
                      ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
                      : "h-1.5 w-1.5 rounded-full bg-emerald-500"
                  }
                />
                <span>Plataforma financeira 360º</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Centralize o{" "}
                  <span className={heroTitleSpan}>BPO Financeiro</span> em um só
                  lugar.
                </h1>
                <p
                  className={`max-w-xl text-sm leading-relaxed sm:text-base ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Controle contas a pagar e receber, conciliações bancárias,
                  importações e dashboards em tempo real. Tudo pensado para
                  multi-empresa e multi-loja.
                </p>
              </div>

              <div className="grid max-w-xl gap-4 text-sm sm:grid-cols-2">
                <div className={heroBoxClass}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Fluxo de caixa
                  </p>
                  <p
                    className={`mt-1 font-semibold ${
                      isDark ? "text-slate-50" : "text-slate-900"
                    }`}
                  >
                    Visão diária, semanal e mensal.
                  </p>
                  <p className={`mt-2 text-xs ${helperMutedText}`}>
                    Simule cenários, entenda impactos de pagamentos e garanta
                    previsibilidade.
                  </p>
                </div>
                <div className={heroBoxClass}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Conciliação inteligente
                  </p>
                  <p
                    className={`mt-1 font-semibold ${
                      isDark ? "text-slate-50" : "text-slate-900"
                    }`}
                  >
                    Menos erros, mais produtividade.
                  </p>
                  <p className={`mt-2 text-xs ${helperMutedText}`}>
                    Concilie extratos, recebíveis de cartão, PIX e boletos com
                    poucos cliques.
                  </p>
                </div>
              </div>

              <p className={`text-xs ${helperMutedText}`}>
                Dica: mantenha seus acessos pessoais. Cada colaborador terá seu
                próprio nível de permissão no sistema.
              </p>
            </section>

            {/* Card de login */}
            <section className="flex justify-center">
              <div className="w-full max-w-md">
                <div
                  className={`relative rounded-2xl p-6 xl:p-7 ${cardClass}`}
                >
                  {/* Glow lateral */}
                  <div
                    className={`pointer-events-none absolute inset-y-3 -right-16 hidden w-24 rounded-full blur-2xl md:block ${
                      isDark
                        ? "bg-gradient-to-b from-indigo-500/40 via-sky-500/30 to-emerald-400/30"
                        : "bg-gradient-to-b from-indigo-200 via-sky-200 to-emerald-200"
                    }`}
                  />

                  <div className="mb-6 space-y-2 text-center">
                    <h2
                      className={`text-lg sm:text-xl font-semibold tracking-tight ${
                        isDark ? "text-slate-50" : "text-slate-900"
                      }`}
                    >
                      Acesse sua conta
                    </h2>
                    <p
                      className={`text-xs sm:text-sm ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Use seu e-mail e senha cadastrados para entrar no Projeto
                      BPO.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5" noValidate>
                    {/* E-mail */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className={labelClass}>
                        E-mail
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Mail
                            className={
                              isDark
                                ? "h-4 w-4 text-slate-500"
                                : "h-4 w-4 text-slate-400"
                            }
                            aria-hidden="true"
                          />
                        </span>
                        <input
                          ref={emailInputRef}
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="username"
                          placeholder="voce@empresa.com.br"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`block w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none ring-1 ring-transparent transition ${inputWrapperClass()}`}
                          required
                        />
                      </div>
                    </div>

                    {/* Senha */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="password" className={labelClass}>
                          Senha
                        </label>
                        {capsLockOn && (
                          <span
                            className={
                              isDark
                                ? "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-amber-500/40"
                                : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
                            }
                          >
                            <span
                              className={
                                isDark
                                  ? "h-1.5 w-1.5 rounded-full bg-amber-400"
                                  : "h-1.5 w-1.5 rounded-full bg-amber-500"
                              }
                            />
                            Caps Lock ativo
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Lock
                            className={
                              isDark
                                ? "h-4 w-4 text-slate-500"
                                : "h-4 w-4 text-slate-400"
                            }
                            aria-hidden="true"
                          />
                        </span>
                        <input
                          ref={passwordInputRef}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={onKeyDownPassword}
                          className={`block w-full rounded-lg border pl-9 pr-10 py-2.5 text-sm outline-none ring-1 ring-transparent transition ${inputWrapperClass()}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className={`absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition hover:text-slate-200 ${
                            !isDark && "hover:text-slate-600"
                          }`}
                          aria-label={
                            showPassword ? "Ocultar senha" : "Mostrar senha"
                          }
                        >
                          {showPassword ? (
                            <EyeOff
                              className="h-4 w-4 sm:h-5 sm:w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            <Eye
                              className="h-4 w-4 sm:h-5 sm:w-5"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Lembrar e Esqueci */}
                    <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                      <label className="flex cursor-pointer select-none items-center gap-2">
                        <input
                          id="remember-email"
                          name="remember-email"
                          type="checkbox"
                          className={
                            isDark
                              ? "h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-400 focus:ring-indigo-500"
                              : "h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                          }
                          checked={rememberEmail}
                          onChange={(e) => setRememberEmail(e.target.checked)}
                        />
                        <span className={rememberText}>
                          Salvar e-mail para o próximo login
                        </span>
                      </label>

                      <a
                        href="/forgot-password"
                        className={
                          isDark
                            ? "text-xs sm:text-sm font-medium text-indigo-300 hover:text-indigo-200"
                            : "text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        }
                      >
                        Esqueci minha senha
                      </a>
                    </div>

                    {/* Erro */}
                    {friendlyError && (
                      <div
                        role="alert"
                        className={
                          isDark
                            ? "rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 sm:text-sm"
                            : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:text-sm"
                        }
                      >
                        {friendlyError}
                      </div>
                    )}

                    {/* Botão Entrar */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-500/20 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-300/70 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Entrando...
                        </>
                      ) : (
                        <>Entrar</>
                      )}
                    </button>
                  </form>

                  {/* Rodapé do card */}
                  <div className="mt-5 space-y-2 text-center">
                    <p
                      className={`text-[11px] ${
                        isDark ? "text-slate-500" : "text-slate-500"
                      }`}
                    >
                      Ao continuar, você concorda com nossos{" "}
                      <a
                        href="/termos"
                        className={
                          isDark
                            ? "underline underline-offset-4 hover:text-slate-300"
                            : "underline underline-offset-4 hover:text-slate-700"
                        }
                      >
                        Termos
                      </a>{" "}
                      e{" "}
                      <a
                        href="/privacidade"
                        className={
                          isDark
                            ? "underline underline-offset-4 hover:text-slate-300"
                            : "underline underline-offset-4 hover:text-slate-700"
                        }
                      >
                        Política de Privacidade
                      </a>
                      .
                    </p>
                    <p className={`text-[11px] ${smallMutedText}`}>
                      Em caso de dúvida, contate o administrador do Projeto BPO.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer
          className={`px-4 pb-5 pt-2 text-center text-[11px] sm:px-8 ${footerTextClass}`}
        >
          © {new Date().getFullYear()} Projeto BPO — Todos os direitos
          reservados.
        </footer>
      </div>
    </div>
  );
}
