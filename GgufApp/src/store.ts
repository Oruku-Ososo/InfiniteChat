import {create} from 'zustand';

interface AppState {
  modelPath: string | null;
  setModelPath: (path: string | null) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  isModelLoaded: boolean;
  setIsModelLoaded: (loaded: boolean) => void;
}

export const useAppStore = create<AppState>(set => ({
  modelPath: null,
  setModelPath: path => set({modelPath: path}),
  systemPrompt: 'You are a helpful AI assistant.',
  setSystemPrompt: prompt => set({systemPrompt: prompt}),
  temperature: 0.7,
  setTemperature: temp => set({temperature: temp}),
  isModelLoaded: false,
  setIsModelLoaded: loaded => set({isModelLoaded: loaded}),
}));
