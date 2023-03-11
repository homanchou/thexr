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
  public entered_space = new Subject<boolean>();
  public presence_state = new Subject<{ [member_id: string]: any }>();
  public presence_diff = new Subject<{
    joins: { [member_id: string]: any };
    leaves: { [member_id: string]: any };
  }>();
  public member_moved = new Subject<{
    eid: string;
    head: { pos: number[]; rot: number[] };
  }>();
  public member_locations = new Subject<{
    [eid: string]: {
      head: { pos: number[]; rot: number[] };
    };
  }>();

  public init(xrs: XRS) {
    this.xrs = xrs;
  }

  on_set(has_components: string[], filter_func: any = null) {
    const component_matcher = this.incoming_commands.pipe(
      filter((cmd) => cmd.set !== undefined),
      map((cmd) => ({
        stored_components: this.xrs.services.store.component_names(cmd.eid),
        cmd,
      })),
      filter(({ stored_components, cmd }) =>
        has_components.every((el) => stored_components.includes(el))
      ),
      map(({ stored_components, cmd }) => cmd)
    );
    if (!filter_func) {
      return component_matcher;
    } else {
      return component_matcher.pipe(filter((cmd) => filter_func(cmd)));
    }
  }
}
