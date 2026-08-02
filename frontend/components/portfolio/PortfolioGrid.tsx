"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import PortfolioFilters from "@/components/portfolio/PortfolioFilters";
import PortfolioCard from "@/components/portfolio/PortfolioCard";
import { portfolioCaseStudies } from "@/data/portfolioPage";
import type { PortfolioFilterValue } from "@/types/portfolioPage";

export default function PortfolioGrid() {
  const [activeFilter, setActiveFilter] = useState<PortfolioFilterValue>("Все");

  const filteredProjects = useMemo(() => {
    if (activeFilter === "Все") {
      return portfolioCaseStudies;
    }

    return portfolioCaseStudies.filter(
      (project) => project.category === activeFilter,
    );
  }, [activeFilter]);

  return (
    <section className="px-6 py-8 md:py-12">
      <div className="mx-auto max-w-[1440px]">
        <PortfolioFilters active={activeFilter} onChange={setActiveFilter} />

        {filteredProjects.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <PortfolioCard project={project} />
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="mt-14 text-center text-sm text-slate-400 light:text-slate-600">
            В этой категории пока нет кейсов — уточните задачу, и мы предложим
            похожие проекты.
          </p>
        )}
      </div>
    </section>
  );
}
