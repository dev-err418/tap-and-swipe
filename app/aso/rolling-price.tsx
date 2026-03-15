"use client";

import { motion, AnimatePresence } from "framer-motion";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function RollingDigit({ digit, delay }: { digit: number; delay: number }) {
    return (
        <span
            className="inline-block overflow-hidden relative"
            style={{ height: "1.2em", width: "0.95ch", verticalAlign: "-0.18em" }}
        >
            <motion.span
                className="flex flex-col absolute left-0 right-0"
                animate={{ y: `-${digit * 1.2}em` }}
                transition={{
                    duration: 0.5,
                    delay,
                    ease: [0.16, 1, 0.3, 1],
                }}
            >
                {DIGITS.map((d) => (
                    <span
                        key={d}
                        className="block text-center"
                        style={{ height: "1.2em", lineHeight: "1.2em" }}
                    >
                        {d}
                    </span>
                ))}
            </motion.span>
        </span>
    );
}

export default function RollingPrice({ value }: { value: string }) {
    const chars = value.split("");

    return (
        <span className="inline-flex">
            <AnimatePresence mode="popLayout" initial={false}>
                {chars.map((char, i) => (
                    <motion.span
                        key={`${i}-${chars.length}`}
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "0.95ch", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-block"
                    >
                        <RollingDigit
                            digit={parseInt(char)}
                            delay={i * 0.06}
                        />
                    </motion.span>
                ))}
            </AnimatePresence>
        </span>
    );
}
