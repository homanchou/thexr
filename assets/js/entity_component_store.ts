import { Command } from "./condensed_command_queue";

export type ComponentOperations = "del" | "set" | "ttl";

export function command_has_component_set(command, component_name) {
  if (!command.set) {
    return false;
  }
  if (command.set[component_name] !== undefined) {
    return true;
  }
  for (const key in Object.keys(command.set)) {
    if (key.split(".")[0] === component_name) {
      return true;
    }
  }
  return false;
}

export function get_command_value(
  cmd: Command,
  section: ComponentOperations,
  path: string
) {
  if (section === "set") {
    const set = cmd[section];
    if (set !== undefined) {
      return set[path];
    }
  }
  // const parts = path.split(".");
  // if (section === "set") {
  //   let current = cmd[section];
  //   if (current === undefined) {
  //     return;
  //   }
  //   for (let i = 0; i < parts.length - 1; i++) {
  //     const part = parts[i];
  //     if (current === undefined) {
  //       return;
  //     }
  //     if (!(part in current)) {
  //       return;
  //     }
  //     current = current[part];
  //   }
  //   if (current !== undefined) {
  //     return current[parts[parts.length - 1]];
  //   }
  // }
}

export class EntityComponentStore {
  public static apply_commands_to_store(
    command_queue: Command[],
    store: object
  ) {
    for (let i = 0; i < command_queue.length; i++) {
      this.apply_command_to_store(command_queue[i], store);
    }
    command_queue.length = 0;
  }

  public static apply_command_to_store(cmd: Command, store: object) {
    // delete has precedence over other components
    if (cmd.ttl === 0) {
      delete store[cmd.eid];
      return;
    }
    const componentsForEntity = store[cmd.eid] || {};
    store[cmd.eid] = componentsForEntity;

    if (cmd.del) {
      for (const component_name of cmd.del.values()) {
        this.deep_update_store(cmd.eid, "del", component_name, null, store);
      }
    }
    if (cmd.set) {
      for (const [key, value] of Object.entries(cmd.set)) {
        this.deep_update_store(cmd.eid, "set", key, value, store);
      }
    }
  }

  public static deep_update_store(
    entity_id: string,
    op: ComponentOperations,
    path: string,
    value: any,
    store: object
  ) {
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
