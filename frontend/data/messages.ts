import type { AdminContact, ChatMessage } from "@/types/message";

export const adminContact: AdminContact = {
  name: "Айгерим Смагулова",
  role: "Администратор COMPNET",
  avatarInitials: "АС",
  avatarGradientFrom: "from-blue-600",
  avatarGradientTo: "to-violet-500",
  status: "online",
  autoReplies: [
    "Спасибо за сообщение! Уточню детали и вернусь с ответом.",
    "Хорошо, зафиксировала — обсудим это в ближайшее время.",
    "Передам это команде и дам знать, как только будет информация.",
  ],
  noResponseText:
    "Похоже, сейчас никто не может ответить. Оставьте, пожалуйста, ваше имя и номер телефона — с вами обязательно свяжутся.",
};

export const initialMessages: ChatMessage[] = [
  {
    id: "seed-1",
    author: "contact",
    text: "Здравствуйте! Меня зовут Айгерим, я администратор COMPNET. Чем могу помочь?",
    time: "10:02",
  },
];
