import { byId } from "@/lib/i18n";
import type { Locale } from "@/types/i18n";

/**
 * How the portfolio projects are released. Only cases whose workflow was
 * checked (.github/workflows/deploy.yml in their GitHub repository, the
 * same on the default branch): they get "GitHub Actions · Docker · VPS"
 * added to their technologies and a short description of the real release
 * process. EDU ZHSO and Parasat Center are left out until their setup is
 * confirmed. No speed, reliability or savings figures.
 */
export const deliveryStack = ["GitHub Actions", "Docker", "VPS"];

export const portfolioDeliveryTitle: Record<Locale, string> = {
  ru: "Как выпускаются обновления",
  kk: "Жаңартулар қалай шығарылады",
  en: "How updates are released",
};

export const portfolioDelivery: Record<string, Record<Locale, string>> = {
  "bastas-stone-catalog": {
    ru: "После изменений в основной ветке GitHub Actions собирает Docker-образы frontend и backend, публикует их в Docker Hub и обновляет сайт на VPS по SSH; при обновлении применяются миграции базы данных.",
    kk: "Негізгі тармақтағы өзгерістерден кейін GitHub Actions frontend пен backend Docker-бейнелерін құрастырып, Docker Hub-қа жариялайды және сайтты VPS-те SSH арқылы жаңартады; жаңарту кезінде дерекқор миграциялары қолданылады.",
    en: "After changes in the main branch, GitHub Actions builds the frontend and backend Docker images, publishes them to Docker Hub and updates the site on the VPS over SSH; database migrations are applied during the update.",
  },
  "avtobirzhasi-car-marketplace": {
    ru: "Pull request и изменения в основной ветке проходят проверки: тесты и сборку backend и frontend, тестовую сборку Docker-образов. Выпуск на VPS запускается только для основной ветки после успешных проверок: образы публикуются в Docker Hub, на сервере применяются миграции базы данных и перезапускаются контейнеры.",
    kk: "Pull request пен негізгі тармақтағы өзгерістер тексерістерден өтеді: backend пен frontend тесттері мен құрастыруы, Docker-бейнелерді сынақтан құрастыру. VPS-ке шығару тек негізгі тармақ үшін, тексерістер сәтті өткеннен кейін іске қосылады: бейнелер Docker Hub-қа жарияланады, серверде дерекқор миграциялары қолданылып, контейнерлер қайта іске қосылады.",
    en: "Pull requests and changes in the main branch go through checks: backend and frontend tests and builds, and a trial build of the Docker images. The release to the VPS runs only for the main branch after the checks pass: the images are published to Docker Hub, database migrations are applied on the server and the containers restart.",
  },
  "mereytoi-event-agency": {
    ru: "После изменений в основной ветке GitHub Actions собирает Docker-образы, публикует их в Docker Hub и обновляет сервис на VPS по SSH.",
    kk: "Негізгі тармақтағы өзгерістерден кейін GitHub Actions Docker-бейнелерді құрастырып, Docker Hub-қа жариялайды және сервисті VPS-те SSH арқылы жаңартады.",
    en: "After changes in the main branch, GitHub Actions builds the Docker images, publishes them to Docker Hub and updates the service on the VPS over SSH.",
  },
  "ddldecor-interior-design": {
    ru: "Выпуск запускается изменениями в основной ветке или вручную: GitHub Actions собирает Docker-образы, публикует их в Docker Hub, а сервер загружает новые образы и перезапускает контейнеры.",
    kk: "Шығару негізгі тармақтағы өзгерістермен немесе қолмен іске қосылады: GitHub Actions Docker-бейнелерді құрастырып, Docker Hub-қа жариялайды, ал сервер жаңа бейнелерді жүктеп, контейнерлерді қайта іске қосады.",
    en: "A release starts on changes in the main branch or manually: GitHub Actions builds the Docker images and publishes them to Docker Hub, and the server pulls the new images and restarts the containers.",
  },
};

/** The release description of a checked case, or undefined. */
export function deliveryText(slug: string, locale: Locale): string | undefined {
  return byId(portfolioDelivery, slug)?.[locale];
}

/** A case's technologies with the delivery stack appended (no duplicates). */
export function withDeliveryStack(slug: string, technologies: string[]): string[] {
  if (!byId(portfolioDelivery, slug)) return technologies;
  const have = new Set(technologies.map((tech) => tech.toLowerCase()));
  return [...technologies, ...deliveryStack.filter((tech) => !have.has(tech.toLowerCase()))];
}
