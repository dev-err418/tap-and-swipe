import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; verify?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, verify } = await searchParams;

  // Already logged in: redirect to course
  if (session?.user) {
    redirect(callbackUrl || "/learn");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Sign in to Tap & Swipe
          </h1>
          <p className="mt-2 text-sm text-black/50">
            Access your course and track your progress.
          </p>
        </div>

        {verify === "1" ? (
          <div className="rounded-xl border border-[#FF9500]/20 bg-[#FF9500]/5 p-6">
            <p className="text-sm text-black/70">
              Check your email for a sign-in link. It may take a minute to arrive.
            </p>
          </div>
        ) : (
          <LoginForm callbackUrl={callbackUrl} />
        )}
      </div>
    </div>
  );
}
