"use client";

import { motion } from "motion/react";
import SectionHeading from "@/components/ui/SectionHeading";
import { technologies } from "@/data/technologies";

export default function TechStackSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Технологии"
          title="Стек, на котором мы работаем"
          description="Подбираем инструменты под задачу — от фронтенда и бэкенда до AI и инфраструктуры."
        />

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
              className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-6 py-4 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
            >
              <span className="text-sm font-semibold text-slate-100 light:text-slate-900">
                {tech.name}
              </span>
              <span className="text-xs text-slate-500 light:text-slate-600">{tech.category}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
