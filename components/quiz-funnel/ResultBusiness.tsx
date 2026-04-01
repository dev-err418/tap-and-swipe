"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function ResultBusiness() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto max-w-2xl text-center">
        <motion.div {...fadeInUp}>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl">
            This offer is not for your current stage
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#c9c4bc]">
            I only take these calls for founders or small teams already operating a real B2C app business.
            If you are a developer, freelancer, or still exploring, this is not the right funnel.
            The better next step is the community path.
          </p>
          <a
            href="/app-sprint-community"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20"
          >
            Go to App Sprint Community
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
