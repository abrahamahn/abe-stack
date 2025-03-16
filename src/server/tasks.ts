import * as queueTasks from "./tasks/autoindex"

type Q = typeof queueTasks
export type TaskName = keyof Q

// Assert proper types.
export type Tasks = { [K in keyof Q]: Extract<Q[K], Record<K, unknown>>[K] }

const tasks = Object.fromEntries(
  Object.entries(queueTasks).map(([key, value]) => [
    key,
    value[key as keyof typeof value]
  ])
) as Tasks;

export { tasks }
