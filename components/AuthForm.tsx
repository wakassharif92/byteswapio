"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/dashboard` },
          });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setGoogleLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-12 grid w-full max-w-md gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">
          {mode === "login" ? "Login" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "login" ? (
            <>
              Access your private <BrandWordmark className="text-inherit" />{" "}
              dashboard.
            </>
          ) : (
            "Save and manage your expiring shares privately."
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={googleLoading}
        className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 text-xs font-bold text-slate-700">
          G
        </span>
        {googleLoading ? "Opening Google..." : "Continue with Google"}
      </button>
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Email
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Email
        <input
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Password
        <input
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
          type="password"
          value={password}
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <button
        disabled={loading}
        className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
      </button>
      <p className="text-sm text-slate-600">
        {mode === "login" ? "No account yet?" : "Already registered?"}{" "}
        <Link
          className="font-semibold text-slate-950 underline"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Register" : "Login"}
        </Link>
      </p>
    </form>
  );
}
