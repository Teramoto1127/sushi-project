import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "ログイン・新規登録" };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/questions");

  return (
    <main className="mx-auto w-full max-w-sm p-6 pt-12">
      <AuthForm />
    </main>
  );
}