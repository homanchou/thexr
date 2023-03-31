import { filter } from "rxjs/internal/operators/filter";
import { map } from "rxjs/internal/operators/map";
import { Subject } from "rxjs/internal/Subject";
import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { Command, XRS } from "../xrs";

export type PosRot = {
  pos: number[];
  rot: number[];
};

export class ServiceBus {
  public xrs: XRS;
  public incoming_commands = new Subject<Command>();
  public head_movement = new Subject<PosRot>();
  // left movement, right movement
  public entered_space = new Subject<boolean>();

  public init(xrs: XRS) {
    this.xrs = xrs;
  }

  on_set(set_components: string[], and_has_components: string[] = []) {
    if (set_components.length === 0) {
      throw new Error("at least one component name is required");
    }
    let component_matcher = this.incoming_commands.pipe(
      filter((cmd) => cmd.set !== undefined),
      filter((cmd) =>
        set_components.every(
          (component_name) => cmd.set![component_name] !== undefined
        )
      )
    );

    if (and_has_components.length > 0) {
      return component_matcher.pipe(
        map((cmd) => ({
          stored_components: this.xrs.services.store.component_names(cmd.eid),
          cmd,
        })),
        filter(({ stored_components, cmd }) =>
          and_has_components.every((el) => stored_components.includes(el))
        ),
        map(({ stored_components, cmd }) => cmd)
      );
    } else {
      return component_matcher;
    }
  }

  on_del(del_components: string[], and_has_components: string[] = []) {
    if (del_components.length === 0) {
      throw new Error("at least one component name is required");
    }
    let component_matcher = this.incoming_commands.pipe(
      filter((cmd) => cmd.del !== undefined),
      filter((cmd) =>
        del_components.every((component_name) =>
          cmd.del?.includes(component_name)
        )
      )
    );

    if (and_has_components.length > 0) {
      return component_matcher.pipe(
        map((cmd) => ({
          stored_components: this.xrs.services.store.component_names(cmd.eid),
          cmd,
        })),
        filter(({ stored_components, cmd }) =>
          and_has_components.every((el) => stored_components.includes(el))
        ),
        map(({ stored_components, cmd }) => cmd)
      );
    } else {
      return component_matcher;
    }
  }
}
