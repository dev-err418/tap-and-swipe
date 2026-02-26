import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await prisma.inviteLink.findUnique({
    where: { token },
  });

  if (!invite || invite.usedAt) {
    redirect("/invite/invalid");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2a2725] px-6 selection:bg-[#f4cf8f]/30">
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-white/5 p-10 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#f1ebe2]">
          You&apos;re invited
        </h1>
        <p className="mt-4 text-lg text-[#c9c4bc]">
          Click below to join the App Sprint community and unlock your course access.
        </p>

        <Link
          href={`/api/auth/discord?invite=${token}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f4cf8f] px-8 py-3 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Join with Discord
        </Link>

        <p className="mt-6 text-sm text-[#c9c4bc]/60">
          This invite is single-use and will expire once redeemed.
        </p>
      </div>
    </div>
  );
}
