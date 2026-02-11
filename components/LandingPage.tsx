import {
    Lightbulb,
    Palette,
    Code,
    CreditCard,
    TrendingUp,
    ArrowRight,
    Star
} from "lucide-react";

const DiscordIcon = ({ className }: { className?: string }) => (
    <svg
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className={className}
    >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
);

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-sans selection:bg-[#f4cf8f]/30">

            {/* Hero Section */}
            <header className="relative overflow-hidden pt-32 pb-32">
                <div className="mx-auto max-w-7xl px-6 text-center">
                    <a
                        href="https://www.youtube.com/@ArthurBuildsStuff"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-6 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    >
                        <img
                            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
                            alt="ArthurBuildsStuff"
                            className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
                        />
                        <span className="text-sm font-medium text-[#c9c4bc]">By ArthurBuildsStuff</span>
                    </a>
                    <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight leading-[0.9] sm:text-7xl">
                        Build a mobile app in <br />
                        weeks <span className="relative inline-block font-serif text-6xl text-[#f4cf8f] sm:text-8xl">
                            not months
                            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" className="text-[#f4cf8f]/50" />
                            </svg>
                        </span>
                    </h1>
                    <p className="mx-auto mt-8 max-w-2xl text-lg text-[#c9c4bc] sm:text-xl">
                        Stop dreaming and start shipping. The complete guide to validating, designing, building, and scaling your own mobile app business.
                    </p>

                    <div className="mt-10 pt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <a
                            href="/api/auth/discord"
                            className="group flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-semibold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
                        >
                            <DiscordIcon className="h-5 w-5" />
                            Join the Community
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </a>
                    </div>

                    <p className="mt-4 text-sm font-medium text-[#c9c4bc]">
                        Limited spots available (<span className="text-[#f4cf8f]">9 seats left</span>)
                    </p>

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="flex -space-x-3">
                            {[
                                "/jx_op.png",
                                "/luka.png",
                                "/jesse.png",
                                "/hnythng.png",
                                "/raphael.png"
                            ].map((src, i) => (
                                <img
                                    key={i}
                                    className="h-10 w-10 rounded-full border-2 border-[#2a2725] object-cover"
                                    src={src}
                                    alt="User avatar"
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex text-[#f4cf8f]">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                            </div>
                            <p className="text-sm font-medium text-[#c9c4bc]">
                                <span className="font-bold text-[#f1ebe2]">41</span> makers building together
                            </p>
                        </div>
                    </div>


                    <div className="mt-16 flex justify-center">
                        <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-[#f4cf8f]/10 ring-1 ring-white/10">
                            <video
                                src="https://assets.whop.com/uploads-optimized/2026-02-05/10143289-4fe6-4555-b43e-26d66a821835.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="w-full max-w-4xl"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Bento Grid Section */}
            <section id="curriculum" className="bg-[#2a2725] py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">Everything you need to launch</h2>
                        <p className="mt-4 text-lg text-[#c9c4bc]">From just an idea to your first paying customer.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-2">

                        {/* 1. Idea Validation (Large square) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-white/5 p-8 shadow-sm transition-all hover:bg-white/10 hover:shadow-md md:col-span-2 md:row-span-2 border border-white/5">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-[#f4cf8f]/10 blur-3xl"></div>
                            <div className="relative z-10">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4cf8f]/10 text-[#f4cf8f] border border-[#f4cf8f]/20">
                                    <Lightbulb className="h-6 w-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-[#f1ebe2]">Idea Validation</h3>
                                <p className="mt-4 text-[#c9c4bc] leading-relaxed">
                                    Don't waste time building something nobody wants. Learn how to find profitable niches, interview potential users, and pre-sell your app before writing a single line of code.
                                </p>
                                <ul className="mt-8 space-y-3">
                                    {['Market Research Framework', 'The "Mom Test" Approach', 'Landing Page Testing'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm font-medium text-[#f1ebe2]/80">
                                            <div className="h-1.5 w-1.5 rounded-full bg-[#f4cf8f]"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* 2. Design UI & UX (Horizontal rectangle) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-white/5 p-8 shadow-sm transition-all hover:bg-white/10 hover:shadow-md md:col-span-2 border border-white/5">
                            <div className="absolute bottom-0 right-0 -mb-8 -mr-8 h-40 w-40 rounded-full bg-pink-500/10 blur-3xl"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div>
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#f1ebe2]">Design UI & UX</h3>
                                    <p className="mt-2 text-sm text-[#c9c4bc]">Create beautiful, intuitive interfaces that users love.</p>
                                </div>
                                {/* Abstract UI representation */}
                                <div className="flex gap-2">
                                    <div className="h-16 w-12 rounded-lg bg-white/5 border border-white/10 shadow-sm animate-pulse"></div>
                                    <div className="h-16 w-12 rounded-lg bg-pink-500/10 border border-pink-500/20 shadow-sm"></div>
                                    <div className="h-16 w-12 rounded-lg bg-white/5 border border-white/10 shadow-sm"></div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Development Guide (Vertical rectangle) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-black/40 p-8 shadow-sm transition-all hover:shadow-md md:col-span-1 border border-white/5">
                            <div className="relative z-10 text-[#f1ebe2]">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#c9c4bc] border border-white/10">
                                    <Code className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold">Development</h3>
                                <p className="mt-2 text-sm text-[#c9c4bc]">React Native / Expo</p>
                                <div className="mt-8 space-y-2">
                                    <div className="h-2 w-full rounded-full bg-white/10"></div>
                                    <div className="h-2 w-3/4 rounded-full bg-white/10"></div>
                                    <div className="h-2 w-1/2 rounded-full bg-white/5"></div>
                                </div>
                                <div className="mt-6 rounded-lg bg-black/50 border border-white/5 p-3 font-mono text-xs text-green-400">
                                    $ npx create-expo-app
                                </div>
                            </div>
                        </div>

                        {/* 4. Paywall (Small square) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-white/5 p-8 shadow-sm transition-all hover:bg-white/10 hover:shadow-md md:col-span-1 border border-white/5">
                            <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-green-500/10 opacity-50"></div>
                            <div className="relative z-10">
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-[#f1ebe2]">Cashing in</h3>
                                <p className="mt-2 text-sm text-[#c9c4bc]">Stripe & RevenueCat.</p>
                            </div>
                        </div>

                        {/* 5. Marketing & Growth (Small square) */}
                        <div className="group relative overflow-hidden rounded-3xl bg-[#f4cf8f] p-8 shadow-sm transition-all hover:bg-[#eac07e] hover:shadow-md md:col-span-2 border border-[#f4cf8f] text-[#2a2725]">
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2725]/10 text-[#2a2725] border border-[#2a2725]/10">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-xl font-bold">Marketing & Growth</h3>
                                    <p className="mt-2 text-sm text-[#2a2725]/80">Scale to your first 1,000 users.</p>
                                </div>
                                <div className="text-4xl font-bold opacity-20">10x</div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Testimonials Section (Placeholder) */}
            <section id="testimonials" className="bg-[#2a2725] py-24 border-t border-white/5">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">What makers are saying</h2>
                        <p className="mt-4 text-lg text-[#c9c4bc]">Join the community of builders shipping their dreams.</p>
                    </div>
                    <div className="columns-1 gap-6 md:columns-2 lg:columns-3 space-y-6">
                        {[
                            {
                                name: "JX_Op",
                                text: "This is by far the best small community for people wanting to build apps I have been in the community for about 5 days or so I am still in the early stages of building my app but Arthur has helped every step of the way have been on multiple 1on1 calls also there was s a full roadmap to get started and everyone is always building their own thing or helping each other so very like minded couldn’t recommend it enough",
                                time: "10 days after purchase",
                                image: "/jx_op.png"
                            },
                            {
                                name: "Luka",
                                text: "I have been in this community for few days, and overall experience is great. Arthur is very enthusiastic and really helpful, and other members are also nice, willing to help each other improve. I never paid for community before, but this one is definitely worth it. Changing your mind and to pivot is a difficult task to do, and I definitely needed more experienced people to teach me correct approaches. Shortly, this community is awesome, and looking forward to see how it grows.",
                                time: "8 days after purchase",
                                image: "/luka.png"
                            },
                            {
                                name: "jesse",
                                text: "If you’re wanting to build apps this is the clear best community that provides step by step instructions, constant advice and a like minded community.",
                                time: "7 days after purchase",
                                image: "/jesse.png"
                            },
                            {
                                name: "Hnythng",
                                text: "Finally found a community where I can share progress and get feedback or ask questions and get answers from someone that is at another level in the app game, joining this group has been the best investment for my personal app development",
                                time: "9 days after purchase",
                                image: "/hnythng.png"
                            },
                            {
                                name: "Ilya",
                                text: "Found a lot of useful materials and a very supportive community",
                                time: "8 days after purchase",
                                image: "/ilya.png"
                            },
                            {
                                name: "user1a1a586904",
                                text: "Three days in and I already submitted my first app. Arthur’s insane... constant feedback, always jumping on 1:1s, sharing value nonstop. 100% recommend the community, no-code or dev.",
                                time: "3 days after purchase",
                                image: "/user1a1a.png"
                            },
                            {
                                name: "raphael adouane",
                                text: "This Discord guide is complete and covers everything needed to ship your first app. Arthur is super helpful and always there to share his expertise. Highly recommended for aspiring app creators! (The community is also a huge plus for feedback).",
                                time: "10 days after purchase",
                                image: "/raphael.png"
                            }
                        ].map((testimonial, i) => (
                            <div key={i} className="break-inside-avoid rounded-3xl border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:bg-white/10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex text-[#f4cf8f]">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="h-4 w-4 fill-current" />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[#f1ebe2] leading-relaxed text-sm mb-6">"{testimonial.text}"</p>
                                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={testimonial.image}
                                            alt={testimonial.name}
                                            className="h-8 w-8 rounded-full border border-[#f4cf8f]/20 object-cover"
                                        />
                                        <span className="font-medium text-sm text-[#f1ebe2]">{testimonial.name}</span>
                                    </div>
                                    <span className="text-xs text-[#c9c4bc]">{testimonial.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Group Calls Section (Placeholder) */}
            <section id="group-calls" className="bg-[#2a2725] py-24 border-t border-white/5">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">Group Calls</h2>
                        <p className="mt-4 text-lg text-[#c9c4bc]">Weekly live sessions to unblock your progress.</p>
                    </div>
                    {/* Placeholder content */}
                    <div className="flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 text-[#c9c4bc]">
                        Group calls schedule coming soon...
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-[#2a2725] py-8">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
                    <p className="text-sm text-[#c9c4bc]">&copy; {new Date().getFullYear()} Tap & Swipe. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="/tos" className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]">Terms of Service</a>
                        <a href="/privacy" className="text-sm text-[#c9c4bc] hover:text-[#f1ebe2]">Privacy Policy</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
