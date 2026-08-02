export type StepIcon = "Search" | "Palette" | "Code2" | "Rocket";

export interface Step {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: StepIcon;
}
