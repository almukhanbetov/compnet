import type { Locale } from "@/types/i18n";
import type { ApiTariff } from "@/types/api/tariffs";

/** Tariff blocks on /pricing, /calculator and the request form. */
const ru = {
  section: {
    eyebrow: "Тарифы",
    title: "Готовые тарифы для малого бизнеса",
    description: "Фиксированный состав и цена. Для сложных проектов — индивидуальный расчёт в калькуляторе.",
    individual: "Нужен индивидуальный расчёт?",
    individualLink: "Открыть калькулятор",
  },
  /** {price} */
  from: "от {price}",
  /** {price} {old} */
  promoPrice: "{price} вместо {old}",
  /** {date} */
  promoUntil: "Акция до {date}",
  /** {price} */
  discount: "скидка {price}",
  order: "Оставить заявку",
  addModules: "Добавить модули",
  calculator: {
    modes: "Способ расчёта",
    tariffs: "Тарифы",
    individual: "Индивидуальный расчёт",
    chooseTariff: "Выберите тариф",
    modules: "Дополнительные модули",
    noModules: "Дополнительные услуги к этому тарифу подбираем на обсуждении.",
    integrations: "Количество интеграций",
    base: "Тариф",
    promo: "Скидка по акции",
    modulesTotal: "Модули",
    total: "Итого",
    fromNote: "Финальная стоимость — по выбранному составу и ТЗ.",
    loading: "Считаем стоимость…",
    failed: "Не удалось рассчитать стоимость. Попробуйте ещё раз или оставьте заявку.",
    order: "Оставить заявку по тарифу",
  },
  form: {
    label: "Тариф",
    none: "Без тарифа — индивидуальный расчёт",
    /** {list} */
    modules: "Модули: {list}",
    editModules: "Изменить модули",
    /** {price} — the server's quote, the amount the request is sent with. */
    total: "Стоимость по тарифу: {price}",
    /** {from} {to} */
    priceChanged: "Стоимость тарифа изменилась: было {from}, теперь {to}. Заявка не отправлена — проверьте новую сумму и подтвердите отправку.",
    confirmSubmit: "Подтвердить новую цену и отправить",
    /** {from} {to} — the project type's base price ("от X") */
    basePriceChanged: "Стоимость изменилась: было {from}, теперь {to}. Заявка не отправлена — проверьте новую сумму и подтвердите отправку.",
  },
  success: {
    /** {title} {price} */
    tariff: "Тариф «{title}»: {price}.",
    promoApplied: "Цена учтена по акции.",
    promoMissed: "Акционные места закончились — указана цена тарифа без скидки.",
  },
};

export type TariffTranslations = typeof ru;

