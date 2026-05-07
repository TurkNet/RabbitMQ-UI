/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'selector',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',   // zinc-700
                    800: '#18181b',   // zinc-900 (was slate-800) -> for cards
                    900: '#09090b',   // zinc-950 (was slate-900) -> for main bg
                    950: '#000000',   // black
                },
            },
        },
    },
    plugins: [],
}
