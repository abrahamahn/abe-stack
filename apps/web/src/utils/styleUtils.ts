/**
 * Merges multiple style objects together
 * @param styles Array of style objects to merge
 * @returns Merged style object
 */
export const mergeStyles = (
  ...styles: (React.CSSProperties | undefined)[]
): React.CSSProperties => {
  return Object.assign({}, ...styles.filter(Boolean)) as React.CSSProperties;
};

/**
 * Creates a conditional style object
 * @param condition Boolean condition
 * @param trueStyles Styles to apply if condition is true
 * @param falseStyles Optional styles to apply if condition is false
 * @returns Style object based on condition
 */
export const conditionalStyle = (
  condition: boolean,
  trueStyles: React.CSSProperties,
  falseStyles?: React.CSSProperties,
): React.CSSProperties => {
  return condition ? trueStyles : falseStyles || {};
};

/**
 * Applies styles based on hover state
 * @param isHovered Boolean indicating hover state
 * @param baseStyles Base styles
 * @param hoverStyles Styles to apply when hovered
 * @returns Combined style object
 */
export const applyHoverStyles = (
  isHovered: boolean,
  baseStyles: React.CSSProperties,
  hoverStyles: React.CSSProperties,
): React.CSSProperties => {
  return mergeStyles(baseStyles, conditionalStyle(isHovered, hoverStyles));
};

/**
 * Creates a CSS variable string from a variables object
 * @param variables Object containing CSS variable definitions
 * @returns CSS variables as a string
 */
export const createCSSVariables = (
  variables: Record<string, string>,
): string => {
  return Object.entries(variables)
    .map(([key, value]) => `--${key}: ${value};`)
    .join(" ");
};

/**
 * Injects global CSS variables into the document
 * @param lightVariables Light theme variables
 * @param darkVariables Dark theme variables
 */
export const injectGlobalCSSVariables = (
  lightVariables: Record<string, string>,
  darkVariables: Record<string, string>,
): void => {
  // Create style element
  const styleElement = document.createElement("style");

  // Create CSS content
  const cssContent = `
    :root {
      ${createCSSVariables(lightVariables)}
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        color-scheme: dark;
        ${createCSSVariables(darkVariables)}
      }
    }
    
    @keyframes rotation {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;

  // Set style content
  styleElement.textContent = cssContent;

  // Append to head
  document.head.appendChild(styleElement);
};

/**
 * Creates a className string from conditional classes
 * @param baseClass Base class name
 * @param conditionalClasses Object with class names as keys and conditions as values
 * @returns Combined class name string
 */
export const classNames = (
  baseClass: string,
  conditionalClasses: Record<string, boolean> = {},
): string => {
  const classes = [baseClass];

  Object.entries(conditionalClasses).forEach(([className, condition]) => {
    if (condition) {
      classes.push(className);
    }
  });

  return classes.join(" ");
};
