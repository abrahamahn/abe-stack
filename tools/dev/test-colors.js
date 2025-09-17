#!/usr/bin/env node

/**
 * Color Test Script - Test the improved color scheme
 */

// Enhanced color palette for better visual organization
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[94m", // Bright blue for better readability
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
};

console.log("\n" + colors.brightMagenta + "═".repeat(60) + colors.reset);
console.log(
  colors.brightMagenta + "  ABE Stack Enhanced Color Scheme Test" + colors.reset
);
console.log(colors.brightMagenta + "═".repeat(60) + colors.reset + "\n");

console.log("Service Colors:");
console.log(
  `${colors.brightMagenta}[SYSTEM]      ${colors.reset}System messages (bright magenta)`
);
console.log(
  `${colors.brightCyan}[BACKEND]     ${colors.reset}Backend service (bright cyan - improved!)`
);
console.log(
  `${colors.brightGreen}[FRONTEND]    ${colors.reset}Frontend service (bright green)`
);
console.log(
  `${colors.brightBlue}[DATABASE]    ${colors.reset}Database service (bright blue - improved!)`
);
console.log(
  `${colors.brightYellow}[INFRASTRUCTURE]${colors.reset} Infrastructure (bright yellow - improved!)`
);
console.log(
  `${colors.cyan}[MONITOR]     ${colors.reset}Monitoring service (cyan - improved!)`
);

console.log("\nLog Level Colors:");
console.log(`${colors.gray}🔍 DEBUG${colors.reset}     Debug messages (gray)`);
console.log(
  `${colors.blue}ℹ️ INFO${colors.reset}      Information (bright blue - improved!)`
);
console.log(`${colors.yellow}⚠️ WARN${colors.reset}      Warnings (yellow)`);
console.log(`${colors.red}❌ ERROR${colors.reset}     Errors (red)`);
console.log(
  `${colors.green}✅ SUCCESS${colors.reset}   Success messages (green)`
);
console.log(
  `${colors.magenta}🔧 SYSTEM${colors.reset}    System operations (magenta)`
);

console.log("\nSample Log Entries:");
console.log(
  `${colors.dim}4.6s${colors.reset} ✅ ${colors.brightCyan}[BACKEND]     ${colors.reset} ${colors.green}Server is now running on port 8080${colors.reset}`
);
console.log(
  `${colors.dim}5.8s${colors.reset} ✅ ${colors.brightGreen}[FRONTEND]    ${colors.reset} ${colors.green}Frontend is now running on port 5173${colors.reset}`
);
console.log(
  `${colors.dim}0.4s${colors.reset} ✅ ${colors.brightBlue}[DATABASE]    ${colors.reset} ${colors.green}PostgreSQL is running on port 5432${colors.reset}`
);
console.log(
  `${colors.dim}1.2s${colors.reset} ℹ️ ${colors.brightYellow}[INFRASTRUCTURE]${colors.reset} ${colors.blue}Infrastructure services status check completed${colors.reset}`
);
console.log(
  `${colors.dim}35.8s${colors.reset} 🔍 ${colors.cyan}[MONITOR]     ${colors.reset} ${colors.gray}Running infrastructure health check...${colors.reset}`
);

console.log(
  "\n" + colors.brightGreen + "✅ Color scheme test completed!" + colors.reset
);
console.log(
  colors.gray +
    "   The improved colors should be much more readable now." +
    colors.reset +
    "\n"
);
