defmodule ThexrWeb.SpaceChannel do
  use ThexrWeb, :channel
  alias ThexrWeb.Presence

  @impl true
  def join("space:" <> space_id, _payload, socket) do
    send(self(), :after_join)
    {:ok, %{"agora_app_id" => System.get_env("AGORA_APP_ID")}, assign(socket, space_id: space_id)}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("imoved", payload, socket) do
    ThexrWeb.Space.Manager.process_event(
      socket.assigns.space_pid,
      %{
        "eid" => socket.assigns.member_id,
        "set" => %{"avatar_pose" => payload},
        "tag" => "m"
      },
      self()
    )

    # TODO, cache this in ETS, and then broadcast at some desired interval

    # broadcast_from(socket, "stoc", %{eid: socket.assigns.member_id, set: %{avatar_pos: payload}})
    # add_location_to_ets(socket, payload)
    {:noreply, socket}
  end

  def handle_in("ctos", payload, socket) do
    # broadcast_from(socket, "stoc", payload)
    ThexrWeb.Space.Manager.process_event(socket.assigns.space_id, payload, self())
    {:noreply, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    case Thexr.Registry.whereis(:manager, socket.assigns.space_id) do
      nil ->
        # in dev if server rebooted and open tab reconnects, we should get redirected
        push(socket, "server_lost", %{})
        {:noreply, socket}

      manager_pid ->
        {:ok, _} =
          Presence.track(socket, socket.assigns.member_id, %{
            online_at: inspect(System.system_time(:second))
          })

        # push(socket, "presence_state", Presence.list(socket))
        socket = assign(socket, :space_pid, manager_pid)

        push(socket, "existing_members", ThexrWeb.Space.Manager.get_members(manager_pid))

        push(socket, "snapshot", ThexrWeb.Space.Manager.get_snapshot(socket.assigns.space_id))

        # test to see if we receive some kind of message when the genserver timesout
        Process.monitor(manager_pid)

        {:noreply, socket}
    end
  end

  # the moniter

  def handle_info(
        {:DOWN, _ref, :process, _pid, :shutdown},
        socket
      ) do
    push(socket, "server_lost", %{})

    {:stop, "server_timeout", socket}
  end

  def handle_info(
        {:DOWN, _ref, :process, _pid, _reason},
        socket
      ) do
    # ignore other kinds of crashes, supervisor will bring it back up
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    # tell the server the channel is disconnected
    # SpaceServer.process_event(
    #   socket.assigns.space_id,
    #   %{
    #     "eid" => socket.assigns.member_id,
    #     "ttl" => 0
    #   },
    #   self()
    # )

    push(socket, "server_lost", %{})
    {:noreply, socket}
  end

  # def add_location_to_ets(socket, payload) do
  #   :ets.insert(socket.assigns.ets_ref, {socket.assigns.member_id, payload})
  # end

  # def lookup_member_poses(socket) do
  #   :ets.tab2list(socket.assigns.ets_ref)
  #   |> Enum.reduce(%{}, fn {member_id, payload}, acc ->
  #     Map.put(acc, member_id, payload)
  #   end)
  # end
end
