import { ServiceBroker } from "./services/broker";
import { ServiceEngine } from "./services/engine";
import { ServiceStore } from "./services/store";
import { ServiceBus } from "./services/bus";
import { SystemAvatar } from "./systems/avatar";

type Config = {
  member_id: string;
  space_id: string;
};

export type Command = {
  eid: string;
  set?: { [component_name: string]: any }; // components to patch
  del?: []; // component_names
  ttl?: number; // a way to expire an entire entity
};

export interface ISystem {
  name: string;
  init: (xrs: XRS) => void;
}

export class XRS {
  public config: Config;
  public systems: ISystem[] = [];
  public services = {
    store: new ServiceStore(),
    bus: new ServiceBus(),
    engine: new ServiceEngine(),
    broker: new ServiceBroker(),
  };

  debug() {
    this.services.engine.scene.debugLayer.show({ embedMode: true });
  }

  init(vars: Config) {
    this.config = vars;
    Object.values(this.services).forEach((service) => service.init(this));
    this.add_system(new SystemAvatar());
    this.systems.forEach((sys) => sys.init(this));
  }

  entered() {
    this.services.bus.entered_space.next(true);
  }

  send_command(command: Command, send_to_self: boolean = true) {
    this.services.broker.push(command);
    if (send_to_self) {
      this.handle_command(command);
    }
  }

  handle_command(command: Command) {
    this.services.store.apply_command(command);
    this.services.bus.incoming_commands.next(command);
  }

  add_system(system: ISystem) {
    this.systems.push(system);
  }
}
