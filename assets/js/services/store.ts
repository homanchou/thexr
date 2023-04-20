import { XRS, Command } from "../xrs";

export class ServiceStore {
  public xrs: XRS;
  public state = {};

  public init(xrs: XRS) {
    this.xrs = xrs;
  }
  set_component(eid: string, component_name: string, component_value: any) {
    if (!this.state[eid]) {
      this.state[eid] = {};
    }
    this.state[eid][component_name] = component_value;
  }
  del_component(eid: string, component_name: string) {
    if (this.state[eid]) {
      delete this.state[eid][component_name];
    }
  }
  del_entity(eid: string) {
    delete this.state[eid];
  }
  // apply_command(command: Command) {
  //   const { eid } = command;
  //   if (command.set) {
  //     if (!this.state[eid]) {
  //       this.state[eid] = {};
  //     }
  //     Object.entries(command.set).forEach(([key, value]) => {
  //       this.state[eid][key] = value;
  //     });
  //   }
  //   if (command.del) {
  //     for (const component_name of command.del) {
  //       delete this.state[eid][component_name];
  //     }
  //   }
  //   if (command.ttl) {
  //     delete this.state[eid];
  //   }
  // }
  component_names(eid: string) {
    return Object.keys(this.state[eid] || {});
  }
  has_component(entity_id: string, component_name: string) {
    return (
      this.state[entity_id] &&
      this.state[entity_id][component_name] !== undefined
    );
  }
  get_component(entity_id: string, component_name: string) {
    return this.state[entity_id] && this.state[entity_id][component_name];
  }
}
