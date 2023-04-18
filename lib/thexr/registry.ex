defmodule Thexr.Registry do
  # This module implements the via_tuple Module behavior
  # The :via option expects a module that exports register_name/2, unregister_name/1, whereis_name/1 and send/2.

  def via_tuple(scope, space_id) do
    {:via, __MODULE__, {scope, space_id}}
  end

  def whereis(scope, space_id) do
    via_tuple(scope, space_id) |> GenServer.whereis()
  end

  def register_name({scope, term} = thingy, pid) do
    case :syn.register(scope, term, pid) do
      :ok ->
        :yes

      _ ->
        :no
    end
  end

  def unregister_name({scope, term} = thingy) do
    :syn.unregister(scope, term)
  end

  def whereis_name({scope, term}) do
    case :syn.lookup(scope, term) do
      :undefined -> :undefined
      {pid, _} -> pid
    end
  end

  def send({scope, term}, value) do
    case :syn.lookup(scope, term) do
      :undefined -> {:badarg, {scope, term}}
      {pid, _} -> Kernel.send(pid, value)
    end
  end
end
