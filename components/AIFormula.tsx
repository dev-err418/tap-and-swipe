"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Equal, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

const aiTools = [
    { name: "Claude Code", logo: "data:image/png;base64,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" },
    { name: "Codex", logo: "data:image/png;base64,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" },
    { name: "Cursor", logo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAaVBMVEUUEgtycW1VVE9DQTz////W1dJQT0o/PTgYFw9oZ2Pc29g7OTP5+flubWnZ2NURDwdcW1YyMCtKSUQtKyUfHRclIx17enbOzcpiYV0LCAC4t7Tq6ujw8O/GxcKYl5OpqKWMi4eEg4CgoJyn51ZeAAAEY0lEQVR4nO2aa9NrMBSFSV4UlaC0aPX2/3/kSai6JHFLonNmrG8dZtZj7b0ThWHs2rVr165du3b938LYwL+0NyInSn9GgHESAwChn/wGAR8cACgAhNFhewScRzFoAKBzwtsiYCO1AWgBCEK6ZTfiBALQByB12KwV8MG3AQtA6rCNvRF17LsAFYLuFDBOIQAiAP0j2S0+F0BvK2DDt4f+DIC+OmDjFDP2HABdI4lTnj0XQEcrYMNh0xcDQEft6kwmn+8uBCA6KUPAObf4UwC0DioQ2MmfC6CmFXAiTn8SgNRBEgHjSNB7MwHISErUQTD5iwBIHdK1/nniTNrPAFh7wzQ2egsB6Egu9xcsfIycWQROshiA+tsz5M8R6YSlVTjYIC7+jmpU+NBZWgQCAILH8U+FrtdoHYBtBxd5hBtC75UJEIT47Enae5ZVhs5aAIKQvW8S/lfLstCdTMpqAADisFiJcKT2FiItKAVAEM7WGn+aPgUwHVkA0o3n6+LLr+0t9KhXIikAghA+FtXheEW1v3VxHRUABMEt54/krbG3vLujJIF6JK15CE36VQARVAVAEMB9Rh3a9KmevkIAmsJjohvr0WuEihgqBSAIZjmv+LVMXzUAGcmXcHW+eX177934KwSgdXhzEfrpVx3Y3q6oBKAjWbD+VzT0R/f2dkktAAkhG6wKw+JT/9LWBkBb4dnZINj0aQecvx2gAYCuCs1GzbX/7IIaAaqN+shPv+rAwNENQEI4e0ePa092wd4Nux4AooB/+SQAewOA0DVdQQDes9sBmgCywBQBtJuAPoCQ2AsBrLOjG8A1TTEAKiDUC/CxFyYQDv+zqgXIAnMUoLML6gAIW3s+ACqZABQChK5pTgG82IcGygDcwJwCQCXnoYUigGxgz0/AZDpAEcAgfQEAKtxYDwBz9XyAy8s0MwZBHoBNnw+AHvTEYPj0TBYg5NvzEvgcCGyFALziiwDuX9ReK0gBDEdvBACV5/ZYECoByMTunASePdi2FVYDCIvPBSAjODxuywGIi89P4MWeUY/kOoBJ+yHAm5dXEMbrAKbSZwG6HdhDsJcDYHuG+wAAPYXIAcyXApxm5N8HQOXIaafF7yxwAhcCXJ7Cs+Cad1c4T/n7jwCg3gR4Amm+7sUVxlEmaCteAoJTM1/iVTbO/bkLEbrzt2u48uob5Wk8itAAIP4IxunS7mdDwKdwTgK8AEKZt5YdhHxkJD8AqGD9M18y/Q5CAiduSNCLOQIT6fQ7BPnBHrslY0YwsLGyy28QIm4r1ACXQQBhpOHbMmxEnBAqgMEIujKTP6b8wI4kBUBl799ifFBY/L7IPABeAt0AFI2eGCHNhgCoaH9ma5f9BQiGM/x7/u1AF27yaSXutoLrfUcwiLf6srPbCq7XbAKh/vQ7CIb/fUhV34i60cYfGOMcVt0YPGgAmeymuwohre5b6fUDlcv+AgKchhtM/ihC7gPb/5l9hYB/ar9r165du3bt2qVC/wBJ72pT/zFQPgAAAABJRU5ErkJggg==" },
    { name: "Antigravity", logo: "data:image/png;base64,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" },
];

const AIFormula = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % aiTools.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="py-16 relative overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="mb-16 text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-[#f1ebe2] sm:text-4xl">
                        The new way to build
                    </h2>
                    <p className="mt-4 text-lg text-[#c9c4bc]">
                        AI writes <span className="text-[#f4cf8f] font-bold">95%</span> of the code. You just provide the vision.
                    </p>
                </div>

                {/* Desktop: Grid layout — each element in its own column */}
                <div className="hidden md:grid grid-cols-5 items-start justify-items-center max-w-3xl mx-auto">
                    {/* Column 1: Idea */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                            <span className="text-4xl">💡</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2] whitespace-nowrap">Your Idea</h3>
                            <p className="text-sm text-[#c9c4bc]">5% Vision</p>
                        </div>
                    </div>

                    {/* Column 2: Plus */}
                    <div className="flex items-center justify-center h-24">
                        <Plus className="h-8 w-8 text-[#f4cf8f]" />
                    </div>

                    {/* Column 3: AI Tool */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,207,143,0.1)] relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeIndex}
                                    src={aiTools[activeIndex].logo}
                                    alt={aiTools[activeIndex].name}
                                    className="h-10 w-10 rounded-lg object-contain"
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </AnimatePresence>
                        </div>
                        <div className="text-center">
                            <AnimatePresence mode="wait">
                                <motion.h3
                                    key={activeIndex}
                                    className="text-xl font-bold text-[#f4cf8f] whitespace-nowrap"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {aiTools[activeIndex].name}
                                </motion.h3>
                            </AnimatePresence>
                            <p className="text-sm text-[#c9c4bc]">95% Execution</p>
                        </div>
                    </div>

                    {/* Column 4: Equal */}
                    <div className="flex items-center justify-center h-24">
                        <Equal className="h-8 w-8 text-[#f4cf8f]" />
                    </div>

                    {/* Column 5: Result */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#f4cf8f] to-[#dcb06e] flex items-center justify-center shadow-lg shadow-[#f4cf8f]/20">
                            <span className="text-4xl">📱</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2] whitespace-nowrap">Shipped App</h3>
                            <p className="text-sm text-[#c9c4bc]">100% Yours</p>
                        </div>
                    </div>
                </div>

                {/* Mobile: Vertical layout */}
                <div className="flex md:hidden flex-col items-center gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                            <span className="text-4xl">💡</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2]">Your Idea</h3>
                            <p className="text-sm text-[#c9c4bc]">5% Vision</p>
                        </div>
                    </div>

                    <Plus className="h-8 w-8 text-[#f4cf8f]" />

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-[#f4cf8f]/10 border border-[#f4cf8f]/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,207,143,0.1)] relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeIndex}
                                    src={aiTools[activeIndex].logo}
                                    alt={aiTools[activeIndex].name}
                                    className="h-10 w-10 rounded-lg object-contain"
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </AnimatePresence>
                        </div>
                        <div className="text-center">
                            <AnimatePresence mode="wait">
                                <motion.h3
                                    key={activeIndex}
                                    className="text-xl font-bold text-[#f4cf8f] whitespace-nowrap"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {aiTools[activeIndex].name}
                                </motion.h3>
                            </AnimatePresence>
                            <p className="text-sm text-[#c9c4bc]">95% Execution</p>
                        </div>
                    </div>

                    <Equal className="h-8 w-8 text-[#f4cf8f]" />

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#f4cf8f] to-[#dcb06e] flex items-center justify-center shadow-lg shadow-[#f4cf8f]/20">
                            <span className="text-4xl">📱</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-[#f1ebe2]">Shipped App</h3>
                            <p className="text-sm text-[#c9c4bc]">100% Yours</p>
                        </div>
                    </div>
                </div>

                {/* Contextual Note */}
                <div className="mt-16 text-center">
                    <div className="inline-block rounded-full bg-white/5 px-6 py-2 text-sm text-[#c9c4bc] border border-white/5">
                        <span className="text-[#f4cf8f]">Note:</span> You don&apos;t need to be a senior engineer. AI handles the heavy lifting.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIFormula;
