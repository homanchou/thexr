/* eslint-disable no-prototype-builtins */
import AgoraRTC from "agora-rtc-sdk-ng";
import type {
  ConnectionState,
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import { filter, take, Subject, scan } from "rxjs";
import type { XRS } from "../xrs";

export class ServiceWebRTC {
  public name = "webrtc";
  public xrs: XRS;
  public client: IAgoraRTCClient;
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

    // AgoraRTC.setLogLevel(0);
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.client.on("exception", (event) => {
      console.warn(event);
    });

    this.xrs.services.bus.entered_space.subscribe(async () => {
      // after user interacted with page, we can ask for devices
      // to get the permission prompt out of the way early
      const devices = await AgoraRTC.getDevices();
      console.debug("devices", devices);
      this.xrs.send_command({
        eid: this.xrs.config.member_id,
        set: { mic: this.my_mic_pref },
        tag: "m",
      });
    });

    // currently we get app id when we join channel
    this.xrs.services.bus.channel_connected
      .pipe(take(1))
      .subscribe((env_vars) => {
        this.options.appid = env_vars.agora_app_id;
      });

    this.client.on("user-published", (user, mediaType) => {
      this.subscribeRemoteUser(user, mediaType);
    });
    this.client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "video") {
        this.destroyVideoPlayerContainer(user);
      }
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

  start_connection_observer() {
    this.connection_observer.subscribe(async (val) => {
      if (val === "be_connected") {
        if (this.state.joined === false) {
          await this.join();
          this.state.joined = true;
        }
        // if we're unmuted and not yet publishing audio, we should publish
        if (!this.state.published_audio && !this.i_am_muted()) {
          await this.publishAudio();
          this.state.published_audio = true;
        }
        // if we're muted, but publishing audio, we should unpublish it
        else if (this.i_am_muted() && this.state.published_audio) {
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
    this.xrs.services.bus.on_del(["mic"]).subscribe((cmd) => {
      delete this.member_mics[cmd.eid];
      this.updateCountAndJoinOrUnjoin();
    });
  }

  i_am_muted() {
    return this.member_mics[this.xrs.config.member_id] !== "unmuted";
  }

  count_members_connected() {
    return Object.keys(this.member_mics).length;
  }

  count_mics_on() {
    return Object.values(this.member_mics).filter((v) => v === "unmuted")
      .length;
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
  }
  async leave() {
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
    this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
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

  async subscribeRemoteUser(
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
        user.audioTrack?.play();
      }
    } catch (e) {
      console.error(e);
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
