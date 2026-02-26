export default function InvalidInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#2a2725] px-6 selection:bg-[#f4cf8f]/30">
      <div className="w-full max-w-md rounded-3xl border border-white/5 bg-white/5 p-10 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#f1ebe2]">
          Invite no longer valid
        </h1>
        <p className="mt-4 text-lg text-[#c9c4bc]">
          This invite link has already been used or doesn&apos;t exist. Contact Arthur for a new one.
        </p>
      </div>
    </div>
  );
}
