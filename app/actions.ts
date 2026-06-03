"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteShare(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.");
  }
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  await supabase.from("shares").delete().eq("id", id).eq("owner_id", data.user.id);
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}
