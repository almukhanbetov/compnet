import type { Locale } from "@/types/i18n";

/**
 * Visitor chat widget. Backend validation errors arrive as { field: message }
 * with Russian messages; `fieldErrors` maps the known messages per field and
 * `fieldFallback` covers anything else for that field.
 */
const ru = {
  launcher: {
    /** Visible button text; the accessible names below start with it. */
    label: "Чат с менеджером",
    open: "Чат с менеджером",
    /** {count} unread replies. */
    openUnread: "Чат с менеджером, непрочитанных ответов: {count}",
    close: "Закрыть чат",
  },
  window: {
    title: "Чат с COMPNET",
    /** Neutral subtitle: manager presence is not tracked, so no "online" and no reply-time promise. */
    subtitle: "Напишите нам — менеджер ответит в чате",
    whatsappPrompt: "Удобнее в WhatsApp?",
    whatsapp: "Написать в WhatsApp",
    editContact: "Изменить контакт для связи",
    addContact: "Оставить контакт для связи",
    editContactShort: "Изменить контакт",
    addContactShort: "Оставить контакт",
    offline: "Нет связи с сервером. Переподключаемся…",
    messages: "Сообщения",
    loading: "Загружаем переписку…",
    loadFailed: "Не удалось загрузить переписку.",
    loadRetrying: "Повторяем автоматически.",
    retryNow: "Повторить сейчас",
    emptyTitle: "Здравствуйте! Напишите ваш вопрос.",
    emptyText: "Менеджер ответит здесь. Переписка сохранится в этом браузере — можно закрыть окно и вернуться позже.",
    contactPrompt: "Хотите, чтобы мы ответили, даже если вы уйдёте?",
    consentStart: "Отправляя сообщение, вы соглашаетесь с",
    consentLink: "политикой конфиденциальности",
    consentEnd: ".",
    managerOnline: "Менеджер онлайн",
    reconnecting: "Восстанавливаем соединение…",
    typing: "Менеджер печатает…",
    loadOlder: "Показать более ранние сообщения",
    loadingOlder: "Загружаем…",
    newMessages: "Новые сообщения",
    closedNote: "Менеджер завершил диалог. Если остались вопросы — напишите, и обращение откроется снова.",
  },
  composer: {
    /** {seconds} until sending is allowed again. */
    rateLimited: "Слишком много сообщений подряд. Отправить снова можно через {seconds} с.",
    label: "Текст сообщения",
    placeholder: "Напишите сообщение",
    send: "Отправить сообщение",
    tooLong: " — сообщение слишком длинное",
  },
  bubble: {
    manager: "Менеджер COMPNET",
    sending: "Отправляется…",
    sent: "Отправлено",
    retry: "Повторить",
    discard: "Удалить",
    read: "Прочитано",
  },
  contact: {
    intro: "Оставьте контакт — менеджер сможет ответить, даже если вы закроете страницу. Это необязательно.",
    nameLabel: "Ваше имя",
    namePlaceholder: "Имя (необязательно)",
    contactLabel: "Телефон, email или мессенджер",
    contactPlaceholder: "Телефон, email или @мессенджер",
    contactRequired: "Укажите телефон, email или мессенджер",
    saved: "Контакт сохранён",
    done: "Готово",
    cancel: "Отмена",
    saving: "Сохраняем…",
    save: "Сохранить",
  },
  errors: {
    notSent: "Сообщение не отправлено.",
    network: "Нет соединения с сервером. Сообщение не отправлено.",
    /** {seconds} */
    rateLimited: "Слишком много сообщений подряд. Повторите через {seconds} с.",
    /** {seconds} */
    sessionRateLimited: "Слишком много новых диалогов с этого адреса. Повторите через {seconds} с.",
    sendFailed: "Не удалось отправить сообщение. Попробуйте ещё раз.",
    /** {seconds} */
    contactRateLimited: "Слишком много запросов. Повторите через {seconds} с.",
    contactFailed: "Не удалось сохранить контакт. Попробуйте ещё раз.",
    invalid: "Проверьте введённые данные.",
  },
  fieldErrors: {
    "сообщение не может быть пустым": "Сообщение не может быть пустым.",
    "сообщение длиннее 2000 символов": "Сообщение длиннее 2000 символов.",
    "недопустимые символы": "Текст содержит недопустимые символы.",
    "слишком длинное имя": "Слишком длинное имя.",
    "укажите телефон, email или мессенджер": "Укажите телефон, email или мессенджер.",
    "слишком длинное значение": "Слишком длинное значение.",
  } as Record<string, string>,
  fieldFallback: {
    body: "Проверьте текст сообщения.",
    name: "Проверьте имя.",
    contact: "Проверьте контакт для связи.",
  } as Record<string, string>,
};

