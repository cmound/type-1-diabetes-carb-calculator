export interface Template {
  id: string;
  name: string;
  items: Array<{
    name: string;
    carbs: number;
  }>;
}