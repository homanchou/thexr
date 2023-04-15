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
    %Space{}
    |> Space.create_changeset(attrs)
    |> Repo.insert()
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

  def get_entity(snapshot_id, entity_id) do
    query =
      from e in Entity,
        select: e.components,
        where: e.snapshot_id == ^snapshot_id and e.id == ^entity_id

    Repo.one(query)
  end

  def delete_component(snapshot_id, entity_id, component_name) do
    case get_entity(snapshot_id, entity_id) do
      nil ->
        :not_found

      entity_components ->
        entity_components = Map.delete(entity_components, component_name)

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
          DeepMerge.deep_merge(old_components, components)
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

  def update_snapshot(
        snapshot_id,
        aggregate,
        components_to_delete,
        entitites_to_delete
      ) do
    Enum.each(aggregate, fn {entity_id, components} ->
      upsert_entity(snapshot_id, entity_id, components)
    end)

    Enum.each(components_to_delete, fn {entity_id, component_names} ->
      Enum.each(component_names, fn component_name ->
        delete_component(snapshot_id, entity_id, component_name)
      end)
    end)

    Enum.each(entitites_to_delete, fn entity_id ->
      delete_entity(snapshot_id, entity_id)
    end)
  end
end
