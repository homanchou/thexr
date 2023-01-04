defmodule Thexr.Worlds.Space do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  @foreign_key_type :string
  schema "spaces" do
    field :description, :string
    field :name, :string

    timestamps()
  end

  @doc false
  # updating an existing space
  def changeset(space, attrs) do
    space
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
  end

  @spec create_changeset(
          {map, map}
          | %{
              :__struct__ => atom | %{:__changeset__ => map, optional(any) => any},
              optional(atom) => any
            },
          :invalid | %{optional(:__struct__) => none, optional(atom | binary) => any}
        ) :: Ecto.Changeset.t()
  def create_changeset(space, attrs) do
    space
    |> cast(attrs, [:name, :description])
    |> validate_required([:name])
    |> put_change(:id, Thexr.Utils.random_string(5))
  end
end
