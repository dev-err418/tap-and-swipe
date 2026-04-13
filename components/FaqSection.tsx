"use client";

import { useState } from "react";

const FAQ_ITEMS = [
    {
        question: "Is this program for me?",
        answer: "This is for you if you dream of building your own app but have no idea where to start. If you want to become financially independent through your own ideas, you're ready to learn even the boring stuff, and you want to build something real instead of just dreaming.",
    },
    {
        question: "Who should NOT join?",
        answer: "If you expect AI to do all the work while you sit back and watch, this isn't for you. Same if you're not willing to do the parts that aren't fun, if freedom and flexibility aren't priorities for you, or if you expect magic results without putting in the work.",
    },
    {
        question: "Do I need to know how to code?",
        answer: "If you already know how to code, you'll move faster. If you use AI tools like Cursor or Claude Code, that works great too. You don't need to be an expert, but you need to be willing to get your hands dirty and learn as you go.",
    },
    {
        question: "What do I need to start?",
        answer: "A code editor (IDE), an AI coding tool, an Apple Developer account, and ideally a Mac (it makes everything easier). If you want to earn money from your app, you'll also need a business structure depending on your country.",
    },
    {
        question: "How long before my app is live?",
        answer: "It depends on you. Some people speed run it in a few weeks, others take their time over a few months. The roadmap is there, the community is there, you set the pace.",
    },
];

function FaqItem({
    question,
    answer,
    isOpen,
    onToggle,
}: {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="border-b border-black/10">
            <button
                onClick={onToggle}
                className="flex w-full items-center justify-between py-5 text-left cursor-pointer"
            >
                <span className="text-base font-medium text-black sm:text-lg">
                    {question}
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`ml-4 h-5 w-5 shrink-0 text-black/40 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                >
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
            </button>
            <div
                className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
                <div className="overflow-hidden">
                    <p className="pb-5 text-sm leading-relaxed text-black/50 sm:text-base">
                        {answer}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" data-fast-scroll="scroll_to_faq" className="bg-white py-24 border-t border-black/10">
            <div className="mx-auto max-w-3xl px-6">
                <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl text-center">
                    Frequently asked questions
                </h2>
                <div className="mt-12">
                    {FAQ_ITEMS.map((item, index) => (
                        <FaqItem
                            key={index}
                            question={item.question}
                            answer={item.answer}
                            isOpen={openIndex === index}
                            onToggle={() =>
                                setOpenIndex(openIndex === index ? null : index)
                            }
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
