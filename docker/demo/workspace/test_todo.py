from todo import TodoList


def test_add_and_complete():
    todos = TodoList()
    first = todos.add("Write the release notes")
    todos.add("Book the demo room")
    todos.complete(first)
    assert todos.pending() == ["Book the demo room"]
