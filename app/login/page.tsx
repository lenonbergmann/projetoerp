// app/login/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

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

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Carrega e-mail salvo (se houver)
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
      // foca direto na senha se já tem e-mail salvo
      setTimeout(() => passwordInputRef.current?.focus(), 0);
    } else {
      setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, []);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // validações simples no cliente
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

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // sucesso
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDownPassword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // detecta caps lock
    setCapsLockOn(e.getModifierState?.("CapsLock") ?? false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Barra superior discreta */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663030929233/ycNQdXNbXTCnDwvQ.png"
            alt="Projeto BPO"
            className="h-8 w-auto"
          />
          <span className="sr-only">Projeto BPO</span>
        </div>
        <div className="hidden sm:flex items-center text-xs text-slate-500 gap-2">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Conexão segura</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2 gap-8 px-4 sm:px-6 py-10">
        {/* Lado esquerdo (branding/benefícios) - mostra em telas maiores */}
        <section className="hidden lg:flex flex-col justify-center pr-6">
          <h1 className="text-4xl font-semibold leading-tight text-slate-800">
            Bem-vindo ao <span className="text-indigo-600">Projeto BPO</span>
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Gerencie finanças, conciliações e dashboards com precisão. Acesse sua
            conta para continuar o trabalho onde parou.
          </p>

          <ul className="mt-8 space-y-4 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-indigo-600" />
              Fluxo de caixa e conciliações bancárias centralizados.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-indigo-600" />
              Multi-empresa com controle de permissões e segurança.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-indigo-600" />
              Dashboards claros para decisões rápidas e confiáveis.
            </li>
          </ul>
        </section>

        {/* Card de login */}
        <section className="flex items-center">
          <div className="w-full">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-slate-800">
                  Acesse sua conta
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use seu e-mail e senha cadastrados.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                {/* E-mail */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                    <input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                      required
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Senha
                    </label>
                    {capsLockOn && (
                      <span className="text-xs text-amber-600">Caps Lock ativo</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                    <input
                      ref={passwordInputRef}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={onKeyDownPassword}
                      className="block w-full rounded-lg border border-slate-300 pl-9 pr-10 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Lembrar e Esqueci */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
                    <input
                      id="remember-email"
                      name="remember-email"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                    />
                    Salvar e-mail para o próximo login
                  </label>

                  <a
                    href="/forgot-password"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Esqueci minha senha
                  </a>
                </div>

                {/* Erro */}
                {friendlyError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {friendlyError}
                  </div>
                )}

                {/* Botão Entrar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-inset ring-indigo-500/30 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Entrando...
                    </>
                  ) : (
                    <>Entrar</>
                  )}
                </button>
              </form>

              {/* Rodapé pequeno */}
              <p className="mt-6 text-center text-xs text-slate-500">
                Ao continuar, você concorda com nossos{" "}
                <a href="/termos" className="underline underline-offset-2 hover:text-slate-700">
                  Termos
                </a>{" "}
                e{" "}
                <a href="/privacidade" className="underline underline-offset-2 hover:text-slate-700">
                  Política de Privacidade
                </a>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 sm:px-6 pb-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Projeto BPO — Todos os direitos reservados.
      </footer>
    </div>
  );
}
