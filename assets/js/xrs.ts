import { BrokerSystem } from "./systems/broker";
import { SceneSystem } from "./systems/scene";

type Config = {
  member_id: string;
  member_token: string;
  space_id: string;
};

interface ISystem {
  name: string;
  init: (xrs: XRS) => void;
}

export class XRS {
  public config: Config;
  public systems: ISystem[] = [];
  init(vars: Config) {
    this.config = vars;
    this.load_default_systems();
    this.systems.forEach((sys) => sys.init(this));
  }

  load_default_systems() {
    this.add_system(new SceneSystem());
    this.add_system(new BrokerSystem());
  }

  add_system(system: ISystem) {
    this.systems.push(system);
  }
}
