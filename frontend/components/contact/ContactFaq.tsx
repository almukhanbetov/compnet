"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { contactFaqItems } from "@/data/contactPage";

export default function ContactFaq() {
  const [openId, setOpenId] = useState<string | null>(
    contactFaqItems[0]?.id ?? null,
  );

  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Частые вопросы о заявках"
          description="Если ответа нет здесь — уточните детали в форме выше, поможем разобраться."
        />

        <div className="mt-12 space-y-3">
          {contactFaqItems.map((item) => {
            const isOpen = item.id === openId;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="font-medium text-slate-100 light:text-slate-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="px-6 pb-5 text-sm leading-6 text-slate-400 light:text-slate-600"
                  >
                    {item.answer}
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
