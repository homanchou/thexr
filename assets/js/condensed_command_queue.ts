import { Command, ComponentCommand, ComponentOperations } from "./xrs";

export class CondensedCommandQueue {
  public static upsert_command(queue: Command[], new_command: Command) {
    const existing_command = queue.find((item) => item.eid === new_command.eid);
    if (existing_command) {
      for (let i = 0; i < new_command.cp.length; i++) {
        this.component_upsert(new_command.cp[i], existing_command.cp);
      }
    } else {
      queue.push(new_command);
    }
  }

  //   public static upsert(
  //     queue: Command[],
  //     entity_id: string,
  //     path: string,
  //     op: ComponentOperations,
  //     value: any
  //   ) {
  //     const cmd = queue.find((item) => item.eid === entity_id);
  //     if (cmd) {
  //       this.component_upsert({ path, op, value }, cmd.cp);
  //     } else {
  //       queue.push({ eid: entity_id, cp: [{ path, op, value }] });
  //     }
  //   }

  public static component_upsert(
    command: ComponentCommand,
    existing_commands: ComponentCommand[]
  ) {
    const comp_command = existing_commands.find(
      (comp) => comp.path === command.path
    );
    if (comp_command) {
      comp_command.op = command.op;
      comp_command.value = command.value;
    } else {
      existing_commands.push(command);
    }
  }
}
