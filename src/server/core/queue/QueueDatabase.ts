import fs from "fs";

import { TaskName, Tasks } from "./tasks";
import { randomId } from "../../../shared/randomId";
import { Simplify } from "../../../shared/typeHelpers";
import { Logger } from "../../services/dev/logger/LoggerService";

type QueueTaskArgs = {
  [K in keyof Tasks]: Parameters<Tasks[K]>[1];
};

export type TaskError = {
  name: string;
  message: string;
  stack: string;
};

type Task<T extends TaskName = TaskName> = {
  id: string;
  name: T;
  args: QueueTaskArgs[T];
  run_at: string; // ISO date string.
  started_at?: string;
  error?: TaskError;
};

// Simple in-memory database structure
interface TaskStore {
  tasks: Record<string, Task>;
  waiting: Record<string, string[]>; // run_at -> task ids
  running: Record<string, string[]>; // started_at -> task ids
  failed: Record<string, Task>; // task id -> task
}

const debug = (...args: unknown[]): void => console.log("queue:", ...args);

export class QueueDatabase {
  private store: TaskStore = {
    tasks: {},
    waiting: {},
    running: {},
    failed: {},
  };
  private tasksPath: string;
  private logger: Logger;
  enqueue!: EnqueueApi;

  constructor(tasksPath: string = "") {
    this.logger = new Logger("QueueDatabase");
    this.tasksPath = tasksPath;

    // Load existing tasks if available
    void this.loadTasks();

    // Create the enqueue proxy
    this.createEnqueueProxy();
  }

  private async loadTasks(): Promise<void> {
    try {
      if (fs.existsSync(this.tasksPath)) {
        const data = await fs.promises.readFile(this.tasksPath, "utf8");
        this.store = JSON.parse(data) as TaskStore;
        this.logger.info("Tasks loaded successfully");
      }
    } catch (error) {
      this.logger.error("Error loading tasks:", error);
      // Initialize with empty store if there's an error
      this.store = {
        tasks: {},
        waiting: {},
        running: {},
        failed: {},
      };
    }
  }

  private async saveTasks(): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.tasksPath,
        JSON.stringify(this.store, null, 2),
        "utf8",
      );
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  }

  private async enqueueTask(task: Task): Promise<string> {
    debug(`> enqueue.${task.name}`);

    // Add task to tasks store
    this.store.tasks[task.id] = task;

    // Add task to waiting queue
    if (!this.store.waiting[task.run_at]) {
      this.store.waiting[task.run_at] = [];
    }
    this.store.waiting[task.run_at].push(task.id);

    // Save changes
    await this.saveTasks();

    return task.id;
  }

  async dequeueTask(now: string): Promise<Task | null> {
    // Find the earliest waiting task that should run now
    const runAtTimes = Object.keys(this.store.waiting).sort();
    let taskToRun: Task | null = null;
    let runAtTime: string | null = null;

    for (const time of runAtTimes) {
      if (time <= now && this.store.waiting[time].length > 0) {
        runAtTime = time;
        const taskId = this.store.waiting[time][0];
        taskToRun = this.store.tasks[taskId];
        break;
      }
    }

    if (!taskToRun || !runAtTime) return null;

    // Remove task from waiting queue
    this.store.waiting[runAtTime] = this.store.waiting[runAtTime].filter(
      (id) => id !== taskToRun.id,
    );
    if (this.store.waiting[runAtTime].length === 0) {
      delete this.store.waiting[runAtTime];
    }

    // Update task with started_at time
    taskToRun.started_at = now;
    this.store.tasks[taskToRun.id] = taskToRun;

    // Add task to running queue
    if (!this.store.running[now]) {
      this.store.running[now] = [];
    }
    this.store.running[now].push(taskToRun.id);

    // Save changes
    await this.saveTasks();

    if (taskToRun) debug(`< dequeue.${taskToRun.name}`);
    return taskToRun;
  }

  async finishTask(task: Task, error?: TaskError): Promise<void> {
    if (error) {
      console.error(error);
      debug(`. error.${task.name}`);
    } else {
      debug(`. finish.${task.name}`);
    }

    const { started_at, id } = task;
    if (!started_at)
      throw new Error(`Cannot finish a task that was never started: ${id}`);

    // Remove task from running queue
    if (this.store.running[started_at]) {
      this.store.running[started_at] = this.store.running[started_at].filter(
        (taskId) => taskId !== id,
      );
      if (this.store.running[started_at].length === 0) {
        delete this.store.running[started_at];
      }
    }

    // If there's an error, add to failed queue
    if (error) {
      this.store.failed[id] = { ...task, error };
    }

    // Remove task from tasks store
    delete this.store.tasks[id];

    // Save changes
    await this.saveTasks();
  }

  private createEnqueueProxy(): void {
    this.enqueue = new Proxy(
      {},
      {
        get: (_, key: string) => {
          return async (args: unknown, options?: { runAt: string }) => {
            let runAt: string;
            if (options?.runAt) {
              runAt = options.runAt;
            } else {
              runAt = new Date().toISOString();
            }

            const task: Task = {
              id: randomId(),
              name: key as TaskName,
              args: args as QueueTaskArgs[TaskName],
              run_at: runAt,
            };
            await this.enqueueTask(task);
            return task.id;
          };
        },
      },
    ) as EnqueueApi;
  }

  async reset(): Promise<void> {
    this.store = {
      tasks: {},
      waiting: {},
      running: {},
      failed: {},
    };
    await this.saveTasks();
  }
}

type EnqueueApi = {
  [K in keyof QueueTaskArgs]: (
    args: QueueTaskArgs[K],
    options?: { runAt: string },
  ) => Promise<string>;
};

export type QueueDatabaseApi = Simplify<QueueDatabase>;