export const tariffTranslations: Record<Locale, TariffTranslations> = {
  ru,
  kk: {
    section: {
      eyebrow: "Тарифтер",
      title: "Шағын бизнеске арналған дайын тарифтер",
      description: "Құрамы мен бағасы тіркелген. Күрделі жобалар үшін — калькулятордағы жеке есептеу.",
      individual: "Жеке есептеу керек пе?",
      individualLink: "Калькуляторды ашу",
    },
    from: "{price} бастап",
    promoPrice: "{old} орнына {price}",
    promoUntil: "Акция {date} дейін",
    discount: "{price} жеңілдік",
    order: "Өтінім қалдыру",
    addModules: "Модульдер қосу",
    calculator: {
      modes: "Есептеу тәсілі",
      tariffs: "Тарифтер",
      individual: "Жеке есептеу",
      chooseTariff: "Тарифті таңдаңыз",
      modules: "Қосымша модульдер",
      noModules: "Бұл тарифке қосымша қызметтерді талқылау кезінде таңдаймыз.",
      integrations: "Интеграциялар саны",
      base: "Тариф",
      promo: "Акция бойынша жеңілдік",
      modulesTotal: "Модульдер",
      total: "Барлығы",
      fromNote: "Түпкілікті құны — таңдалған құрам мен ТТ бойынша.",
      loading: "Құнын есептеп жатырмыз…",
      failed: "Құнын есептеу мүмкін болмады. Қайта көріңіз немесе өтінім қалдырыңыз.",
      order: "Тариф бойынша өтінім қалдыру",
    },
    form: {
      label: "Тариф",
      none: "Тарифсіз — жеке есептеу",
      modules: "Модульдер: {list}",
      editModules: "Модульдерді өзгерту",
      total: "Тариф бойынша құны: {price}",
      priceChanged: "Тариф құны өзгерді: {from} болды, енді {to}. Өтінім жіберілмеді — жаңа соманы тексеріп, жіберуді растаңыз.",
      confirmSubmit: "Жаңа бағаны растап, жіберу",
      basePriceChanged: "Құны өзгерді: {from} болды, енді {to}. Өтінім жіберілмеді — жаңа соманы тексеріп, жіберуді растаңыз.",
    },
    success: {
      tariff: "«{title}» тарифі: {price}.",
      promoApplied: "Баға акция бойынша есептелді.",
      promoMissed: "Акциялық орындар бітті — тарифтің жеңілдіксіз бағасы көрсетілген.",
    },
  },
  en: {
    section: {
      eyebrow: "Tariffs",
      title: "Ready-made tariffs for small businesses",
      description: "A fixed scope and price. For complex projects — an individual estimate in the calculator.",
      individual: "Need an individual estimate?",
      individualLink: "Open the calculator",
    },
    from: "from {price}",
    promoPrice: "{price} instead of {old}",
    promoUntil: "Offer until {date}",
    discount: "{price} off",
    order: "Leave a request",
    addModules: "Add modules",
    calculator: {
      modes: "How to price",
      tariffs: "Tariffs",
      individual: "Individual estimate",
      chooseTariff: "Choose a tariff",
      modules: "Extra modules",
      noModules: "Extra services for this tariff are chosen when we discuss the project.",
      integrations: "Number of integrations",
      base: "Tariff",
      promo: "Promotional discount",
      modulesTotal: "Modules",
      total: "Total",
      fromNote: "The final price follows the chosen scope and the brief.",
      loading: "Calculating…",
      failed: "Could not calculate the price. Try again or leave a request.",
      order: "Leave a request for this tariff",
    },
    form: {
      label: "Tariff",
      none: "No tariff — individual estimate",
      modules: "Modules: {list}",
      editModules: "Change modules",
      total: "Price with this tariff: {price}",
      priceChanged: "The tariff's price has changed: it was {from}, now it is {to}. The request was not sent — check the new amount and confirm sending.",
      confirmSubmit: "Confirm the new price and send",
      basePriceChanged: "The price has changed: it was {from}, now it is {to}. The request was not sent — check the new amount and confirm sending.",
    },
    success: {
      tariff: "“{title}” tariff: {price}.",
      promoApplied: "The promotional price applies.",
      promoMissed: "The promotional places are taken — the tariff's regular price is shown.",
    },
  },
};

/** Texts of the seeded tariffs in other languages; the API's (Russian) text otherwise. */
const tariffContent: Partial<Record<Locale, Record<string, { title: string; description: string; features: string[] }>>> = {
  kk: {
    start: {
      title: "Старт",
      description: "Жылдам іске қосуға арналған дайын үлгідегі бір беттік сайт.",
      features: ["Дайын үлгідегі бір беттік сайт", "Бейімделген дизайн", "WhatsApp батырмасы", "2 түзету кезеңіне дейін", "Қосымша қызметтер бөлек төленеді"],
    },
    business: {
      title: "Бизнес",
      description: "Компанияның шағын сайты: 5 бетке дейін, өтінім формасы және базалық SEO-дайындық.",
      features: ["5 бетке дейін", "Бейімделген дизайн", "Өтінім формасы", "Базалық SEO-дайындық", "Қосымша интеграциялар бөлек төленеді"],
    },
    pro: {
      title: "PRO",
      description: "Жеке дизайны және кеңейтілген функционалы бар сайт.",
      features: ["Жеке дизайн", "Кеңейтілген функционал", "Модульдер мен интеграцияларды қосу", "Түпкілікті құны — таңдалған құрам мен ТТ бойынша"],
    },
  },
  en: {
    start: {
      title: "Start",
      description: "A one-page website on a ready-made template for a quick launch.",
      features: ["One-page website on a ready-made template", "Responsive design", "WhatsApp button", "Up to 2 rounds of revisions", "Extra services are paid separately"],
    },
    business: {
      title: "Business",
      description: "A small company website: up to 5 pages, a request form and basic SEO preparation.",
      features: ["Up to 5 pages", "Responsive design", "Request form", "Basic SEO preparation", "Extra integrations are paid separately"],
    },
    pro: {
      title: "PRO",
      description: "A website with an individual design and advanced features.",
      features: ["Individual design", "Advanced features", "Modules and integrations", "The final price follows the chosen scope and the brief"],
    },
  },
};

/** A tariff's texts in the visitor's language (falls back to the API's). */
export function tariffTexts(tariff: ApiTariff, locale: Locale): { title: string; description: string; features: string[] } {
  const own = tariffContent[locale]?.[tariff.slug];
  // A translation is used only while it matches the stored version's list.
  if (own && own.features.length === tariff.features.length) return own;
  return { title: tariff.title, description: tariff.description, features: tariff.features };
}
