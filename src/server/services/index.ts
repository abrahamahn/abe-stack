// Export services with namespace prefixes to avoid naming conflicts
import * as AppServices from "./app";
import * as DevServices from "./dev";
import * as SharedServices from "./shared";

export { AppServices, DevServices, SharedServices };
