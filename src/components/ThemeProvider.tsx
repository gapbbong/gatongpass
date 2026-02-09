'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SchoolConfig, getSchoolConfig, saveSchoolConfig } from '@/lib/schoolConfig';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');

    // Initialize theme from school config
    useEffect(() => {
        const config = getSchoolConfig();
        setThemeState(config.displayMode || 'dark');
    }, []);

    // Apply theme class to document
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        // Update body background for mesh gradient consistency if needed
        if (theme === 'light') {
            document.body.classList.remove('mesh-gradient');
            document.body.style.backgroundColor = '#ffffff';
        } else {
            document.body.classList.add('mesh-gradient');
            document.body.style.backgroundColor = '';
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        const config = getSchoolConfig();
        saveSchoolConfig({ ...config, displayMode: newTheme });

        // Dispatch custom event for cross-tab or cross-component sync if needed
        window.dispatchEvent(new Event('storage'));
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
