"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function GoogleLoginRedirect() {
  const [message, setMessage] = useState("Opening Google login...");

  useEffect(() => {
    const supabase = createClient();

    async function redirectToGoogle() {
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
        setMessage(error.message);
      }
    }

    redirectToGoogle();
  }, []);

  return (
    <div className="mx-auto mt-24 grid w-full max-w-md gap-4 rounded-xl border border-white/70 bg-white/70 p-8 text-center shadow-sm backdrop-blur">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-200/70 text-lg font-black text-blue-600">
        G
      </div>
      <h1 className="text-2xl font-black text-slate-950">Login</h1>
      <p className="text-base leading-7 text-slate-600">{message}</p>
    </div>
  );
}
