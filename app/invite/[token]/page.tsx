import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-[#f1ebe2] sm:text-7xl">
          You&apos;re invited
        </h1>
        <p className="mt-6 text-lg text-[#c9c4bc]">
          Click below to join the App Sprint community and unlock your course access.
        </p>

        <div className="mt-10">
          <Link
            href={`/api/auth/discord?invite=${token}`}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20"
          >
            Join with Discord
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <p className="mt-6 text-sm text-[#c9c4bc]/60">
          This invite is single-use and will expire once redeemed.
        </p>
      </div>
    </div>
  );
}
