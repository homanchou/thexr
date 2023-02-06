import { SystemBroker } from "./systems/broker";
import { SystemEntry } from "./systems/entry";
import { SystemScene } from "./systems/scene";
import { Scene } from "@babylonjs/core";
import { Subject } from "rxjs/internal/Subject";
import { CondensedCommandQueue } from "./condensed_command_queue";
import { EntityComponentStore } from "./entity_component_store";

type Config = {
  member_id: string;
  member_token: string;
  space_id: string;
};

export interface ISystem {
  name: string;
  init: (xrs: XRS) => void;
}

export type ComponentOperations = "set" | "del";

export type ComponentCommand = {
  path: string;
  op: ComponentOperations;
  value?: any;
};

export type Command = {
  eid: string; // to update an entity
  cp: ComponentCommand[]; // with these components
  incoming?: boolean; // filtered out before sending
};

export class XRS {
  public config: Config;
  public systems: ISystem[] = [];
  public command_queue: Command[] = [];
  public scene: Scene;
  public broker: SystemBroker;
  public bus = {
    commands_to_process: new Subject<Command>(),
  };
  public store = {}; // allows systems to access full state of any entity
  public components_entered = new Set<string>();
  public components_exited = new Set<string>();
  constructor() {
    this.load_default_systems();
  }

  dispatch_commands_to_local(commands: Command[]) {
    for (let i = 0; i < commands.length; i++) {
      this.bus.commands_to_process.next(commands[i]);
    }
  }

  /* use this when receiving commands */
  import_command(command: Command) {
    CondensedCommandQueue.upsert_command(this.command_queue, {
      ...command,
      incoming: true,
    });
  }

  /* use this for local systems making changes */
  upsert(entity_id: string, path: string, op: ComponentOperations, value: any) {
    CondensedCommandQueue.upsert_command(this.command_queue, {
      eid: entity_id,
      cp: [{ path, op, value }],
    });
  }

  //syntactic sugar to delete an entity
  delete_entity(entity_id: string) {
    this.upsert(entity_id, "ttl", "set", 0);
  }

  //sugar to delete a component
  delete_component(entity_id: string, component_path: string) {
    this.upsert(entity_id, component_path, "del", null);
  }

  has_component(entity_id: string, component_name: string) {
    return (
      this.store[entity_id] &&
      this.store[entity_id][component_name] !== undefined
    );
  }

  dispatch_commands_to_remote(commands: Command[]) {}

  apply_commands_to_store() {
    return EntityComponentStore.apply_commands_to_store(
      this.command_queue,
      this.store
    );
  }

  init(vars: Config) {
    this.config = vars;
    this.systems.forEach((sys) => sys.init(this));
    this.scene.onBeforeRenderObservable.add(() => {
      const commands = this.apply_commands_to_store();
      this.dispatch_commands_to_local(commands);
      const commands_to_broadcast = commands.filter((item) => !item.incoming);
      if (commands_to_broadcast.length > 0) {
        this.broker.dispatch_to_remote(commands_to_broadcast);
      }
    });
  }

  load_default_systems() {
    this.add_system(new SystemScene());
    this.add_system(new SystemBroker());
    this.add_system(new SystemEntry());
  }

  add_system(system: ISystem) {
    this.systems.push(system);
  }
}
