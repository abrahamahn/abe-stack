import * as queueTasks from "./autoindex";

type Q = typeof queueTasks;
export type TaskName = keyof Q;

// Assert proper types
export type Tasks = { [K in keyof Q]: Extract<Q[K], { [T in K]: unknown }>[K] };

const tasks: Tasks = {} as Tasks;
for (const taskName in queueTasks) {
  const key = taskName as keyof Q;
  tasks[key] = queueTasks[key][key];
}
export { tasks };
