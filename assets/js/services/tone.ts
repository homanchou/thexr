import { XRS } from "../xrs";
import * as Tone from "tone";

export class ServiceTone {
  name = "tone";
  public xrs: XRS;
  public init(xrs: XRS) {
    this.xrs = xrs;

    xrs.services.bus.entered_space.subscribe(() => {
      this.start();
    });
  }

  start() {
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease(60, "16n");
  }
}
