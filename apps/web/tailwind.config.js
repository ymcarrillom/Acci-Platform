/** @type {import('tailwindcss').Config} */

/**
 * ACCI Platform — Tailwind Configuration
 * Sistema de Diseño Dual Light / Dark
 *
 * Tokens semánticos que referencian CSS custom properties definidas en globals.css.
 * Los valores cambian automáticamente al alternar .dark en <html>.
 */
module.exports = {
  darkMode: ["class"],

  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/pages/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      /* ── Colores Semánticos Adaptativos ────────────────────
         Uso: bg-bg-surface, text-fg-primary, border-line, etc.
         Se adaptan automáticamente a Light / Dark.
         ─────────────────────────────────────────────────── */
      colors: {
        /* Backgrounds */
        bg: {
          base:     "var(--bg-base)",
          surface:  "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          input:    "var(--bg-input)",
          overlay:  "var(--bg-overlay)",
        },

        /* Foreground / Text */
        fg: {
          primary:   "var(--fg-primary)",
          secondary: "var(--fg-secondary)",
          tertiary:  "var(--fg-tertiary)",
          muted:     "var(--fg-muted)",
          inverse:   "var(--fg-inverse)",
        },

        /* Bordes */
        line: {
          DEFAULT: "var(--line)",
          subtle:  "var(--line-subtle)",
          strong:  "var(--line-strong)",
        },

        /* ── Paleta de Marca ─────────────────────────────── */
        brand: {
          50:      "#EFF6FF",
          100:     "#DBEAFE",
          200:     "#BFDBFE",
          300:     "#93C5FD",
          400:     "#60A5FA",
          500:     "#3B82F6",
          600:     "#2563EB",
          700:     "#1D4ED8",
          800:     "#1E40AF",
          900:     "#1E3A8A",
          DEFAULT: "var(--primary)",
          hover:   "var(--primary-hover)",
          muted:   "var(--primary-muted)",
          ring:    "var(--primary-ring)",
        },

        sky: {
          brand: {
            300: "#7DD3FC",
            400: "#38BDF8",
            500: "#0EA5E9",
            600: "#0284C7",
          },
        },

        /* Oro Sagrado — identidad cristiana */
        sacred: {
          200:     "#FDE68A",
          300:     "#FCD34D",
          400:     "#FBBF24",
          500:     "#F59E0B",
          600:     "#D97706",
          700:     "#B45309",
          DEFAULT: "var(--accent)",
          light:   "var(--accent-light)",
          ring:    "var(--accent-ring)",
        },

        /* ── Roles ───────────────────────────────────────── */
        role: {
          admin: {
            DEFAULT: "var(--role-admin)",
            bg:      "var(--role-admin-bg)",
            border:  "var(--role-admin-border)",
            text:    "var(--role-admin-text)",
            glow:    "var(--role-admin-glow)",
          },
          teacher: {
            DEFAULT: "var(--role-teacher)",
            bg:      "var(--role-teacher-bg)",
            border:  "var(--role-teacher-border)",
            text:    "var(--role-teacher-text)",
            glow:    "var(--role-teacher-glow)",
          },
          student: {
            DEFAULT: "var(--role-student)",
            bg:      "var(--role-student-bg)",
            border:  "var(--role-student-border)",
            text:    "var(--role-student-text)",
            glow:    "var(--role-student-glow)",
          },
        },

        /* ── Estados ─────────────────────────────────────── */
        status: {
          success: {
            DEFAULT: "var(--success)",
            bg:      "var(--success-bg)",
            border:  "var(--success-border)",
            text:    "var(--success-text)",
          },
          error: {
            DEFAULT: "var(--error)",
            bg:      "var(--error-bg)",
            border:  "var(--error-border)",
            text:    "var(--error-text)",
          },
          warning: {
            DEFAULT: "var(--warning)",
            bg:      "var(--warning-bg)",
            border:  "var(--warning-border)",
            text:    "var(--warning-text)",
          },
          info: {
            DEFAULT: "var(--info)",
            bg:      "var(--info-bg)",
            border:  "var(--info-border)",
            text:    "var(--info-text)",
          },
        },

        /* ── Glass ───────────────────────────────────────── */
        glass: {
          bg:     "var(--glass-bg)",
          border: "var(--glass-border)",
          inner:  "var(--glass-inner)",
        },
      },

      /* ── Sombras ───────────────────────────────────────── */
      boxShadow: {
        xs:              "var(--shadow-xs)",
        sm:              "var(--shadow-sm)",
        md:              "var(--shadow-md)",
        lg:              "var(--shadow-lg)",
        xl:              "var(--shadow-xl)",
        card:            "var(--shadow-card)",
        elevated:        "var(--shadow-elevated)",
        "3xl":           "var(--shadow-xl)",
        "ring-primary":  "var(--shadow-ring-primary)",
        "ring-sky":      "var(--shadow-ring-sky)",
        "glow-admin":    "var(--shadow-glow-admin)",
        "glow-teacher":  "var(--shadow-glow-teacher)",
        "glow-student":  "var(--shadow-glow-student)",
      },

      /* ── Border Radius ─────────────────────────────────── */
      borderRadius: {
        card:  "var(--radius-card)",
        panel: "var(--radius-panel)",
        btn:   "var(--radius-btn)",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      /* ── Backdrop Blur ─────────────────────────────────── */
      backdropBlur: {
        xs:  "4px",
        sm:  "8px",
        md:  "12px",
        lg:  "16px",
        xl:  "24px",
        "2xl": "32px",
      },

      /* ── Tipografía ────────────────────────────────────── */
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      letterSpacing: {
        badge:  "0.06em",
        widest: "0.15em",
      },

      /* ── Animaciones ───────────────────────────────────── */
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast:   "150ms",
        normal: "250ms",
        slow:   "400ms",
      },
      keyframes: {
        "acci-fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "acci-scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "acci-slide-up": {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "acci-pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.65" },
        },
        "acci-pulse-urgent": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.40" },
        },
        "acci-glow-pulse": {
          "0%, 100%": { filter: "brightness(1)" },
          "50%":      { filter: "brightness(1.15)" },
        },
        "acci-spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in":      "acci-fade-in  250ms cubic-bezier(0.4,0,0.2,1) both",
        "scale-in":     "acci-scale-in 250ms cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up":     "acci-slide-up 300ms cubic-bezier(0.4,0,0.2,1) both",
        "pulse-soft":   "acci-pulse-soft   1.8s ease-in-out infinite",
        "pulse-urgent": "acci-pulse-urgent 0.9s ease-in-out infinite",
        "glow-pulse":   "acci-glow-pulse   2.5s ease-in-out infinite",
        "spin-slow":    "acci-spin-slow    3s linear infinite",
      },

      /* ── Gradientes ────────────────────────────────────── */
      backgroundImage: {
        /* Botón primario */
        "btn-primary":   "linear-gradient(135deg, #38BDF8 0%, #2563EB 100%)",
        /* Barras de acento por rol */
        "bar-primary":   "linear-gradient(to right, #38BDF8, #2563EB)",
        "bar-admin":     "linear-gradient(to right, #3B82F6, #6366F1)",
        "bar-teacher":   "linear-gradient(to right, #0EA5E9, #3B82F6)",
        "bar-student":   "linear-gradient(to right, #10B981, #059669)",
        "bar-sacred":    "linear-gradient(to right, #F59E0B, #D97706)",
        "bar-spiritual": "linear-gradient(to right, #F59E0B, #D97706, #B45309)",
        /* Glows por rol */
        "glow-admin":    "radial-gradient(ellipse at top left, rgba(56,189,248,0.20) 0%, rgba(37,99,235,0.15) 50%, transparent 70%)",
        "glow-teacher":  "radial-gradient(ellipse at top left, rgba(99,102,241,0.20) 0%, rgba(56,189,248,0.10) 50%, transparent 70%)",
        "glow-student":  "radial-gradient(ellipse at top left, rgba(16,185,129,0.22) 0%, rgba(14,165,233,0.10) 50%, transparent 70%)",
        /* Overlay interno de card */
        "card-inner-light": "linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, transparent 55%, rgba(15,23,42,0.04) 100%)",
        "card-inner-dark":  "linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 50%, rgba(0,0,0,0.35) 100%)",
        /* Progress */
        "progress-brand":   "linear-gradient(to right, #38BDF8, #2563EB)",
        "progress-success": "linear-gradient(to right, #34D399, #059669)",
        "progress-warning": "linear-gradient(to right, #FBBF24, #D97706)",
        "progress-error":   "linear-gradient(to right, #F87171, #DC2626)",
      },
    },
  },

  plugins: [],
};
