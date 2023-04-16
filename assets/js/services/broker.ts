import { Socket, Channel } from "phoenix";
import { Command, XRS } from "../xrs";

const INTERVAL = 100; // ms

export class ServiceBroker {
  public name = "broker";
  public xrs: XRS;
  socket: Socket;
  channel: Channel;

  init(xrs: XRS) {
    this.xrs = xrs;
  }

  push(command: Command) {
    if (this.channel) {
      this.channel.push("ctos", command);
    } else {
      console.warn("can't push", command, "channel not connected");
    }
  }

  create_channel() {
    // this.socket = new Socket("/socket", {
    //   params: { token: this.xrs.config.member_token },
    // });
    this.socket = window["liveSocket"];

    // When you connect, you'll often need to authenticate the client.
    // For example, imagine you have an authentication plug, `MyAuth`,
    // which authenticates the session and assigns a `:current_user`.
    // If the current user exists you can assign the user's token in
    // the connection for use in the layout.
    //
    // In your "lib/thexr_web/router.ex":
    //
    //     pipeline :browser do
    //       ...
    //       plug MyAuth
    //       plug :put_member_token
    //     end
    //
    //     defp put_member_token(conn, _) do
    //       if current_user = conn.assigns[:current_user] do
    //         token = Phoenix.Token.sign(conn, "user socket", current_user.id)
    //         assign(conn, :member_token, token)
    //       else
    //         conn
    //       end
    //     end
    //
    // Now you need to pass this token to JavaScript. You can do so
    // inside a script tag in "lib/thexr_web/templates/layout/app.html.heex":
    //
    //     <script>window.userToken = "<%= assigns[:member_token] %>";</script>
    //
    // You will need to verify the user token in the "connect/3" function
    // in "lib/thexr_web/channels/user_socket.ex":
    //
    //     def connect(%{"token" => token}, socket, _connect_info) do
    //       # max_age: 1209600 is equivalent to two weeks in seconds
    //       case Phoenix.Token.verify(socket, "user socket", token, max_age: 1_209_600) do
    //         {:ok, user_id} ->
    //           {:ok, assign(socket, :user, user_id)}
    //
    //         {:error, reason} ->
    //           :error
    //       end
    //     end
    //
    // Finally, connect to the socket:
    this.socket.connect();

    // Now that you are connected, you can join channels with a topic.
    // Let's assume you have a channel with a topic named `room` and the
    // subtopic is its id - in this case 42:
    this.channel = this.socket.channel("space:" + this.xrs.config.space_id, {});

    // for debugging
    this.channel.onMessage = (event, payload, _) => {
      if (!event.startsWith("phx_") && !event.startsWith("chan_")) {
        console.debug(event, payload);
      }
      return payload;
    };

    this.channel.on("stoc", (command) => {
      this.xrs.handle_command(command);
    });

    // only when we first connect, we'll set camera to previously sent location
    this.channel.on("existing_poses", (poses: { [member_id: string]: any }) => {
      for (const [member_id, pose] of Object.entries(poses)) {
        if (member_id === this.xrs.config.member_id) {
          // set camera to previous position
          this.xrs.services.engine.setActiveCameraToPosRot(pose.head);
        } else {
          this.xrs.handle_command({
            eid: member_id,
            set: { avatar_pose: pose },
          });
        }
      }
    });

    // continuously as folks move around
    this.channel.on("poses", (poses: { [member_id: string]: any }) => {
      for (const [member_id, pose] of Object.entries(poses)) {
        this.xrs.handle_command({ eid: member_id, set: { avatar_pose: pose } });
      }
    });

    this.channel.on(
      "presence_state",
      (payload: { [member_id: string]: any }) => {
        for (const member_id of Object.keys(payload)) {
          if (!this.xrs.services.store.state[member_id]) {
            this.xrs.handle_command({ eid: member_id, set: { avatar: "box" } });
          }
        }
      }
    );

    this.channel.on("snapshot", (snapshot: { [eid: string]: any }) => {
      // clear the stage
      this.xrs.services.engine.scene.lights.forEach((l) => l.dispose());
      this.xrs.services.engine.scene.meshes.forEach((m) => m.dispose());

      for (const [eid, components] of Object.entries(snapshot)) {
        this.xrs.handle_command({ eid: eid, set: components });
      }
    });

    this.channel.on("server_lost", () => {
      console.debug("server was lost");
      window.location.href = "/";
    });

    this.channel
      .join()
      .receive("ok", (resp) => {})
      .receive("error", (resp) => {});
  }
}
