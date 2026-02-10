// src/apps/server/src/http/swagger-theme.ts
/**
 * Custom CSS theme for Swagger UI that matches the ABE Stack
 * Chrome-inspired design system. Injected via @fastify/swagger-ui's
 * `theme.css` option — no extra packages required.
 *
 * Color tokens sourced from `src/client/ui/src/theme/colors.ts`.
 */

export const swaggerThemeCss = `
/* ================================================================
   ABE Stack — Swagger UI Theme Override
   Chrome-inspired design system tokens
   ================================================================ */

/* ----------------------------------------------------------------
   1. Typography
   ---------------------------------------------------------------- */
.swagger-ui,
.swagger-ui .opblock-tag,
.swagger-ui .opblock .opblock-summary-description,
.swagger-ui .opblock .opblock-section-header h4,
.swagger-ui table thead tr th,
.swagger-ui .model-title,
.swagger-ui .model {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.swagger-ui .info .title {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #202124;
}

.swagger-ui .info p,
.swagger-ui .info li,
.swagger-ui .info table {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #5f6368;
}

/* ----------------------------------------------------------------
   2. Topbar
   ---------------------------------------------------------------- */
.swagger-ui .topbar {
  background-color: #1a73e8;
  border-bottom: 1px solid #1557b0;
  padding: 8px 0;
}

.swagger-ui .topbar .download-url-wrapper .select-label {
  color: #ffffff;
}

.swagger-ui .topbar .download-url-wrapper .select-label select {
  border-color: rgba(255, 255, 255, 0.3);
}

.swagger-ui .topbar .download-url-wrapper input[type="text"] {
  border-color: rgba(255, 255, 255, 0.3);
}

.swagger-ui .topbar a {
  color: #ffffff;
}

/* Hide default Swagger logo, show text */
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
   4. Text colors
   ---------------------------------------------------------------- */
.swagger-ui,
.swagger-ui .opblock-tag {
  color: #202124;
}

.swagger-ui .opblock .opblock-summary-description {
  color: #5f6368;
}

.swagger-ui p {
  color: #5f6368;
}

/* ----------------------------------------------------------------
   5. Links
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

/* ----------------------------------------------------------------
   6. HTTP method badges (opblocks)
   ---------------------------------------------------------------- */

/* GET — blue */
.swagger-ui .opblock.opblock-get {
  background: rgba(26, 115, 232, 0.05);
  border-color: #aecbfa;
}
.swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: #1a73e8;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  min-width: 70px;
  text-align: center;
}
.swagger-ui .opblock.opblock-get .opblock-summary {
  border-color: #aecbfa;
}

/* POST — green */
.swagger-ui .opblock.opblock-post {
  background: rgba(24, 128, 56, 0.05);
  border-color: #a8dab5;
}
.swagger-ui .opblock.opblock-post .opblock-summary-method {
  background: #188038;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  min-width: 70px;
  text-align: center;
}
.swagger-ui .opblock.opblock-post .opblock-summary {
  border-color: #a8dab5;
}

/* PUT — orange */
.swagger-ui .opblock.opblock-put {
  background: rgba(249, 171, 0, 0.05);
  border-color: #fdd663;
}
.swagger-ui .opblock.opblock-put .opblock-summary-method {
  background: #e37400;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  min-width: 70px;
  text-align: center;
}
.swagger-ui .opblock.opblock-put .opblock-summary {
  border-color: #fdd663;
}

/* DELETE — red */
.swagger-ui .opblock.opblock-delete {
  background: rgba(217, 48, 37, 0.05);
  border-color: #f5b7b1;
}
.swagger-ui .opblock.opblock-delete .opblock-summary-method {
  background: #d93025;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  min-width: 70px;
  text-align: center;
}
.swagger-ui .opblock.opblock-delete .opblock-summary {
  border-color: #f5b7b1;
}

/* PATCH — teal */
.swagger-ui .opblock.opblock-patch {
  background: rgba(0, 137, 123, 0.05);
  border-color: #80cbc4;
}
.swagger-ui .opblock.opblock-patch .opblock-summary-method {
  background: #00897b;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  min-width: 70px;
  text-align: center;
}
.swagger-ui .opblock.opblock-patch .opblock-summary {
  border-color: #80cbc4;
}

/* All opblocks — shared styling */
.swagger-ui .opblock {
  border-radius: 8px;
  box-shadow: none;
  margin-bottom: 8px;
}

.swagger-ui .opblock .opblock-section-header {
  background: #f1f3f4;
  border-bottom: 1px solid #dadce0;
  box-shadow: none;
}

.swagger-ui .opblock .opblock-section-header h4 {
  color: #202124;
}

/* ----------------------------------------------------------------
   7. Tag sections
   ---------------------------------------------------------------- */
.swagger-ui .opblock-tag {
  border-bottom: 1px solid #dadce0;
  font-size: 18px;
  font-weight: 500;
  padding: 12px 0;
}

/* ----------------------------------------------------------------
   8. Buttons
   ---------------------------------------------------------------- */

/* Authorize button */
.swagger-ui .btn.authorize {
  background-color: transparent;
  border-color: #1a73e8;
  color: #1a73e8;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: none;
}
.swagger-ui .btn.authorize:hover {
  background-color: rgba(26, 115, 232, 0.08);
}

.swagger-ui .btn.authorize svg {
  fill: #1a73e8;
}

/* Execute button */
.swagger-ui .btn.execute {
  background-color: #1a73e8;
  border-color: #1a73e8;
  color: #ffffff;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: none;
}
.swagger-ui .btn.execute:hover {
  background-color: #1557b0;
  border-color: #1557b0;
}

/* Cancel button */
.swagger-ui .btn.cancel {
  border-color: #dadce0;
  color: #5f6368;
  border-radius: 6px;
  font-weight: 500;
}

/* Generic button reset */
.swagger-ui .btn {
  border-radius: 6px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  box-shadow: none;
  transition: background-color 0.15s, border-color 0.15s;
}

/* "Try it out" button */
.swagger-ui .try-out__btn {
  border-color: #1a73e8;
  color: #1a73e8;
  border-radius: 6px;
}
.swagger-ui .try-out__btn:hover {
  background-color: rgba(26, 115, 232, 0.08);
}

/* ----------------------------------------------------------------
   9. Inputs
   ---------------------------------------------------------------- */
.swagger-ui input[type="text"],
.swagger-ui input[type="password"],
.swagger-ui input[type="search"],
.swagger-ui input[type="email"],
.swagger-ui input[type="file"],
.swagger-ui textarea,
.swagger-ui select {
  border: 1px solid #dadce0;
  border-radius: 6px;
  padding: 6px 10px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #202124;
  transition: border-color 0.15s, box-shadow 0.15s;
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
   10. Code blocks & models
   ---------------------------------------------------------------- */
.swagger-ui .highlight-code,
.swagger-ui .example pre,
.swagger-ui .model-box {
  background: #f1f3f4;
  border: 1px solid #dadce0;
  border-radius: 6px;
}

.swagger-ui .model-toggle::after {
  color: #5f6368;
}

.swagger-ui .model {
  color: #202124;
}

.swagger-ui .model .property {
  color: #1a73e8;
}

/* ----------------------------------------------------------------
   11. Response section
   ---------------------------------------------------------------- */
.swagger-ui .responses-inner h4,
.swagger-ui .responses-inner h5 {
  color: #202124;
}

.swagger-ui .response-col_status {
  color: #202124;
  font-weight: 600;
}

.swagger-ui table thead tr th {
  color: #202124;
  border-bottom: 2px solid #dadce0;
}

.swagger-ui table thead tr td {
  color: #5f6368;
}

/* ----------------------------------------------------------------
   12. Info section
   ---------------------------------------------------------------- */
.swagger-ui .info {
  margin: 30px 0;
}

.swagger-ui .info .title small.version-stamp {
  background-color: #1a73e8;
  border-radius: 12px;
  padding: 2px 10px;
}

.swagger-ui .info a {
  color: #1a73e8;
}

/* ----------------------------------------------------------------
   13. Server select
   ---------------------------------------------------------------- */
.swagger-ui .servers > label select {
  border: 1px solid #dadce0;
  border-radius: 6px;
  color: #202124;
}

/* ----------------------------------------------------------------
   14. Authorization modal
   ---------------------------------------------------------------- */
.swagger-ui .dialog-ux .modal-ux {
  border: 1px solid #dadce0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(60, 64, 67, 0.15);
}

.swagger-ui .dialog-ux .modal-ux-header {
  border-bottom: 1px solid #dadce0;
}

.swagger-ui .dialog-ux .modal-ux-header h3 {
  color: #202124;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.swagger-ui .dialog-ux .modal-ux-content p {
  color: #5f6368;
}

/* ----------------------------------------------------------------
   15. Loading bar
   ---------------------------------------------------------------- */
.swagger-ui .loading-container .loading::after {
  color: #1a73e8;
}

/* ================================================================
   DARK MODE — @media (prefers-color-scheme: dark)
   ================================================================ */
@media (prefers-color-scheme: dark) {
  /* Background */
  body,
  .swagger-ui {
    background-color: #202124;
    color: #e8eaed;
  }

  /* Topbar */
  .swagger-ui .topbar {
    background-color: #292a2d;
    border-bottom-color: #3c4043;
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

  /* General text */
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

  /* Tag sections */
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
    background: rgba(138, 180, 248, 0.08);
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
    background: rgba(129, 201, 149, 0.08);
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
    background: rgba(253, 214, 99, 0.08);
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
    background: rgba(242, 139, 130, 0.08);
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
    background: rgba(0, 137, 123, 0.08);
    border-color: #4db6ac;
  }
  .swagger-ui .opblock.opblock-patch .opblock-summary {
    border-color: #4db6ac;
  }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: #4db6ac;
    color: #202124;
  }

  /* Opblock section headers */
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
    background-color: rgba(138, 180, 248, 0.12);
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
    border-color: #3c4043;
    color: #9aa0a6;
  }

  .swagger-ui .try-out__btn {
    border-color: #8ab4f8;
    color: #8ab4f8;
  }
  .swagger-ui .try-out__btn:hover {
    background-color: rgba(138, 180, 248, 0.12);
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

  /* Authorization modal */
  .swagger-ui .dialog-ux .modal-ux {
    background: #292a2d;
    border-color: #3c4043;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
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
