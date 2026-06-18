/// <reference types="vite/client" />
// Ambient module declarations for Vite asset imports

declare module '*.css' {
  const content: void;
  export default content;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// Augment the global WindowEventMap so window.addEventListener('viewchange', ...)
// is correctly typed without requiring a cast.
interface WindowEventMap {
  viewchange: CustomEvent<{ mode: 'professional' | 'vita' }>;
}