export type ChatTranslations = typeof ru;

export const chatTranslations: Record<Locale, ChatTranslations> = {
  ru,

  kk: {
    launcher: {
      label: "Менеджермен чат",
      open: "Менеджермен чат",
      openUnread: "Менеджермен чат, оқылмаған жауаптар: {count}",
      close: "Чатты жабу",
    },
    window: {
      title: "COMPNET-пен чат",
      subtitle: "Бізге жазыңыз — менеджер чатта жауап береді",
      whatsappPrompt: "WhatsApp ыңғайлырақ па?",
      whatsapp: "WhatsApp-қа жазу",
      editContact: "Байланыс деректерін өзгерту",
      addContact: "Байланыс деректерін қалдыру",
      editContactShort: "Байланысты өзгерту",
      addContactShort: "Байланыс қалдыру",
      offline: "Сервермен байланыс жоқ. Қайта қосылудамыз…",
      messages: "Хабарламалар",
      loading: "Хат алмасу жүктелуде…",
      loadFailed: "Хат алмасуды жүктеу мүмкін болмады.",
      loadRetrying: "Автоматты түрде қайталаймыз.",
      retryNow: "Қазір қайталау",
      emptyTitle: "Сәлеметсіз бе! Сұрағыңызды жазыңыз.",
      emptyText: "Менеджер осында жауап береді. Хат алмасу осы браузерде сақталады — терезені жауып, кейін қайта оралуға болады.",
      contactPrompt: "Сайттан кетсеңіз де жауап бергенімізді қалайсыз ба?",
      consentStart: "Хабарлама жіберу арқылы сіз",
      consentLink: "құпиялылық саясатымен",
      consentEnd: " келісесіз.",
      managerOnline: "Менеджер желіде",
      reconnecting: "Байланыс қалпына келтірілуде…",
      typing: "Менеджер жазып жатыр…",
      loadOlder: "Ертерек хабарламаларды көрсету",
      loadingOlder: "Жүктелуде…",
      newMessages: "Жаңа хабарламалар",
      closedNote: "Менеджер диалогты аяқтады. Сұрақтарыңыз қалса — жазыңыз, өтініш қайта ашылады.",
    },
    composer: {
      rateLimited: "Қатарынан тым көп хабарлама. Қайта жіберуге {seconds} с кейін болады.",
      label: "Хабарлама мәтіні",
      placeholder: "Хабарлама жазыңыз",
      send: "Хабарламаны жіберу",
      tooLong: " — хабарлама тым ұзын",
    },
    bubble: {
      manager: "COMPNET менеджері",
      sending: "Жіберілуде…",
      sent: "Жіберілді",
      retry: "Қайталау",
      discard: "Жою",
      read: "Оқылды",
    },
    contact: {
      intro: "Байланыс деректерін қалдырыңыз — бетті жапсаңыз да, менеджер жауап бере алады. Бұл міндетті емес.",
      nameLabel: "Атыңыз",
      namePlaceholder: "Аты (міндетті емес)",
      contactLabel: "Телефон, email немесе мессенджер",
      contactPlaceholder: "Телефон, email немесе @мессенджер",
      contactRequired: "Телефонды, email-ды немесе мессенджерді көрсетіңіз",
      saved: "Байланыс сақталды",
      done: "Дайын",
      cancel: "Болдырмау",
      saving: "Сақталуда…",
      save: "Сақтау",
    },
    errors: {
      notSent: "Хабарлама жіберілмеді.",
      network: "Сервермен байланыс жоқ. Хабарлама жіберілмеді.",
      rateLimited: "Қатарынан тым көп хабарлама. {seconds} с кейін қайталаңыз.",
      sessionRateLimited: "Осы мекенжайдан тым көп жаңа диалог. {seconds} с кейін қайталаңыз.",
      sendFailed: "Хабарламаны жіберу мүмкін болмады. Қайталап көріңіз.",
      contactRateLimited: "Сұраныстар тым көп. {seconds} с кейін қайталаңыз.",
      contactFailed: "Байланысты сақтау мүмкін болмады. Қайталап көріңіз.",
      invalid: "Енгізілген деректерді тексеріңіз.",
    },
    fieldErrors: {
      "сообщение не может быть пустым": "Хабарлама бос болмауы керек.",
      "сообщение длиннее 2000 символов": "Хабарлама 2000 таңбадан ұзын.",
      "недопустимые символы": "Мәтінде рұқсат етілмеген таңбалар бар.",
      "слишком длинное имя": "Аты тым ұзын.",
      "укажите телефон, email или мессенджер": "Телефонды, email-ды немесе мессенджерді көрсетіңіз.",
      "слишком длинное значение": "Мәні тым ұзын.",
    },
    fieldFallback: {
      body: "Хабарлама мәтінін тексеріңіз.",
      name: "Атыңызды тексеріңіз.",
      contact: "Байланыс деректерін тексеріңіз.",
    },
  },

  en: {
    launcher: {
      label: "Chat with a manager",
      open: "Chat with a manager",
      openUnread: "Chat with a manager, unread replies: {count}",
      close: "Close chat",
    },
    window: {
      title: "Chat with COMPNET",
      subtitle: "Write to us — a manager will reply in this chat",
      whatsappPrompt: "Prefer WhatsApp?",
      whatsapp: "Message us on WhatsApp",
      editContact: "Change contact details",
      addContact: "Leave contact details",
      editContactShort: "Change contact",
      addContactShort: "Leave contact",
      offline: "No connection to the server. Reconnecting…",
      messages: "Messages",
      loading: "Loading the conversation…",
      loadFailed: "Couldn't load the conversation.",
      loadRetrying: "Retrying automatically.",
      retryNow: "Retry now",
      emptyTitle: "Hello! Write your question.",
      emptyText: "A manager will reply here. The conversation is saved in this browser — you can close the window and come back later.",
      contactPrompt: "Want us to reply even if you leave?",
      consentStart: "By sending a message, you agree to the",
      consentLink: "privacy policy",
      consentEnd: ".",
      managerOnline: "A manager is online",
      reconnecting: "Reconnecting…",
      typing: "A manager is typing…",
      loadOlder: "Show earlier messages",
      loadingOlder: "Loading…",
      newMessages: "New messages",
      closedNote: "The manager has closed this conversation. If you have more questions, just write and it will reopen.",
    },
    composer: {
      rateLimited: "Too many messages in a row. You can send again in {seconds} s.",
      label: "Message text",
      placeholder: "Write a message",
      send: "Send message",
      tooLong: " — the message is too long",
    },
    bubble: {
      manager: "COMPNET manager",
      sending: "Sending…",
      sent: "Sent",
      retry: "Retry",
      discard: "Delete",
      read: "Read",
    },
    contact: {
      intro: "Leave your contact details so a manager can reply even if you close the page. This is optional.",
      nameLabel: "Your name",
      namePlaceholder: "Name (optional)",
      contactLabel: "Phone, email or messenger",
      contactPlaceholder: "Phone, email or @messenger",
      contactRequired: "Enter a phone number, email or messenger",
      saved: "Contact saved",
      done: "Done",
      cancel: "Cancel",
      saving: "Saving…",
      save: "Save",
    },
    errors: {
      notSent: "Message not sent.",
      network: "No connection to the server. Message not sent.",
      rateLimited: "Too many messages in a row. Try again in {seconds} s.",
      sessionRateLimited: "Too many new conversations from this address. Try again in {seconds} s.",
      sendFailed: "Couldn't send the message. Please try again.",
      contactRateLimited: "Too many requests. Try again in {seconds} s.",
      contactFailed: "Couldn't save the contact. Please try again.",
      invalid: "Please check the data you entered.",
    },
    fieldErrors: {
      "сообщение не может быть пустым": "The message can't be empty.",
      "сообщение длиннее 2000 символов": "The message is longer than 2000 characters.",
      "недопустимые символы": "The text contains invalid characters.",
      "слишком длинное имя": "The name is too long.",
      "укажите телефон, email или мессенджер": "Enter a phone number, email or messenger.",
      "слишком длинное значение": "The value is too long.",
    },
    fieldFallback: {
      body: "Please check the message text.",
      name: "Please check the name.",
      contact: "Please check the contact details.",
    },
  },
};

/** A delivery or save failure, kept as data so it renders in the current language. */
export type ChatFailure =
  | { code: "network" }
  | { code: "rateLimited" | "sessionRateLimited" | "contactRateLimited"; seconds: number }
  | { code: "sendFailed" | "contactFailed" | "invalid" }
  | { code: "field"; field: string; message: string };

/** Localized text for a backend validation message on `field`. */
export function chatFieldError(t: ChatTranslations, field: string, message: string): string {
  const has = (map: Record<string, string>, key: string) => Object.prototype.hasOwnProperty.call(map, key);
  if (has(t.fieldErrors, message)) return t.fieldErrors[message];
  if (has(t.fieldFallback, field)) return t.fieldFallback[field];
  return t.errors.invalid;
}

export function chatFailureText(t: ChatTranslations, failure: ChatFailure | undefined): string {
  if (!failure) return t.errors.notSent;
  switch (failure.code) {
    case "field":
      return chatFieldError(t, failure.field, failure.message);
    case "rateLimited":
    case "sessionRateLimited":
    case "contactRateLimited":
      return t.errors[failure.code].replace("{seconds}", String(failure.seconds));
    default:
      return t.errors[failure.code];
  }
}
