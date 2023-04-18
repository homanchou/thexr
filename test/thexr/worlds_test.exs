defmodule Thexr.WorldsTest do
  use Thexr.DataCase

  alias Thexr.Worlds

  describe "spaces" do
    alias Thexr.Worlds.Space

    import Thexr.WorldsFixtures

    @invalid_attrs %{description: nil, name: nil}

    test "list_spaces/0 returns all spaces" do
      space = space_fixture()
      assert Worlds.list_spaces() == [space]
    end

    test "get_space!/1 returns the space with given id" do
      space = space_fixture()
      assert Worlds.get_space!(space.id) == space
    end

    test "create_space/1 with valid data creates a space" do
      valid_attrs = %{description: "some description", name: "some name"}

      assert {:ok, %Space{} = space} = Worlds.create_space(valid_attrs)
      assert space.description == "some description"
      assert space.name == "some name"
    end

    test "update_space/2 with valid data updates the space" do
      space = space_fixture()
      update_attrs = %{description: "some updated description", name: "some updated name"}

      assert {:ok, %Space{} = space} = Worlds.update_space(space, update_attrs)
      assert space.description == "some updated description"
      assert space.name == "some updated name"
    end

    test "update_space/2 with invalid data returns error changeset" do
      space = space_fixture()
      assert {:error, %Ecto.Changeset{}} = Worlds.update_space(space, @invalid_attrs)
      assert space == Worlds.get_space!(space.id)
    end

    test "delete_space/1 deletes the space" do
      space = space_fixture()
      assert {:ok, %Space{}} = Worlds.delete_space(space)
      assert_raise Ecto.NoResultsError, fn -> Worlds.get_space!(space.id) end
    end

    test "change_space/1 returns a space changeset" do
      space = space_fixture()
      assert %Ecto.Changeset{} = Worlds.change_space(space)
    end

    test "update snapshot" do
      cmd = %{
        "eid" => "B9hex",
        "set" => %{
          "avatar_pose" => %{
            "head" => %{
              "pos" => [1, 2, 3],
              "rot" => [-0.05062, 0.02385, 0.0012, 0.99843]
            }
          }
        },
        "tag" => "m"
      }

      new_state = Thexr.Worlds.update_snapshot(%{}, [cmd])

      assert %{
               "B9hex" => %{
                 "avatar_pose" => %{
                   "head" => %{"pos" => [1, 2, 3], "rot" => [-0.05062, 0.02385, 0.0012, 0.99843]}
                 }
               }
             } = new_state

      cmd2 = %{
        "eid" => "B9hex",
        "set" => %{
          "avatar_pose" => %{
            "head" => %{
              "pos" => [4, 5, 6],
              "rot" => [-0.1, 0.02, 0.03, 0.4]
            }
          }
        },
        "tag" => "m"
      }

      new_state2 = Thexr.Worlds.update_snapshot(new_state, [cmd2])

      assert %{
               "B9hex" => %{
                 "avatar_pose" => %{
                   "head" => %{"pos" => [4, 5, 6], "rot" => [-0.1, 0.02, 0.03, 0.4]}
                 }
               }
             } = new_state2
    end
  end
end
