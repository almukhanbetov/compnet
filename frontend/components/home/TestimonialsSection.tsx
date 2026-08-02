"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Star, Quote, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { testimonials } from "@/data/testimonials";

export default function TestimonialsSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Отзывы"
            title="Клиенты нам доверяют"
            description="Реальные истории команд, которые уже работают с COMPNET."
          />

          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
          >
            Все отзывы
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] sm:w-[340px]"
            >
              <Quote
                className="h-6 w-6 text-violet-400/50"
                aria-hidden="true"
              />

              <p className="mt-4 flex-1 text-sm leading-6 text-slate-300 light:text-slate-700">
                {testimonial.quote}
              </p>

              <div className="mt-5 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className={`h-3.5 w-3.5 ${
                      starIndex < testimonial.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-700 light:text-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-[var(--text-primary)]/10 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/40 to-cyan-400/30 text-sm font-semibold text-slate-100 light:text-slate-900">
                  {testimonial.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-100 light:text-slate-900">
                    {testimonial.name}
                  </span>
                  <span className="block text-xs text-slate-500 light:text-slate-600">
                    {testimonial.role}, {testimonial.company}
                  </span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
