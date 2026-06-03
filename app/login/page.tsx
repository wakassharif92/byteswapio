import { GoogleLoginRedirect } from "@/components/GoogleLoginRedirect";
import { Navbar } from "@/components/Navbar";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <GoogleLoginRedirect />
      </main>
    </>
  );
}
