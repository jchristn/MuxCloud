"""A minimal in-memory to-do list."""


class TodoList:
    def __init__(self):
        self.items = []

    def add(self, title):
        self.items.append({"title": title, "done": False})
        return len(self.items) - 1

    def complete(self, index):
        self.items[index]["done"] = True

    def pending(self):
        return [item["title"] for item in self.items if not item["done"]]
