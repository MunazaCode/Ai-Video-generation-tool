export interface Character {
  id: string;
  projectId: string;
  name: string;
  age: string | null;
  appearance: string;
  clothing: string;
  hairstyle: string;
  skinDescription: string;
  personality: string;
  visualIdentity: string;
  referenceImagePath: string | null;
  negativePrompt: string;
  createdAt: Date;
  updatedAt: Date;
}
