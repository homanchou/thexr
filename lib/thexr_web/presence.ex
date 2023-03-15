defmodule ThexrWeb.Presence do
  use Phoenix.Presence,
    otp_app: :thexr,
    pubsub_server: Thexr.PubSub

  def init(_opts) do
    # user-land state
    {:ok, %{}}
  end

  def handle_metas("space:" <> space_id, %{joins: joins, leaves: leaves}, _presences, state) do
    for {member_id, _} <- joins do
      ThexrWeb.SpaceServer.process_event(
        space_id,
        %{"eid" => member_id, "set" => %{"avatar" => "box"}},
        nil
      )
    end

    for {member_id, _} <- leaves do
      ThexrWeb.SpaceServer.process_event(
        space_id,
        %{"eid" => member_id, "ttl" => 0},
        nil
      )
    end

    {:ok, state}
  end
end
