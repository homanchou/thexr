defmodule Thexr.Worlds do
  @moduledoc """
  The Worlds context.
  """

  import Ecto.Query, warn: false
  alias Thexr.Repo

  alias Thexr.Worlds.Space
  alias Thexr.Worlds.Entity

  @doc """
  Returns the list of spaces.

  ## Examples

      iex> list_spaces()
      [%Space{}, ...]

  """
  def list_spaces do
    Repo.all(Space)
  end

  @doc """
  Gets a single space.

  Raises `Ecto.NoResultsError` if the Space does not exist.

  ## Examples

      iex> get_space!(123)
      %Space{}

      iex> get_space!(456)
      ** (Ecto.NoResultsError)

  """
  def get_space!(id), do: Repo.get!(Space, id)

  @doc """
  Creates a space.

  ## Examples

      iex> create_space(%{field: value})
      {:ok, %Space{}}

      iex> create_space(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_space(attrs \\ %{}) do
    {:ok, space} =
      %Space{}
      |> Space.create_changeset(attrs)
      |> Repo.insert()

    # create some basic primitives in the space
    ThexrWeb.Space.GrandSupervisor.start_space(space.id)
    pid = ThexrWeb.Space.Manager.get_pid(space.id)

    ThexrWeb.Space.Manager.process_event(
      pid,
      %{
        "eid" => "cylinder",
        "set" => %{"shape" => "cylinder", "pos" => [0, 2, 3], "color" => "#FF0000"}
      },
      nil
    )

    ThexrWeb.Space.Manager.process_event(
      pid,
      %{
        "eid" => "bx1",
        "set" => %{
          "shape" => "box",
          "shape_params" => %{"size" => 0.3},
          "pos" => [-1.5, 1.2, 0],
          "color" => "#FF00FF",
          "holdable" => %{}
        }
      },
      nil
    )

    ThexrWeb.Space.Manager.process_event(
      pid,
      %{
        "eid" => "bx2",
        "set" => %{
          "shape" => "box",
          "shape_params" => %{"size" => 0.4},
          "pos" => [1.5, 1.1, 0],
          "color" => "#0000FF",
          "holdable" => %{}
        }
      },
      nil
    )

    ThexrWeb.Space.Manager.process_event(
      pid,
      %{
        "eid" => "ground",
        "set" => %{
          "shape" => "ground",
          "shape_params" => %{"width" => 10, "height" => 10},
          "pos" => [0, 0, 0],
          "floor" => nil,
          "mat" => "grid"
        }
      },
      nil
    )

    ThexrWeb.Space.Manager.process_event(
      pid,
      %{
        "eid" => "light",
        "set" => %{"lighting" => "whatevs"}
      },
      nil
    )

    {:ok, space}
  end

  @doc """
  Updates a space.

  ## Examples

      iex> update_space(space, %{field: new_value})
      {:ok, %Space{}}

      iex> update_space(space, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_space(%Space{} = space, attrs) do
    space
    |> Space.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a space.

  ## Examples

      iex> delete_space(space)
      {:ok, %Space{}}

      iex> delete_space(space)
      {:error, %Ecto.Changeset{}}

  """
  def delete_space(%Space{} = space) do
    Repo.delete(space)
    delete_all_entities(space.id)
    ThexrWeb.Space.GrandSupervisor.stop_space(space.id)
    {:ok, space}
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking space changes.

  ## Examples

      iex> change_space(space)
      %Ecto.Changeset{data: %Space{}}

  """
  def change_space(%Space{} = space, attrs \\ %{}) do
    Space.changeset(space, attrs)
  end

  # entities

  def get_entities(snapshot_id) do
    query = from(e in Entity, select: {e.id, e.components}, where: e.snapshot_id == ^snapshot_id)
    Repo.all(query) |> Enum.into(%{})
  end

  def get_entity(snapshot_id, entity_id) do
    query =
      from e in Entity,
        select: e.components,
        where: e.snapshot_id == ^snapshot_id and e.id == ^entity_id

    Repo.one(query)
  end

  def delete_components(snapshot_id, entity_id, component_names) do
    case get_entity(snapshot_id, entity_id) do
      nil ->
        :not_found

      entity_components ->
        entity_components = Map.drop(entity_components, component_names)

        statement =
          from e in Entity,
            where: e.snapshot_id == ^snapshot_id and e.id == ^entity_id,
            update: [set: [components: ^entity_components]]

        Repo.update_all(statement, [])
    end
  end

  def upsert_entity(snapshot_id, entity_id, components) do
    new_components =
      case get_entity(snapshot_id, entity_id) do
        nil ->
          components

        old_components ->
          Map.merge(old_components, components)
      end

    Repo.insert(
      %Entity{
        snapshot_id: snapshot_id,
        id: entity_id,
        components: new_components
      },
      on_conflict: [set: [components: new_components]],
      conflict_target: [:snapshot_id, :id]
    )
  end

  def delete_entity(snapshot_id, entity_id) do
    query =
      from(e in Entity,
        where: e.snapshot_id == ^snapshot_id and e.id == ^entity_id
      )

    Repo.delete_all(query)
  end

  def delete_all_entities(snapshot_id) do
    query =
      from(e in Entity,
        where: e.snapshot_id == ^snapshot_id
      )

    Repo.delete_all(query)
  end

  def update_snapshot(aggregate, commands) when is_map(aggregate) do
    Enum.reduce(commands, aggregate, fn cmd, agg ->
      eid = cmd["eid"]

      case cmd do
        %{"ttl" => _} ->
          Map.delete(agg, eid)

        %{"set" => components} ->
          prev_components = Map.get(agg, eid, %{})
          merged_components = Map.merge(prev_components, components)
          Map.put(agg, eid, merged_components) |> IO.inspect(label: "final agg")

        %{"del" => component_names} ->
          prev_components = Map.get(agg, eid, %{})
          new_components = Map.drop(prev_components, component_names)
          Map.put(agg, eid, new_components)
      end
    end)
  end

  def update_snapshot(
        snapshot_id,
        commands
      ) do
    Enum.each(commands, fn cmd ->
      eid = cmd["eid"]

      case cmd do
        %{"ttl" => _} ->
          delete_entity(snapshot_id, eid)

        %{"set" => components} ->
          upsert_entity(snapshot_id, eid, components)

        %{"del" => component_names} ->
          delete_components(snapshot_id, eid, component_names)
      end
    end)
  end
end
