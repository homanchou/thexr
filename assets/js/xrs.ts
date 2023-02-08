import { SystemBroker } from "./systems/broker";
import { SystemEntry } from "./systems/entry";
import { SystemScene } from "./systems/scene";
import { Scene } from "@babylonjs/core";
import { Subject } from "rxjs/internal/Subject";
import { Command, CondensedCommandQueue } from "./condensed_command_queue";
import { EntityComponentStore } from "./entity_component_store";
import { SystemShape } from "./systems/shape";
import { SystemTransform } from "./systems/transform";

type Config = {
  member_id: string;
  member_token: string;
  space_id: string;
};

export interface ISystem {
  name: string;
  init: (xrs: XRS) => void;
}

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
  constructor() {
    this.load_default_systems();
  }

  dispatch_commands_to_local(commands: Command[]) {
    for (let i = 0; i < commands.length; i++) {
      this.bus.commands_to_process.next(commands[i]);
    }
  }

  upsert(entity_id: string, path: string, value: any) {
    CondensedCommandQueue.upsert_command(this.command_queue, {
      eid: entity_id,
      set: {
        [path]: value,
      },
    });
  }

  delete_entity(entity_id: string) {
    CondensedCommandQueue.upsert_command(this.command_queue, {
      eid: entity_id,
      ttl: 0,
    });
  }

  delete_component(entity_id: string, component_path: string) {
    CondensedCommandQueue.upsert_command(this.command_queue, {
      eid: entity_id,
      del: new Set([component_path]),
    });
  }

  has_component(entity_id: string, component_name: string) {
    return (
      this.store[entity_id] &&
      this.store[entity_id][component_name] !== undefined
    );
  }

  init_and_start(vars: Config) {
    this.init(vars);
    this.broker.create_channel();
    this.start();
  }

  init(vars: Config) {
    this.config = vars;
    this.systems.forEach((sys) => sys.init(this));
  }

  start() {
    this.scene.onBeforeRenderObservable.add(() => {
      this.tick();
    });
  }

  tick() {
    const copy_local = [...this.command_queue];
    // apply local commands
    EntityComponentStore.apply_commands_to_store(
      this.command_queue,
      this.store
    );
    // apply remote commands
    const copy_remote = [...this.broker.in_box];
    EntityComponentStore.apply_commands_to_store(
      this.broker.in_box,
      this.store
    );
    this.dispatch_commands_to_local([...copy_local, ...copy_remote]);
    if (copy_local.length > 0) {
      this.broker.dispatch_to_remote(copy_local);
    }
  }

  load_default_systems() {
    this.add_system(new SystemScene());
    this.add_system(new SystemShape());
    this.add_system(new SystemBroker());
    this.add_system(new SystemEntry());
    this.add_system(new SystemTransform());
  }

  add_system(system: ISystem) {
    this.systems.push(system);
  }
}
