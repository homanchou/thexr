/* eslint-disable no-fallthrough */
import * as BABYLON from "babylonjs";
import * as GUI from "babylonjs-gui";
import type { XRS } from "../xrs";
import { ServiceBus } from "../services/bus";
import { cameraFrontFloorPosition } from "../utils/misc";

enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

const WALL_HEIGHT = 5;
const WALL_WIDTH = 20;
const WALL_EID = "logwall";

export class SystemLogger {
  public name = "logger";
  public scene: BABYLON.Scene;
  public bus: ServiceBus;
  public recentLogs: any[];
  public logLevel = LogLevel.INFO;
  public log_plane: BABYLON.AbstractMesh | null;
  public log_texture: GUI.AdvancedDynamicTexture | null;
  public textBlock: GUI.TextBlock | null;
  public xrs: XRS;

  init(xrs: XRS) {
    this.xrs = xrs;
    this.recentLogs = [];
    this.scene = xrs.services.engine.scene;
    this.bus = xrs.services.bus;

    this.overRideWindowConsole();

    this.trapWindowError();

    this.bus.on_set(["logwall"]).subscribe((cmd) => {
      this.create_log_gui();
    });
    this.bus.on_del(["logwall"]).subscribe(() => {
      this.remove_log_gui();
    });
  }

  trapWindowError() {
    window.onerror = function (message, source, lineno, colno, error) {
      console.log(error?.stack);

      try {
        // catch errors and display them to self
        const line = JSON.stringify(message);
        const size = 50;
        const numChunks = Math.ceil(line.length / size);
        const chunks = new Array(numChunks);

        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
          chunks[i] = line.substr(o, size);
        }
        chunks.forEach((chunk) => {
          this.signalHub.incoming.emit("msg", {
            system: "hud",
            data: { msg: chunk },
          });
        });
        // eslint-disable-next-line no-empty
      } catch (e) {
        console.log("error in the trap error itself", e);
      }
      if (window["Honeybadger"]) {
        window["Honeybadger"].notify(error);
      }
    };
  }

  remove_log_gui() {
    this.log_texture?.dispose();
    this.log_plane?.dispose();
    this.log_texture = null;
    this.log_plane = null;
    this.textBlock = null;
  }

  toggle_log_wall() {
    if (this.scene.getMeshByName(WALL_EID)) {
      this.xrs.send_command({
        eid: WALL_EID,
        ttl: 0,
        tag: "p", // private
      });
    } else {
      this.xrs.send_command({
        eid: WALL_EID,
        set: {
          logwall: {},
          holdable: {},
        },
        tag: "p", // private
      });
    }
  }

  create_log_gui() {
    // don't create twice
    if (this.scene.getMeshByName(WALL_EID)) {
      return;
    }
    this.log_plane = BABYLON.MeshBuilder.CreatePlane(
      WALL_EID,
      {
        height: WALL_HEIGHT,
        width: WALL_WIDTH,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene
    );
    this.log_plane.rotationQuaternion = new BABYLON.Quaternion();
    // this.log_plane.isPickable = false;
    this.log_plane.showBoundingBox = true;
    // this.log_plane.position.y = Math.ceil(WALL_HEIGHT / 2);
    // this.log_plane.position.z = 5;
    // this.log_plane.rotation.x = BABYLON.Angle.FromDegrees(-15).radians();

    const pos = cameraFrontFloorPosition(this.scene, 10);
    if (pos) {
      this.log_plane.position.fromArray(pos);
      this.log_plane.position.y += WALL_HEIGHT / 2;
    }

    this.log_plane.lookAt(
      this.scene.activeCamera?.position as BABYLON.Vector3,
      BABYLON.Angle.FromDegrees(180).radians()
    );

    this.log_texture = GUI.AdvancedDynamicTexture.CreateForMesh(
      this.log_plane,
      WALL_WIDTH * 100,
      WALL_HEIGHT * 100
    );
    this.log_texture.background = "#F0F0F0";

    this.textBlock = new GUI.TextBlock("logs", this.recentLogsAsText());
    this.textBlock.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.textBlock.textHorizontalAlignment =
      GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

    this.log_texture.addControl(this.textBlock);
  }

  overRideWindowConsole() {
    const old_console_debug = window.console.debug;
    const old_console_log = window.console.log;
    const old_console_info = window.console.info;
    const old_console_warn = window.console.warn;
    const old_console_error = window.console.error;
    // based on the logLevel, enhance the window console
    // with piggy-backing to capture logs for display on
    // a texture
    switch (this.logLevel) {
      case LogLevel.DEBUG:
        window.console.debug = (...args) => {
          const newArgs = [this.getTimestamp(), ...args];
          old_console_debug(...args);
          this.addLog(...newArgs);
        };
      case LogLevel.INFO:
        window.console.info = (...args) => {
          const newArgs = [this.getTimestamp(), ...args];
          old_console_info(...args);
          this.addLog(...newArgs);
        };
        window.console.log = (...args) => {
          const newArgs = [this.getTimestamp(), ...args];
          old_console_log(...args);
          this.addLog(...newArgs);
        };
      case LogLevel.WARN:
        window.console.warn = (...args) => {
          const newArgs = [this.getTimestamp(), ...args];
          old_console_warn(...args);
          this.addLog(...newArgs);
          this.flashError(...args);
        };
      case LogLevel.ERROR:
        window.console.error = (...args) => {
          const newArgs = [this.getTimestamp(), ...args];
          old_console_error(...args);
          this.addLog(...newArgs);
          this.flashError(...args);
        };
    }
  }

  addLog(...args) {
    this.recentLogs = [args, ...this.recentLogs.slice(0, 99)];
    if (this.textBlock) {
      this.textBlock.text = this.recentLogsAsText();
    }
    // this.signalHub.local.emit("new_log", {});
  }

  recentLogsAsText() {
    return this.recentLogs.map((row) => this.rowToString(row)).join("\n");
  }

  flashError(...args) {
    // this.signalHub.incoming.emit("msg", {
    //   system: "logger",
    //   data: { msg: this.rowToString(args) },
    // });
  }

  rowToString(row: any[]) {
    return row
      .map((col) => {
        if (typeof col === "string") {
          return col;
        } else {
          try {
            return JSON.stringify(col);
          } catch (e) {
            return `${e} - ${col}`;
          }
        }
      })
      .join(" ");
  }

  getTimestamp() {
    const d = new Date();
    return `${d.getMinutes()}:${d.getSeconds()}.${d.getMilliseconds()}`;
  }
}
