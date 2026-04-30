import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { BarChart3, FileCheck2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError, apiClient } from "../api/client";
import { BrandMark } from "../components/brand/BrandMark";
import { DesktopBackendNotice } from "../components/DesktopBackendNotice";
import { StatusBadge } from "../components/design-system";
import { useAuth } from "./AuthProvider";

const loginSchema = z.object({
  email: z.string().email("Inserisci una email valida"),
  password: z.string().min(1, "Inserisci la password")
});

const registerSchema = loginSchema.extend({
  full_name: z.string().min(2, "Inserisci il nome completo").max(255),
  password: z.string().min(10, "La password deve avere almeno 10 caratteri").max(72)
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const form = useForm<LoginForm | RegisterForm>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      email: "demo@example.com",
      password: "Password123!",
      ...(isRegister ? { full_name: "Mario Rossi" } : {})
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: LoginForm | RegisterForm) => {
      if (isRegister) {
        await apiClient.register(values as RegisterForm);
      }
      return apiClient.login({ email: values.email, password: values.password });
    },
    onSuccess: (token) => {
      auth.login(token.access_token);
      navigate("/", { replace: true });
    }
  });

  if (auth.token && auth.user) return <Navigate to="/" replace />;

  return (
    <main className="min-h-screen bg-mist p-4 md:p-8">
      <DesktopBackendNotice />
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-2xl border border-line bg-white shadow-soft md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden bg-finance p-10 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(47,111,83,0.45),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(196,123,39,0.25),transparent_30%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <BrandMark className="h-12 w-12 rounded-2xl shadow-sm" />
              <div>
                <p className="text-xl font-bold">AgriConto Pro</p>
                <p className="text-sm text-white/70">Piattaforma agricola professionale</p>
              </div>
            </div>
            <h1 className="mt-14 max-w-xl text-4xl font-bold leading-tight tracking-tight">
              Dati agricoli ordinati, report puliti, consulenti piu veloci.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
              Gestisci lavoratori, giornate, spese, vendite, documenti e pacchetti commercialista con controlli server-side e audit trail.
            </p>
          </div>
          <div className="relative grid gap-3">
            {[
              ["Accesso sicuro", ShieldCheck],
              ["Report pronti per il commercialista", BarChart3],
              ["Documenti verificabili", FileCheck2]
            ].map(([label, Icon]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
                <Icon size={20} />
                <span className="text-sm font-semibold">{label as string}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-10">
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="w-full">
            <div className="md:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-field text-white">
                  <BrandMark className="h-11 w-11" />
                </div>
                <div>
                  <p className="text-lg font-bold">AgriConto Pro</p>
                  <p className="text-xs text-stone-500">Gestione agricola sicura</p>
                </div>
              </div>
            </div>
            <StatusBadge tone="success">Accesso sicuro</StatusBadge>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-ink">{isRegister ? "Crea il tuo account" : "Bentornato"}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">
              {isRegister
                ? "L'account utente e separato dalla creazione dell'azienda: potrai configurarla dopo il primo accesso."
                : "Organizza lavoro agricolo, documenti e dati contabili in un unico spazio professionale."}
            </p>

            <div className="mt-7 space-y-4">
              {isRegister && (
                <Field label="Nome completo" error={(form.formState.errors as FieldErrors<RegisterForm>).full_name?.message}>
                  <input className="input" autoComplete="name" {...form.register("full_name" as const)} />
                </Field>
              )}
              <Field label="Email" error={form.formState.errors.email?.message}>
                <input className="input" autoComplete="email" {...form.register("email")} />
              </Field>
              <Field label="Password" error={form.formState.errors.password?.message} helper={isRegister ? "Minimo 10 caratteri, con maiuscola, minuscola e numero." : undefined}>
                <input className="input" type="password" autoComplete={isRegister ? "new-password" : "current-password"} {...form.register("password")} />
              </Field>
            </div>

            {mutation.isError && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error instanceof ApiError ? mutation.error.message : "Accesso non riuscito."}
              </p>
            )}
            <button className="btn-primary mt-6 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Attendere..." : isRegister ? "Crea account" : "Accedi"}
            </button>
            <Link to={isRegister ? "/login" : "/register"} className="mt-4 block text-center text-sm font-semibold text-field hover:text-field-dark">
              {isRegister ? "Hai gia un account? Accedi" : "Nuovo su AgriConto Pro? Crea account"}
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ label, error, helper, children }: { label: string; error?: string; helper?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold text-stone-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {helper && !error && <span className="mt-1 block text-xs leading-5 text-stone-500">{helper}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}
