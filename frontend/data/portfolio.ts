import type { PortfolioProject } from "@/types/portfolioProject";

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "case-1",
    slug: "corporate-site-construction",
    title: "Сайт для строительной компании «СтройГрад»",
    category: "Корпоративный сайт",
    description:
      "Многостраничный корпоративный сайт с портфолио объектов и формой заявки на консультацию. Результат: число заявок с сайта выросло в 2 раза за первый квартал.",
    tags: ["Next.js", "Tailwind CSS", "CMS"],
    gradientFrom: "from-violet-600/40",
    gradientTo: "to-blue-600/30",
  },
  {
    id: "case-2",
    slug: "sales-crm",
    title: "CRM для отдела продаж «Альтаир Групп»",
    category: "CRM-система",
    description:
      "Учёт сделок, клиентской базы и воронки продаж с автоматическими напоминаниями менеджерам. Результат: среднее время обработки заявки сократилось с 2 дней до 4 часов.",
    tags: ["React", "Node.js", "PostgreSQL"],
    gradientFrom: "from-blue-600/40",
    gradientTo: "to-cyan-500/30",
  },
  {
    id: "case-3",
    slug: "delivery-mobile-app",
    title: "Приложение сервиса доставки «Шустрик»",
    category: "Мобильное приложение",
    description:
      "Приложение для курьеров и клиентов с отслеживанием доставки в реальном времени. Результат: среднее время подтверждения доставки сократилось на 30%.",
    tags: ["React Native", "Firebase"],
    gradientFrom: "from-cyan-500/40",
    gradientTo: "to-violet-600/30",
  },
  {
    id: "case-4",
    slug: "online-store-payments",
    title: "Интернет-магазин одежды «Wear&Go»",
    category: "Интернет-магазин",
    description:
      "Онлайн-магазин с удобным оформлением покупки, приёмом онлайн-оплаты и личным кабинетом клиента. Результат: конверсия выросла на 18% в первый месяц.",
    tags: ["Next.js", "PostgreSQL", "Docker"],
    gradientFrom: "from-pink-500/30",
    gradientTo: "to-violet-600/30",
  },
  {
    id: "case-5",
    slug: "ai-support-assistant",
    title: "AI-ассистент поддержки «HelpDesk Pro»",
    category: "AI-решение",
    description:
      "Чат-бот на основе языковой модели, отвечающий на частые вопросы клиентов и передающий сложные обращения менеджеру. Результат: нагрузка на линию поддержки снизилась на 40%.",
    tags: ["Python", "OpenAI API"],
    gradientFrom: "from-violet-600/40",
    gradientTo: "to-cyan-500/30",
  },
  {
    id: "case-6",
    slug: "hr-web-system",
    title: "Web-система управления сотрудниками «Орбита»",
    category: "Web-приложение",
    description:
      "Внутренняя платформа для учёта рабочего времени, отпусков и задач с ролевым доступом. Результат: согласование отпуска сократилось с недели до одного дня.",
    tags: ["Next.js", "Node.js", "Docker"],
    gradientFrom: "from-blue-600/40",
    gradientTo: "to-violet-600/30",
  },
];
