export type ProjectTypeIcon =
  | "Globe"
  | "AppWindow"
  | "Smartphone"
  | "Bot"
  | "Server"
  | "Settings2";

export interface ProjectType {
  id: string;
  title: string;
  description: string;
  icon: ProjectTypeIcon;
}
