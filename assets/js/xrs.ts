/* services */
import { ServiceBroker, XRSHook } from "./services/broker";
import { ServiceEngine } from "./services/engine";
import { ServiceStore } from "./services/store";
import { ServiceBus } from "./services/bus";
import { ServiceTone } from "./services/tone";
import { ServiceWebRTC } from "./services/webrtc";

/* systems */
import { SystemAvatar } from "./systems/avatar";
import { SystemShape } from "./systems/shape";
import { SystemSequencer } from "./systems/sequencer";
import { SystemLighting } from "./systems/lighting";
import { SystemTransform } from "./systems/transform";
import { SystemXR } from "./systems/xr";
import { SystemXRFlight } from "./systems/xr-flight";
import { SystemFloor } from "./systems/floor";
import { SystemMaterial } from "./systems/material";
import { SystemHoldable } from "./systems/holdable";
import { SystemLogger } from "./systems/logger";
import { SystemAnimate } from "./systems/animate";
import { SystemXRMenu } from "./systems/xr-menu";

type Config = {
  member_id: string;
  space_id: string;
};

type Vars = {
  member_id: string;
  space_id: string;
  snapshot: { [eid: string]: any };
};

export type Command = {
  eid: string; // entity id
  set?: { [component_name: string]: any }; // components to patch
  del?: string[]; // component_names
  ttl?: number; // a way to expire an entire entity
  tag?: string; // optional label to make it easier to filter in the backend
};

export interface ISystem {
  name: string;
  init: (xrs: XRS) => void;
}

export class XRS {
  public inited = false; // prevent double init
  public config: Config;
  public systems: ISystem[] = [];
  public services = {
    store: new ServiceStore(),
    bus: new ServiceBus(),
    engine: new ServiceEngine(),
    broker: new ServiceBroker(),
    tone: new ServiceTone(),
    webrtc: new ServiceWebRTC(),
  };

  debug() {
    this.services.engine.scene.debugLayer.show({ embedMode: true });
  }

  init(vars: Vars) {
    if (this.inited) {
      return;
    }
    this.config = { member_id: vars.member_id, space_id: vars.space_id };
    Object.values(this.services).forEach((service) => service.init(this));

    this.add_system(new SystemAvatar());
    this.add_system(new SystemShape());
    this.add_system(new SystemLogger());
    this.add_system(new SystemTransform());
    this.add_system(new SystemLighting());
    this.add_system(new SystemSequencer());
    this.add_system(new SystemXR());
    this.add_system(new SystemXRFlight());
    this.add_system(new SystemFloor());
    this.add_system(new SystemMaterial());
    this.add_system(new SystemHoldable());
    this.add_system(new SystemAnimate());
    this.add_system(new SystemXRMenu());

    this.systems.forEach((sys) => sys.init(this));

    for (const [eid, components] of Object.entries(vars.snapshot)) {
      this.handle_command({ eid: eid, set: components });
    }
    this.inited = true;
  }

  send_command(command: Command, send_to_self: boolean = true) {
    // tags with 'p' are private, local entities, like menu or log wall
    if (command.tag !== "p") {
      this.services.broker.push(command);
    }
    if (send_to_self) {
      this.handle_command(command);
    }
  }

  handle_command(command: Command) {
    if (command.set !== undefined) {
      for (const [component_name, component_value] of Object.entries(
        command.set
      )) {
        this.services.store.set_component(
          command.eid,
          component_name,
          component_value
        );
      }
      this.services.bus.incoming_commands.next(command);
      return;
    }

    if (command.del !== undefined) {
      for (const component_name of command.del) {
        this.services.store.del_component(command.eid, component_name);
      }
      this.services.bus.incoming_commands.next(command);
      return;
    }

    if (command.ttl !== undefined) {
      for (const component_name of this.services.store.component_names(
        command.eid
      )) {
        this.handle_command({
          eid: command.eid,
          del: this.services.store.component_names(command.eid),
        });
        this.services.store.del_entity(command.eid);
      }
      return;
    }
  }

  add_system(system: ISystem) {
    this.systems.push(system);
  }

  get_grip(hand: "left" | "right") {
    const sys = this.systems.find((sys) => sys.name === "xr") as SystemXR;
    return sys.get_grip(hand);
  }

  // public apis for phx-* events to trigger

  entered() {
    this.services.bus.entered_space.next(true);
  }

  toggle_mic() {
    this.services.webrtc.toggle_mic();
  }

  toggle_log_wall() {
    const sys = this.systems.find((s) => s.name === "logger") as SystemLogger;
    sys.toggle_log_wall();
  }

  mount_xrs_hooks(hook: XRSHook) {
    window.addEventListener("dispatch_xrs", (ev) => {
      const method = ev["detail"].method;
      if (this[method]) {
        this[method]();
      } else {
        console.error("no method", method, "on xrs");
      }
    });

    // subscriptions to xrs bus events to effect the menu state

    this.services.bus.entered_space.subscribe(() => {
      hook.pushEvent("space_entered", {});
    });

    this.services.bus.mic_toggled.subscribe(() => {
      hook.pushEvent("mic_toggled", {});
    });
  }
}
