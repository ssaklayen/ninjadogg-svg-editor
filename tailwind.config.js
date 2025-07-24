/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    primary: 'rgb(var(--color-bg-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--color-bg-secondary) / <alpha-value>)',
                    tertiary: 'rgb(var(--color-bg-tertiary) / <alpha-value>)',
                    canvas: 'rgb(var(--color-bg-canvas) / <alpha-value>)',
                },
                text: {
                    primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
                    muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
                },
                accent: {
                    primary: 'rgb(var(--color-accent-primary) / <alpha-value>)',
                    'primary-hover': 'rgb(var(--color-accent-primary-hover) / <alpha-value>)',
                    secondary: 'rgb(var(--color-accent-secondary) / <alpha-value>)',
                },
                border: {
                    primary: 'rgb(var(--color-border-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--color-border-secondary) / <alpha-value>)',
                },
                status: {
                    danger: 'rgb(var(--color-status-danger) / <alpha-value>)',
                    'danger-hover': 'rgb(var(--color-status-danger-hover) / <alpha-value>)',
                    warning: 'rgb(var(--color-status-warning) / <alpha-value>)',
                }
            }
        },
    },
    plugins: [],
}