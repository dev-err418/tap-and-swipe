"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const STEPS = [
  "Analyzing your answers",
  "Classifying the right path",
  "Preparing your next step",
];

const STEP_DELAY = 1000; // ms between each step
const DONE_DELAY = 600; // ms after last step before navigating

export default function WaitingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i < STEPS.length; i++) {
      timers.push(setTimeout(() => setCurrentStep(i), STEP_DELAY * i));
    }

    timers.push(
      setTimeout(() => setDone(true), STEP_DELAY * STEPS.length),
    );

    timers.push(
      setTimeout(() => onComplete(), STEP_DELAY * STEPS.length + DONE_DELAY),
    );

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center text-center max-w-sm mx-auto">
      {/* Spinner */}
      <div className="relative h-16 w-16 mb-10">
        <svg className="h-16 w-16" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgba(244,207,143,0.15)"
            strokeWidth="4"
          />
          {!done && (
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#f4cf8f"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="176"
              strokeDashoffset="132"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "center" }}
            />
          )}
        </svg>
        {done && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-14 w-14 rounded-full bg-[#f4cf8f]/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-[#f4cf8f]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3 w-full">
        {STEPS.map((label, i) => {
          const isCompleted = i < currentStep || done;
          const isActive = i === currentStep && !done;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: i <= currentStep ? 1 : 0.3,
                y: i <= currentStep ? 0 : 8,
              }}
              transition={{ duration: 0.3, delay: i === 0 ? 0 : 0.05 }}
              className="flex items-center gap-3 text-left"
            >
              <div className="h-6 w-6 shrink-0 flex items-center justify-center">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    <Check className="h-4 w-4 text-[#f4cf8f]" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    className="h-2 w-2 rounded-full bg-[#f4cf8f]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                )}
              </div>
              <span
                className={`text-base transition-colors duration-300 ${
                  isCompleted
                    ? "text-[#f4cf8f]"
                    : isActive
                      ? "text-[#f1ebe2]"
                      : "text-[#c9c4bc]/40"
                }`}
              >
                {label}
                {isActive && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    ...
                  </motion.span>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
