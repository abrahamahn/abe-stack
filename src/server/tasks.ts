import * as queueTasks from "./tasks/autoindex"

type Q = typeof queueTasks
export type TaskName = keyof Q

// Assert proper types.
export type Tasks = { [K in keyof Q]: Extract<Q[K], { [T in K]: any }>[K] }

const tasks: Tasks = {} as any
// Use type assertion to fix the indexing issue
Object.keys(queueTasks).forEach((taskName) => {
  const key = taskName as keyof typeof queueTasks;
  tasks[key] = (queueTasks[key] as any)[key];
});

export { tasks }
