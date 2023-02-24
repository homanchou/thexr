import { XRS, Command } from "../xrs";

export class ServiceStore {
  public xrs: XRS;
  public state = {};

  public init(xrs: XRS) {
    this.xrs = xrs;
  }
  apply_command(command: Command) {
    const { eid } = command;
    if (command.set) {
      if (!this.state[eid]) {
        this.state[eid] = {};
      }
      Object.entries(command.set).forEach(([key, value]) => {
        this.state[eid][key] = value;
      });
    }
  }
  component_names(eid: string) {
    return Object.keys(this.state[eid] || {});
  }
  has_component(entity_id: string, component_name: string) {
    return (
      this.state[entity_id] &&
      this.state[entity_id][component_name] !== undefined
    );
  }
}
