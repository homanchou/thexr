/* eslint-disable no-prototype-builtins */
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  SpatialAudioExtension,
  SpatialAudioProcessor,
} from "agora-extension-spatial-audio";

import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { take, Subject, throttleTime, Subscription } from "rxjs";
import type { XRS } from "../xrs";
import { Vector3 } from "babylonjs";

interface IRemoteUser extends IAgoraRTCRemoteUser {
  processor?: SpatialAudioProcessor;
}

type Array3 = [number, number, number];

export class ServiceWebRTC {
  public subscriptions: Subscription[] = [];
  public name = "webrtc";
  public xrs: XRS;
  public client: IAgoraRTCClient;
  public spatial_extension: SpatialAudioExtension;
  public connection_observer = new Subject<
    "be_connected" | "be_disconnected"
  >();
  public my_mic_pref: "muted" | "unmuted";
  public state = { joined: false, published_audio: false };
  // keep track of how many users in total have
  // we need at least 2 (so someone can hear)
  // and at least 1 of them has to be unmuted
  public member_mics: { [member_id: string]: "muted" | "unmuted" } = {};
  public localTracks: {
    videoTrack: ILocalVideoTrack | null;
    audioTrack: IMicrophoneAudioTrack | null;
  } = {
    videoTrack: null,
    audioTrack: null,
  };
  public remoteUsers: { [uid: string]: IRemoteUser } = {};
  // Agora client options
  options: any = {
    appid: null,
    channel: null,
    uid: null,
    token: null,
  };

  init(xrs: XRS) {
    this.xrs = xrs;
    this.options.channel = this.xrs.config.space_id;
    this.options.uid = this.xrs.config.member_id;
    // we are muted by default until we start publishing
    // TODO, save this into a user preference, session storage
    this.my_mic_pref = "muted";

    AgoraRTC.setLogLevel(0);

    this.spatial_extension = new SpatialAudioExtension({
      assetsPath: "/external",
    });

    AgoraRTC.registerExtensions([this.spatial_extension]);
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.client.on("exception", (event) => {
      console.warn(event);
    });

    this.xrs.services.bus.entered_space.subscribe(async () => {
      // after user interacted with page, we can ask for devices
      // to get the permission prompt out of the way early
      const devices = await AgoraRTC.getDevices();
    });

    // currently we get app id when we join channel
    this.xrs.services.bus.channel_connected
      .pipe(take(1))
      .subscribe((env_vars) => {
        this.options.appid = env_vars.agora_app_id;
        this.xrs.send_command({
          eid: this.xrs.config.member_id,
          set: { mic: this.my_mic_pref },
          tag: "m",
        });
      });

    this.client.on("user-published", (user, mediaType) => {
      this.remote_user_published_handler(user, mediaType);
    });
    this.client.on("user-unpublished", (user, mediaType) => {
      this.remote_user_unpublished_handler(user, mediaType);
    });

    AgoraRTC.enableLogUpload();

    // create a single event loop for connecting and disconnecting
    // - this joins or unjoins the agora session
    // - and will publish or unpublish audio depending on our mic mute/unmute status
    this.start_connection_observer();

    // monitor total connected mics to be efficient with connecting to agora
    // no sense joining if only one person or if everyone is on mute
    this.monitor_mics();
  }

  toggle_mic() {
    this.my_mic_pref = this.my_mic_pref === "muted" ? "unmuted" : "muted";

    this.xrs.send_command({
      eid: this.xrs.config.member_id,
      set: { mic: this.my_mic_pref },
      tag: "m",
    });
    this.xrs.services.bus.mic_toggled.next(this.my_mic_pref);
  }

  start_connection_observer() {
    this.connection_observer.subscribe(async (val) => {
      if (val === "be_connected") {
        if (this.state.joined === false) {
          await this.join();
          this.state.joined = true;
        }
        // if we're unmuted and not yet publishing audio, we should publish
        if (!this.state.published_audio && this.my_mic_pref !== "muted") {
          await this.publishAudio();
          this.state.published_audio = true;
        }
        // if we're muted, but publishing audio, we should unpublish it
        else if (this.my_mic_pref === "muted" && this.state.published_audio) {
          await this.unpublishAudio();
          this.state.published_audio = false;
        }
      } else if (val === "be_disconnected") {
        if (this.state.joined === true) {
          await this.leave();
          this.state.published_audio = false;
          this.state.joined = false;
        }
      }
    });
  }

  monitor_mics() {
    this.xrs.services.bus.on_set(["mic"]).subscribe((cmd) => {
      this.member_mics[cmd.eid] = cmd.set?.mic;
      this.updateCountAndJoinOrUnjoin();
    });
    // when people leave
    this.xrs.services.bus.on_del(["mic"]).subscribe((cmd) => {
      delete this.member_mics[cmd.eid];
      this.updateCountAndJoinOrUnjoin();
    });
  }

