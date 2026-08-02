import type { Step } from "@/types/step";

export const steps: Step[] = [
  {
    id: "step-1",
    number: 1,
    title: "Бриф и анализ",
    description:
      "Обсуждаем цели проекта, аудиторию и требования, фиксируем сроки и объём работ.",
    icon: "Search",
  },
  {
    id: "step-2",
    number: 2,
    title: "Дизайн и прототип",
    description:
      "Прорабатываем UX-логику и визуальный стиль, согласуем макеты перед разработкой.",
    icon: "Palette",
  },
  {
    id: "step-3",
    number: 3,
    title: "Разработка",
    description:
      "Пишем код, настраиваем интеграции и проводим тестирование на каждом этапе.",
    icon: "Code2",
  },
  {
    id: "step-4",
    number: 4,
    title: "Запуск и поддержка",
    description:
      "Выкладываем проект в продакшн и сопровождаем его после запуска.",
    icon: "Rocket",
  },
];
