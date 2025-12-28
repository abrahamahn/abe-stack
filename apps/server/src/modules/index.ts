// Base modules
export * from "./base";
export * from "./core";

// Utility function for easy module access
export const getModule = <T>(moduleName: string, serviceClass?: string): T => {
  const module = (exports as any)[moduleName];

  if (!module) {
    throw new Error(`Module "${moduleName}" not found`);
  }

  if (serviceClass) {
    if (!module[serviceClass]) {
      throw new Error(
        `Service "${serviceClass}" not found in module "${moduleName}"`
      );
    }

    return module[serviceClass] as T;
  }

  return module as T;
};
