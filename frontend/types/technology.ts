export type TechnologyCategory =
  | "Frontend"
  | "Backend"
  | "Mobile"
  | "AI"
  | "DevOps"
  | "Design";

export interface Technology {
  id: string;
  name: string;
  category: TechnologyCategory;
}
