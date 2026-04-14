import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
    return (
        <>
            <div className="min-h-screen bg-background text-foreground font-sans selection:bg-black/10">
                <main className="flex flex-col items-center justify-center px-6 text-center min-h-screen">
                    <p className="text-sm font-medium text-[#FF9500]">404</p>
                    <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-7xl">
                        Page not found
                    </h1>
                    <p className="mx-auto mt-6 max-w-md text-lg text-black/50">
                        This page doesn&apos;t exist. It may have been moved or deleted.
                    </p>
                    <Link
                        href="/"
                        className="group mt-10 flex h-12 items-center gap-2 rounded-full bg-black px-8 text-base font-bold text-white transition-all hover:bg-black/80 hover:ring-4 hover:ring-black/10"
                    >
                        Back to home
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </main>
            </div>
        </>
    );
}
