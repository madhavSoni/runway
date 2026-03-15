import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';

import Spreadsheet from 'components/Spreadsheet';
import EditableHeader from 'components/EditableHeader';

type Theme = 'dark' | 'light';

const SHORTCUTS = [
  { keys: ['↑', '↓', '←', '→'], label: 'Navigate' },
  { keys: ['Enter'], label: 'Edit' },
  { keys: ['Esc'], label: 'Cancel' },
  { keys: ['Tab'], label: 'Advance' },
  { keys: ['Del'], label: 'Clear' },
];

const chakraDarkTheme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  fonts: {
    body: "'Fira Sans', 'IBM Plex Sans', -apple-system, sans-serif",
    heading: "'Fira Sans', 'IBM Plex Sans', -apple-system, sans-serif",
    mono: "'Fira Code', 'IBM Plex Mono', 'Courier New', monospace",
  },
  styles: { global: { body: { bg: 'transparent', color: 'inherit' } } },
});

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [title, setTitle] = useState('Q4 Forecast');

  // Sync theme to DOM so CSS custom properties take effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ChakraProvider theme={chakraDarkTheme} resetCSS>
      <div className="app-shell">
        <div className="app-content">
          <header className="app-header">
            <div className="app-header-left">
              <div className="app-eyebrow">Runway · Financial Model</div>
              <h1 className="app-title">
                <EditableHeader
                  value={title}
                  placeholder="Untitled"
                  onChange={setTitle}
                  className="app-title-editable"
                />
              </h1>
            </div>
            <div className="app-header-right">
              <nav className="app-shortcuts" aria-label="Keyboard shortcuts">
                {SHORTCUTS.map(({ keys, label }) => (
                  <div key={label} className="shortcut-item">
                    {keys.map((k) => (
                      <kbd key={k} className="kbd">
                        {k}
                      </kbd>
                    ))}
                    <span>{label}</span>
                  </div>
                ))}
              </nav>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span className="theme-toggle-icon">{theme === 'dark' ? '☀' : '☾'}</span>
                <div className="theme-toggle-track">
                  <div className={`theme-toggle-knob ${theme}`} />
                </div>
                <span className="theme-toggle-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          </header>
          <Spreadsheet />
        </div>
      </div>
    </ChakraProvider>
  );
};

export default App;
