export default function CalculatorHero() {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
          Калькулятор
        </span>

        <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
          Рассчитайте{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            стоимость проекта
          </span>
        </h1>

        <p className="mt-6 text-lg leading-8 text-slate-400 light:text-slate-600">
          Выберите тип проекта, нужные модули и параметры — получите
          ориентировочный диапазон стоимости и срок в реальном времени.
        </p>
      </div>
    </section>
  );
}
