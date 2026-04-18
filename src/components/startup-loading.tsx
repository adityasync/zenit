"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, Cpu, Globe, Zap } from "lucide-react";

const BOOT_SEQUENCES = [
  { text: "Initializing ZENIT Neural Core...", icon: Cpu },
  { text: "Establishing Secure NSE Tunnel...", icon: Shield },
  { text: "Calibrating Intelligence Hub...", icon: Zap },
  { text: "Fetching Live Market Streams...", icon: Activity },
  { text: "Syncing Global Sentiment...", icon: Globe },
];

export function StartupLoading() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % BOOT_SEQUENCES.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full"
      />

      <div className="relative flex flex-col items-center">
        {/* Logo Container */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative mb-12"
        >
          {/* Logo Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-40px] border border-white/5 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-20px] border border-white/10 rounded-full"
          />

          <div className="relative p-8 bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
            <motion.img
              src="/icons/logo.png"
              alt="ZENIT"
              className="w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
              animate={{
                scale: [0.95, 1, 0.95],
                filter: [
                  "brightness(1) contrast(1)",
                  "brightness(1.3) contrast(1.1)",
                  "brightness(1) contrast(1)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Scanner Line */}
            <motion.div
              animate={{
                top: ["0%", "100%", "0%"],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"
            />
          </div>
        </motion.div>

        {/* Branding */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-black text-white italic tracking-[0.2em] mb-2 drop-shadow-sm"
        >
          ZENIT
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em] mb-12"
        >
          Professional Intelligence
        </motion.p>

        {/* Status Sequence */}
        <div className="h-12 flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 text-zinc-400"
            >
               {React.createElement(BOOT_SEQUENCES[currentStep].icon, { 
                 size: 14, 
                 className: "text-amber-500" 
               })}
               <span className="text-xs font-mono tracking-tight">
                 {BOOT_SEQUENCES[currentStep].text}
               </span>
            </motion.div>
          </AnimatePresence>

          {/* Progress Bar Container */}
          <div className="w-64 h-[2px] bg-zinc-800 rounded-full mt-6 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-12">
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Status</span>
          <span className="text-[10px] text-zinc-400 font-mono">SYSTEM_READY</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Protocol</span>
          <span className="text-[10px] text-zinc-400 font-mono">TLS_1.3_V4</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">Region</span>
          <span className="text-[10px] text-zinc-400 font-mono">IN_NORTH_1</span>
        </div>
      </div>
    </motion.div>
  );
}
