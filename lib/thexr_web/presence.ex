defmodule ThexrWeb.Presence do
  use Phoenix.Presence,
    otp_app: :thexr,
    pubsub_server: Thexr.PubSub

  def init(_opts) do
    # user-land state
    {:ok, %{}}
  end

  @doc """
  Presence is great for external clients, such as JavaScript applications,
  but it can also be used from an Elixir client process to keep track of presence changes
  as they happen on the server. This can be accomplished by implementing the optional init/1
   and handle_metas/4 callbacks on your presence module.
  """

  def handle_metas("space:" <> space_id, %{joins: joins, leaves: leaves}, _presences, state) do
    for {member_id, _} <- joins do
      ThexrWeb.Space.Manager.process_event(
        space_id,
        %{"eid" => member_id, "set" => %{"avatar" => "box"}},
        nil
      )
    end

    for {member_id, _} <- leaves do
      ThexrWeb.Space.Manager.process_event(
        space_id,
        %{"eid" => member_id, "del" => ["avatar"], "ttl" => 0},
        nil
      )
    end

    {:ok, state}
  end
end
