defmodule Thexr.WorldsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Thexr.Worlds` context.
  """

  @doc """
  Generate a space.
  """
  def space_fixture(attrs \\ %{}) do
    {:ok, space} =
      attrs
      |> Enum.into(%{
        id: Thexr.Utils.random_string(5),
        description: "some description",
        name: "some name"
      })
      |> Thexr.Worlds.create_space()

    space
  end
end
