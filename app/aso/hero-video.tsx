"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

export default function HeroVideo() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);

    function handlePlay() {
        const v = videoRef.current;
        if (!v) return;
        v.play().catch(() => {});
    }

    return (
        <div className="relative">
            <video
                ref={videoRef}
                src="/aso/hero.mp4#t=0.1"
                loop
                playsInline
                controls
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                className="w-full max-w-4xl"
            />
            {!playing && (
                <button
                    onClick={handlePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
                >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f4cf8f] shadow-lg shadow-[#f4cf8f]/30 transition-transform hover:scale-110">
                        <Play className="h-8 w-8 fill-[#2a2725] text-[#2a2725] ml-1" />
                    </div>
                </button>
            )}
        </div>
    );
}
