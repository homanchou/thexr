defmodule Thexr.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start the Telemetry supervisor
      ThexrWeb.Telemetry,
      # Start the Ecto repository
      Thexr.Repo,
      # Start the PubSub system
      {Phoenix.PubSub, name: Thexr.PubSub},
      ThexrWeb.Presence,
      # Start Finch
      {Finch, name: Thexr.Finch},
      # Start the Endpoint (http/https)
      ThexrWeb.Endpoint,
      {Registry, keys: :unique, name: Thexr.Registry},
      ThexrWeb.Space.GrandSupervisor
      # Start a worker by calling: Thexr.Worker.start_link(arg)
      # {Thexr.Worker, arg}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Thexr.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ThexrWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
