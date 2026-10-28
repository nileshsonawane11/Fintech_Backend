import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export const AccessibilityProvider = ({ children }) => {
  const [textSize, setTextSize] = useState('m'); // 's', 'm', 'l'
  const [letterSpacing, setLetterSpacing] = useState('normal'); // 'tight', 'normal', 'wide', 'wider'

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-size-s', 'text-size-m', 'text-size-l');
    root.classList.add(`text-size-${textSize}`);
  }, [textSize]);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('letter-spacing-tight', 'letter-spacing-normal', 'letter-spacing-wide', 'letter-spacing-wider');
    body.classList.add(`letter-spacing-${letterSpacing}`);
  }, [letterSpacing]);

  const cycleLetterSpacing = (direction) => {
    const levels = ['tight', 'normal', 'wide', 'wider'];
    const currentIndex = levels.indexOf(letterSpacing);
    if (direction === 'increase' && currentIndex < levels.length - 1) {
      setLetterSpacing(levels[currentIndex + 1]);
    } else if (direction === 'decrease' && currentIndex > 0) {
      setLetterSpacing(levels[currentIndex - 1]);
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      textSize,
      setTextSize,
      letterSpacing,
      cycleLetterSpacing
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
