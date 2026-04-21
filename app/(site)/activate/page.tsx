import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ActivateForm from "./activate-form";

export const metadata: Metadata = {
  title: "Activate your account",
  robots: { index: false, follow: false },
};

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // If already authenticated, clear token and redirect
  const session = await auth();
  if (session?.user) {
    if (token) {
      await prisma.user.updateMany({
        where: { activationToken: token },
        data: { activationToken: null },
      });
    }
    redirect("/learn/classroom");
  }

  // If token provided, look up user
  let maskedEmail: string | null = null;
  let validToken = false;

  if (token) {
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
      select: { email: true },
    });

    if (user?.email) {
      validToken = true;
      // Mask email: j***@gmail.com
      const [local, domain] = user.email.split("@");
      maskedEmail = `${local[0]}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm space-y-8 text-center">
        {!token ? (
          // No token: user arrived from Whop redirect, waiting for email
          <>
            <div>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF9500]/10">
                <svg className="h-8 w-8 text-[#FF9500]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Check your email!
              </h1>
              <p className="mt-3 text-sm text-black/50 leading-relaxed">
                We sent you a welcome email with a link to activate your account. It should arrive within a minute.
              </p>
            </div>

            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-5 text-left">
              <p className="text-xs text-black/40 mb-3">Already have an account?</p>
              <ActivateForm />
            </div>
          </>
        ) : validToken ? (
          // Valid token: show sign-in form
          <>
            <div>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Welcome to AppSprint!
              </h1>
              <p className="mt-3 text-sm text-black/50 leading-relaxed">
                Sign in to access your course. Use the same email you paid with{maskedEmail ? ` (${maskedEmail})` : ""} for the smoothest setup.
              </p>
            </div>

            <ActivateForm callbackUrl={`/activate?token=${token}`} />
          </>
        ) : (
          // Invalid or expired token
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-black">
                Link expired or invalid
              </h1>
              <p className="mt-3 text-sm text-black/50 leading-relaxed">
                This activation link is no longer valid. If you already activated your account, sign in below.
              </p>
            </div>

            <ActivateForm callbackUrl="/learn/classroom" />
          </>
        )}
      </div>
    </div>
  );
}
