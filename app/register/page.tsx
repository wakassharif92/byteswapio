import { AuthForm } from "@/components/AuthForm";
import { Navbar } from "@/components/Navbar";

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <AuthForm mode="register" />
      </main>
    </>
  );
}
