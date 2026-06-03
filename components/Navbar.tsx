import { signOut } from "@/app/actions";
import { BrandWordmark } from "@/components/BrandWordmark";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function Navbar() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  return (
    <header>
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <BrandWordmark href="/" className="text-xl" />
        {data.user ? (
          <form action={signOut}>
            <button
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:px-6"
              type="submit"
            >
              Logout
            </button>
          </form>
        ) : (
          <Link
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:px-6"
            href="/login"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
