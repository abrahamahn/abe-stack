// src/apps/server/src/http/swagger-theme.ts
/**
 * Custom CSS theme for Swagger UI that matches the ABE Stack design system.
 *
 * Injected via @fastify/swagger-ui's `theme.css` option — no extra packages required.
 *
 * All values are sourced from the design tokens in:
 * - `src/client/ui/src/theme/colors.ts`  (light/dark color palettes)
 * - `src/client/ui/src/theme/radius.ts`  (border radii)
 * - `src/client/ui/src/theme/typography.ts` (font family, sizes, weights)
 * - `src/client/ui/src/theme/spacing.ts`  (gap scale)
 * - `src/client/ui/src/styles/elements.css` (button, input styles)
 */

export const swaggerThemeCss = `
/* ================================================================
   ABE Stack — Swagger UI Theme
   Matches the Chrome-inspired design system token-for-token.
   ================================================================ */

/* ----------------------------------------------------------------
   1. Base / Typography
   ---------------------------------------------------------------- */
body {
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.swagger-ui,
.swagger-ui .opblock-tag,
.swagger-ui .opblock .opblock-summary-description,
.swagger-ui .opblock .opblock-section-header h4,
.swagger-ui table thead tr th,
.swagger-ui .model-title,
.swagger-ui .model,
.swagger-ui .info .title,
.swagger-ui .info p,
.swagger-ui .info li,
.swagger-ui .info table,
.swagger-ui .btn,
.swagger-ui .dialog-ux .modal-ux-header h3 {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji';
}

.swagger-ui {
  font-size: 0.875rem;
  color: #202124;
}

.swagger-ui .info .title {
  color: #202124;
  font-weight: 700;
}

.swagger-ui .info p,
.swagger-ui .info li,
.swagger-ui .info table {
  color: #5f6368;
  font-size: 0.875rem;
}

.swagger-ui p {
  color: #5f6368;
}

/* ----------------------------------------------------------------
   2. Topbar — neutral surface (matches app header, not flashy)
   ---------------------------------------------------------------- */
.swagger-ui .topbar {
  background-color: #f1f3f4;
  border-bottom: 1px solid #dadce0;
  padding: 0.5rem 0;
}

.swagger-ui .topbar .download-url-wrapper .select-label {
  color: #202124;
}

.swagger-ui .topbar .download-url-wrapper .select-label select {
  border-color: #dadce0;
  color: #202124;
}

.swagger-ui .topbar .download-url-wrapper input[type="text"] {
  border-color: #dadce0;
  color: #202124;
}

.swagger-ui .topbar a {
  color: #202124;
}

/* Hide default Swagger logo */
.swagger-ui .topbar .topbar-wrapper .link svg {
  visibility: hidden;
}

/* ----------------------------------------------------------------
   3. Layout & background
   ---------------------------------------------------------------- */
.swagger-ui .wrapper {
  max-width: 1200px;
}

.swagger-ui .scheme-container {
  background: #f1f3f4;
  border-bottom: 1px solid #dadce0;
  box-shadow: none;
}

/* ----------------------------------------------------------------
   4. Links
   ---------------------------------------------------------------- */
.swagger-ui a.nostyle {
  color: #1a73e8;
}

.swagger-ui .opblock-tag a {
  color: #202124;
}

.swagger-ui .opblock-tag a:hover {
  color: #1a73e8;
}

.swagger-ui .info a {
  color: #1a73e8;
}

/* ----------------------------------------------------------------
   5. HTTP method badges (opblocks)
   border-radius: 0.625rem matches --ui-radius-md (10px)
   ---------------------------------------------------------------- */

/* Shared opblock styles */
.swagger-ui .opblock {
  border-radius: 0.625rem;
  box-shadow: none;
  margin-bottom: 0.5rem;
}

.swagger-ui .opblock .opblock-summary-method {
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 4.5rem;
  text-align: center;
  padding: 0.375rem 0;
}

.swagger-ui .opblock .opblock-summary-description {
  color: #5f6368;
  font-size: 0.875rem;
}

.swagger-ui .opblock .opblock-section-header {
  background: #f1f3f4;
  border-bottom: 1px solid #dadce0;
  box-shadow: none;
}

.swagger-ui .opblock .opblock-section-header h4 {
  color: #202124;
  font-size: 0.875rem;
}

/* GET — primary blue */
.swagger-ui .opblock.opblock-get {
  background: rgba(26, 115, 232, 0.04);
  border-color: #aecbfa;
}
.swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: #1a73e8;
}
.swagger-ui .opblock.opblock-get .opblock-summary {
  border-color: #aecbfa;
}

/* POST — success green */
.swagger-ui .opblock.opblock-post {
  background: rgba(24, 128, 56, 0.04);
  border-color: #a8dab5;
}
.swagger-ui .opblock.opblock-post .opblock-summary-method {
  background: #188038;
}
.swagger-ui .opblock.opblock-post .opblock-summary {
  border-color: #a8dab5;
}

/* PUT — warning orange */
.swagger-ui .opblock.opblock-put {
  background: rgba(249, 171, 0, 0.04);
  border-color: #fdd663;
}
.swagger-ui .opblock.opblock-put .opblock-summary-method {
  background: #e37400;
}
.swagger-ui .opblock.opblock-put .opblock-summary {
  border-color: #fdd663;
}

/* DELETE — danger red */
.swagger-ui .opblock.opblock-delete {
  background: rgba(217, 48, 37, 0.04);
  border-color: #f5b7b1;
}
.swagger-ui .opblock.opblock-delete .opblock-summary-method {
  background: #d93025;
}
.swagger-ui .opblock.opblock-delete .opblock-summary {
  border-color: #f5b7b1;
}

/* PATCH — teal */
.swagger-ui .opblock.opblock-patch {
  background: rgba(0, 137, 123, 0.04);
  border-color: #80cbc4;
}
.swagger-ui .opblock.opblock-patch .opblock-summary-method {
  background: #00897b;
}
.swagger-ui .opblock.opblock-patch .opblock-summary {
  border-color: #80cbc4;
}

/* ----------------------------------------------------------------
   6. Tag sections
   ---------------------------------------------------------------- */
.swagger-ui .opblock-tag {
  border-bottom: 1px solid #dadce0;
  font-size: 1.125rem;
  font-weight: 500;
  padding: 0.75rem 0;
  color: #202124;
}

/* ----------------------------------------------------------------
   7. Buttons — matches .btn / .btn-primary / .btn-secondary
   border-radius: 0.625rem = --ui-radius-md
   ---------------------------------------------------------------- */
.swagger-ui .btn {
  border-radius: 0.625rem;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-weight: 500;
  font-size: 0.875rem;
  box-shadow: none;
  transition: background-color 0.12s, border-color 0.12s;
  cursor: pointer;
}

/* Authorize — outlined primary (like .btn-secondary with primary color) */
.swagger-ui .btn.authorize {
  background-color: transparent;
  border-color: #1a73e8;
  color: #1a73e8;
  border-radius: 0.625rem;
}
.swagger-ui .btn.authorize:hover {
  background-color: rgba(26, 115, 232, 0.08);
}
.swagger-ui .btn.authorize svg {
  fill: #1a73e8;
}

/* Execute — primary filled (like .btn-primary) */
.swagger-ui .btn.execute {
  background-color: #1a73e8;
  border-color: #1a73e8;
  color: #e8eaed;
  border-radius: 0.625rem;
}
.swagger-ui .btn.execute:hover {
  background-color: #1557b0;
  border-color: #1557b0;
}

/* Cancel — secondary (like .btn-secondary) */
.swagger-ui .btn.cancel {
  background-color: #f1f3f4;
  border-color: #dadce0;
  color: #5f6368;
  border-radius: 0.625rem;
}
.swagger-ui .btn.cancel:hover {
  background-color: #e8eaed;
}

/* Try it out — outlined primary */
.swagger-ui .try-out__btn {
  border-color: #1a73e8;
  color: #1a73e8;
  border-radius: 0.625rem;
}
.swagger-ui .try-out__btn:hover {
  background-color: rgba(26, 115, 232, 0.08);
}

/* ----------------------------------------------------------------
   8. Inputs — matches app Input styles
   ---------------------------------------------------------------- */
.swagger-ui input[type="text"],
.swagger-ui input[type="password"],
.swagger-ui input[type="search"],
.swagger-ui input[type="email"],
.swagger-ui input[type="file"],
.swagger-ui textarea,
.swagger-ui select {
  border: 1px solid #dadce0;
  border-radius: 0.625rem;
  padding: 0.5rem 0.75rem;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.875rem;
  color: #202124;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.swagger-ui input[type="text"]:focus,
.swagger-ui input[type="password"]:focus,
.swagger-ui input[type="search"]:focus,
.swagger-ui input[type="email"]:focus,
.swagger-ui textarea:focus,
.swagger-ui select:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.4);
  outline: none;
}

/* ----------------------------------------------------------------
   9. Code blocks & models
   ---------------------------------------------------------------- */
.swagger-ui .highlight-code,
.swagger-ui .example pre,
.swagger-ui .model-box {
  background: #f1f3f4;
  border: 1px solid #dadce0;
  border-radius: 0.625rem;
}

.swagger-ui .model-toggle::after {
  color: #5f6368;
}

.swagger-ui .model {
  color: #202124;
  font-size: 0.875rem;
}

.swagger-ui .model .property {
  color: #1a73e8;
}

/* ----------------------------------------------------------------
   10. Response section
   ---------------------------------------------------------------- */
.swagger-ui .responses-inner h4,
.swagger-ui .responses-inner h5 {
  color: #202124;
  font-size: 0.875rem;
}

.swagger-ui .response-col_status {
  color: #202124;
  font-weight: 700;
}

.swagger-ui table thead tr th {
  color: #202124;
  border-bottom: 2px solid #dadce0;
  font-size: 0.875rem;
}

.swagger-ui table thead tr td {
  color: #5f6368;
}

/* ----------------------------------------------------------------
   11. Info section
   ---------------------------------------------------------------- */
.swagger-ui .info {
  margin: 1.5rem 0;
}

.swagger-ui .info .title small.version-stamp {
  background-color: #1a73e8;
  border-radius: 999px;
  padding: 0.125rem 0.625rem;
  font-size: 0.75rem;
}

/* ----------------------------------------------------------------
   12. Server select
   ---------------------------------------------------------------- */
.swagger-ui .servers > label select {
  border: 1px solid #dadce0;
  border-radius: 0.625rem;
  color: #202124;
  font-size: 0.875rem;
}

/* ----------------------------------------------------------------
   13. Authorization modal — matches Dialog component
   ---------------------------------------------------------------- */
.swagger-ui .dialog-ux .modal-ux {
  border: 1px solid #dadce0;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.15), 0 1px 2px rgba(60, 64, 67, 0.1);
}

.swagger-ui .dialog-ux .modal-ux-header {
  border-bottom: 1px solid #dadce0;
}

.swagger-ui .dialog-ux .modal-ux-header h3 {
  color: #202124;
}

.swagger-ui .dialog-ux .modal-ux-content p {
  color: #5f6368;
  font-size: 0.875rem;
}

/* ----------------------------------------------------------------
   14. Loading
   ---------------------------------------------------------------- */
.swagger-ui .loading-container .loading::after {
  color: #1a73e8;
}

/* ================================================================
   DARK MODE — @media (prefers-color-scheme: dark)

   Token source: darkColors in colors.ts
   bg: #202124, surface: #292a2d, border: #3c4043
   text: #e8eaed, textMuted: #9aa0a6
   primary: #8ab4f8, danger: #f28b82, success: #81c995, warning: #fdd663
   ================================================================ */
@media (prefers-color-scheme: dark) {
  /* Base */
  body,
  .swagger-ui {
    background-color: #202124;
    color: #e8eaed;
  }

  /* Topbar — dark surface */
  .swagger-ui .topbar {
    background-color: #292a2d;
    border-bottom-color: #3c4043;
  }
  .swagger-ui .topbar a,
  .swagger-ui .topbar .download-url-wrapper .select-label {
    color: #e8eaed;
  }
  .swagger-ui .topbar .download-url-wrapper .select-label select,
  .swagger-ui .topbar .download-url-wrapper input[type="text"] {
    background-color: #202124;
    border-color: #3c4043;
    color: #e8eaed;
  }

  /* Info */
  .swagger-ui .info .title {
    color: #e8eaed;
  }
  .swagger-ui .info p,
  .swagger-ui .info li,
  .swagger-ui .info table {
    color: #9aa0a6;
  }
  .swagger-ui .info a {
    color: #8ab4f8;
  }
  .swagger-ui .info .title small.version-stamp {
    background-color: #8ab4f8;
    color: #202124;
  }

  /* Text */
  .swagger-ui,
  .swagger-ui .opblock-tag,
  .swagger-ui .opblock .opblock-section-header h4,
  .swagger-ui .responses-inner h4,
  .swagger-ui .responses-inner h5,
  .swagger-ui .response-col_status,
  .swagger-ui .model,
  .swagger-ui table thead tr th {
    color: #e8eaed;
  }

  .swagger-ui p,
  .swagger-ui .opblock .opblock-summary-description,
  .swagger-ui table thead tr td {
    color: #9aa0a6;
  }

  /* Links */
  .swagger-ui a.nostyle,
  .swagger-ui .model .property {
    color: #8ab4f8;
  }
  .swagger-ui .opblock-tag a {
    color: #e8eaed;
  }
  .swagger-ui .opblock-tag a:hover {
    color: #8ab4f8;
  }

  /* Tags */
  .swagger-ui .opblock-tag {
    border-bottom-color: #3c4043;
  }

  /* Scheme container */
  .swagger-ui .scheme-container {
    background: #292a2d;
    border-bottom-color: #3c4043;
  }

  /* GET */
  .swagger-ui .opblock.opblock-get {
    background: rgba(138, 180, 248, 0.06);
    border-color: #5c8bc4;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary {
    border-color: #5c8bc4;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: #8ab4f8;
    color: #202124;
  }

  /* POST */
  .swagger-ui .opblock.opblock-post {
    background: rgba(129, 201, 149, 0.06);
    border-color: #5b9a6e;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary {
    border-color: #5b9a6e;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: #81c995;
    color: #202124;
  }

  /* PUT */
  .swagger-ui .opblock.opblock-put {
    background: rgba(253, 214, 99, 0.06);
    border-color: #c4a84a;
  }
  .swagger-ui .opblock.opblock-put .opblock-summary {
    border-color: #c4a84a;
  }
  .swagger-ui .opblock.opblock-put .opblock-summary-method {
    background: #fdd663;
    color: #202124;
  }

  /* DELETE */
  .swagger-ui .opblock.opblock-delete {
    background: rgba(242, 139, 130, 0.06);
    border-color: #b86c6c;
  }
  .swagger-ui .opblock.opblock-delete .opblock-summary {
    border-color: #b86c6c;
  }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: #f28b82;
    color: #202124;
  }

  /* PATCH */
  .swagger-ui .opblock.opblock-patch {
    background: rgba(77, 182, 172, 0.06);
    border-color: #4db6ac;
  }
  .swagger-ui .opblock.opblock-patch .opblock-summary {
    border-color: #4db6ac;
  }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: #4db6ac;
    color: #202124;
  }

  /* Section headers */
  .swagger-ui .opblock .opblock-section-header {
    background: #292a2d;
    border-bottom-color: #3c4043;
  }

  /* Buttons */
  .swagger-ui .btn.authorize {
    border-color: #8ab4f8;
    color: #8ab4f8;
  }
  .swagger-ui .btn.authorize:hover {
    background-color: rgba(138, 180, 248, 0.1);
  }
  .swagger-ui .btn.authorize svg {
    fill: #8ab4f8;
  }

  .swagger-ui .btn.execute {
    background-color: #8ab4f8;
    border-color: #8ab4f8;
    color: #202124;
  }
  .swagger-ui .btn.execute:hover {
    background-color: #aecbfa;
    border-color: #aecbfa;
  }

  .swagger-ui .btn.cancel {
    background-color: #292a2d;
    border-color: #3c4043;
    color: #9aa0a6;
  }
  .swagger-ui .btn.cancel:hover {
    background-color: #3c4043;
  }

  .swagger-ui .try-out__btn {
    border-color: #8ab4f8;
    color: #8ab4f8;
  }
  .swagger-ui .try-out__btn:hover {
    background-color: rgba(138, 180, 248, 0.1);
  }

  /* Inputs */
  .swagger-ui input[type="text"],
  .swagger-ui input[type="password"],
  .swagger-ui input[type="search"],
  .swagger-ui input[type="email"],
  .swagger-ui input[type="file"],
  .swagger-ui textarea,
  .swagger-ui select {
    background-color: #292a2d;
    border-color: #3c4043;
    color: #e8eaed;
  }

  .swagger-ui input[type="text"]:focus,
  .swagger-ui input[type="password"]:focus,
  .swagger-ui input[type="search"]:focus,
  .swagger-ui input[type="email"]:focus,
  .swagger-ui textarea:focus,
  .swagger-ui select:focus {
    border-color: #8ab4f8;
    box-shadow: 0 0 0 2px rgba(138, 180, 248, 0.4);
  }

  /* Code blocks & models */
  .swagger-ui .highlight-code,
  .swagger-ui .example pre,
  .swagger-ui .model-box {
    background: #292a2d;
    border-color: #3c4043;
  }

  .swagger-ui .model-toggle::after {
    color: #9aa0a6;
  }

  /* Response table */
  .swagger-ui table thead tr th {
    border-bottom-color: #3c4043;
  }

  /* Modal */
  .swagger-ui .dialog-ux .modal-ux {
    background: #292a2d;
    border-color: #3c4043;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.25);
  }
  .swagger-ui .dialog-ux .modal-ux-header {
    border-bottom-color: #3c4043;
  }
  .swagger-ui .dialog-ux .modal-ux-header h3 {
    color: #e8eaed;
  }
  .swagger-ui .dialog-ux .modal-ux-content p {
    color: #9aa0a6;
  }

  /* Server select */
  .swagger-ui .servers > label select {
    background-color: #292a2d;
    border-color: #3c4043;
    color: #e8eaed;
  }

  /* Loading */
  .swagger-ui .loading-container .loading::after {
    color: #8ab4f8;
  }
}
`;
