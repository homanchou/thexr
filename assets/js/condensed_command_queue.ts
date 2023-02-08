export type Command = {
  eid: string;
  set?: Record<string, any>;
  del?: Set<string>;
  ttl?: number;
};

export class CondensedCommandQueue {
  public static upsert_command(queue: Command[], new_command: Command) {
    const existing_command = queue.find((item) => item.eid === new_command.eid);
    if (existing_command) {
      if (new_command.set) {
        for (const [key, value] of Object.entries(new_command.set)) {
          existing_command.set ||= {};
          existing_command.set[key] = value;
        }
      }
      if (new_command.del) {
        existing_command.del ||= new Set<string>();
        for (const component_name of new_command.del) {
          existing_command.del.add(component_name);
        }
      }
      if (new_command.ttl) {
        existing_command.ttl = new_command.ttl;
      }
    } else {
      queue.push(new_command);
    }
  }
}
