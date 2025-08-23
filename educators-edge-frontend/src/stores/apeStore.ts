// src/stores/apeStore.ts
import { create } from 'zustand';

type TutorStyle = 'socratic' | 'hint_based' | 'direct';

interface ApeState {
    tutorStyle: TutorStyle;
    setTutorStyle: (style: TutorStyle) => void;
}

export const useApeStore = create<ApeState>((set) => ({
    // The default style for the AI tutor
    tutorStyle: 'socratic',
    // A function to change the style
    setTutorStyle: (style) => set({ tutorStyle: style }),
}));