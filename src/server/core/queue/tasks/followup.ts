/*

This Task is a template.

*/

// This task can be enqueued and run in the background by enqueuing on the QueueDatabase.
//
// environment.queue.enqueue({
// 	id: randomId(),
// 	name: "followup",
// 	args: {message: "Hey!"},
// 	run_at: new Date().toISOString()
// })
export function followup(args: { message: string }): void {
  console.log("Running followup task: " + args.message);
}