  count_members_connected() {
    return Object.keys(this.member_mics).length;
  }

  count_mics_on() {
    return Object.values(this.member_mics).filter((v) => v === "unmuted")
      .length;
  }

  // this updates your local perception of fixed audio sources
  // but doesn't broadcast your new position to other clients
  update_self_position_in_extension() {
    const cam = this.xrs.services.engine.scene.activeCamera;
    const forward = cam?.getForwardRay(1).direction.asArray() as Array3;
    const right = cam
      ?.getDirection(BABYLON.Vector3.Right() as unknown as Vector3)
      .asArray() as Array3;
    const position = cam?.position.asArray() as Array3;

    this.spatial_extension.updateSelfPosition(
      position,
      forward,
      right,
      [0, 1, 0]
    );
  }

  updateCountAndJoinOrUnjoin() {
    if (this.count_members_connected() >= 2 && this.count_mics_on() >= 1) {
      this.connection_observer.next("be_connected");
    } else {
      this.connection_observer.next("be_disconnected");
    }
  }

  async join() {
    this.options.uid = await this.client.join(
      this.options.appid,
      this.options.channel,
      this.options.token,
      this.options.uid
    );

    const sub1 = this.xrs.services.bus.head_movement
      .pipe(throttleTime(100))
      .subscribe(() => {
        this.update_self_position_in_extension();
      });

    const sub2 = this.xrs.services.bus
      .on_set(["avatar_pose"])
      .subscribe((cmd) => {
        const other_player = this.remoteUsers[cmd.eid];
        if (other_player) {
          other_player.processor?.updatePlayerPositionInfo({
            position: cmd.set?.avatar_pose?.head?.pos as Array3,
            forward: [0, 0, 1],
          });
        }
      });

    this.subscriptions.push(sub1);
    this.subscriptions.push(sub2);

    // in case we don't move our head when we first join
    this.update_self_position_in_extension();
  }

  async leave() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.length = 0;

    this.localTracks.audioTrack?.stop();
    this.localTracks.audioTrack?.close();
    this.localTracks.videoTrack?.stop();
    this.localTracks.videoTrack?.close();

    this.localTracks = {
      videoTrack: null,
      audioTrack: null,
    };

    await this.client.leave();
  }

  async publishAudio() {
    this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      AEC: true,
      AGC: true,
      ANS: true,
    });
    this.client.publish(this.localTracks.audioTrack);
  }

  async unpublishAudio() {
    if (!this.localTracks.audioTrack) {
      return;
    }
    await this.client.unpublish([this.localTracks.audioTrack]);
    this.localTracks.audioTrack.stop();
    this.localTracks.audioTrack.close();
    this.localTracks.audioTrack = null;
  }

  async remote_user_published_handler(
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) {
    // subscribe to a remote user
    try {
      await this.client.subscribe(user, mediaType);
      if (mediaType === "video") {
        // need to create a video container
        const playerContainer = this.createVideoPlayerContainer(user);
        user.videoTrack?.play(playerContainer);
      }
      if (mediaType === "audio") {
        const processor = this.spatial_extension.createProcessor();
        user["processor"] = processor;

        user.audioTrack
          ?.pipe(processor)
          .pipe(user.audioTrack?.processorDestination);
        user.audioTrack?.play();

        this.remoteUsers[user.uid] = user;
      }
    } catch (e) {
      console.error(e);
    }
  }

  remote_user_unpublished_handler(
    user: IAgoraRTCRemoteUser,
    mediaType: "audio" | "video"
  ) {
    if (mediaType === "audio") {
      this.remoteUsers[user.uid].processor?.removeRemotePosition();
      delete this.remoteUsers[user.uid];
    }
    if (mediaType === "video") {
      this.destroyVideoPlayerContainer(user);
    }
  }

  destroyVideoPlayerContainer(otherMember: IAgoraRTCRemoteUser) {
    const theID = "agoraVideo_" + otherMember.uid;
    const playerContainer = document.getElementById(theID);
    if (playerContainer) {
      playerContainer.remove();
    }
  }

  createVideoPlayerContainer(otherMember: IAgoraRTCRemoteUser) {
    // in case it exists (some defensive programming)
    this.destroyVideoPlayerContainer(otherMember);

    const playerContainer = document.createElement("div");
    // Specify the ID of the DIV container. You can use the `uid` of the remote user.
    playerContainer.id = "agoraVideo_" + otherMember.uid.toString();
    playerContainer.style.width = "640px";
    playerContainer.style.height = "480px";

    document.body.append(playerContainer);

    return playerContainer;
  }
}
