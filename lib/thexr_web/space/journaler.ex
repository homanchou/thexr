defmodule ThexrWeb.Space.Journaler do
  use GenServer

  def start_link(space_id) do
    GenServer.start_link(__MODULE__, space_id)
  end

  def init(space_id) do
    send(self(), :after_init)
    {:ok, %{space_id: space_id, state: %{}}}
  end

  def handle_info(:after_init, state) do
    ThexrWeb.Space.Manager.save_pid(state.space_id, :journaler, self())
    {:noreply, state}
  end
end
