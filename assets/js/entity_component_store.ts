import { Command, ComponentCommand } from "./xrs";

export class EntityComponentStore {
  public static apply_commands_to_store(
    command_queue: Command[],
    store: object
  ): Command[] {
    const temp: Command[] = []; //[...this.command_queue];

    for (let i = 0; i < command_queue.length; i++) {
      this.apply_command_to_store(command_queue[i], store);
      temp.push(command_queue[i]);
    }
    command_queue.length = 0;
    return temp;
  }

  public static apply_command_to_store(cmd: Command, store: object) {
    const componentsForEntity = store[cmd.eid] || {};
    store[cmd.eid] = componentsForEntity;
    // delete has precedence over other components
    if (cmd.cp.find((item) => item.path === "ttl" && item.value === 0)) {
      delete store[cmd.eid];
      return;
    }
    for (let i = 0; i < cmd.cp.length; i++) {
      this.update_store(cmd.eid, cmd.cp[i], store);
    }
  }

  public static update_store(entity_id, comp: ComponentCommand, store: object) {
    const { op, path, value } = comp;
    const parts = path.split(".");
    let current = store[entity_id];

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    if (op === "set") {
      current[parts[parts.length - 1]] = value;
    } else if (op === "del") {
      delete current[parts[parts.length - 1]];
    }
  }
}
