// Strict TypeScript interfaces for Events collection
export interface EventData {
  title: string;
  description?: object; // RichText
  date: string;
  capacity: number;
  organizer?: string | number;
  tenant: string | number;
}

export interface Event extends EventData {
  id: string | number;
  createdAt: string;
  updatedAt: string;
}