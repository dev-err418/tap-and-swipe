"use client";

import { motion } from "framer-motion";
import { Settings, Server, CreditCard, Rocket } from "lucide-react";

const milestones = [
    {
        day: "Day 1",
        title: "Learn the fundamentals of coding",
        Icon: Settings,
    },
    {
        day: "Day 4",
        title: "Log in users and save in database",
        Icon: Server,
    },
    {
        day: "Day 9",
        title: "Set up subscription payments",
        Icon: CreditCard,
    },
    {
        day: "Day 14",
        title: "Launch your idea!",
        Icon: Rocket,
    },
];

const Roadmap = () => {
    return (
        <section id="roadmap" className="bg-[#2a2725] py-24 border-t border-white/5 overflow-hidden">
            <div className="mx-auto max-w-7xl px-6">
                <div className="relative">
                    {/* Horizontal Line (Desktop) */}
                    <div className="hidden md:block absolute top-[5.5rem] left-0 w-full h-px bg-white/10" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4">
                        {milestones.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="relative flex flex-col items-center text-center"
                            >
                                {/* Icon */}
                                <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm transition-transform hover:scale-110">
                                    <step.Icon className="h-10 w-10 text-[#f4cf8f]" />
                                </div>

                                {/* Dot on line */}
                                <div className="hidden md:block absolute top-[5.2rem] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#2a2725] border-4 border-[#2a2725] z-10">
                                    <div className="w-full h-full rounded-full bg-[#f4cf8f]" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-[#f1ebe2] mb-2 font-serif">{step.day}</h3>
                                <p className="text-[#c9c4bc] text-sm md:max-w-[220px] leading-relaxed">{step.title}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Roadmap;
