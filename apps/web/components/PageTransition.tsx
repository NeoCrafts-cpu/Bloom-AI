"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const variants = {
  initial: { opacity: 0, y: 16 },
  enter:   { opacity: 1, y: 0,  transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
