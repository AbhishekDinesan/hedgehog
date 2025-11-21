## debugging a linkedlist structure
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None
    
class LinkedList:
    def __init__(self):
        self.root = Node(0)
        self.head = self.root
        self.tail = self.root
    
    def add(self, val):
        new_node = Node(val)
        self.tail.next = new_node
        self.tail = new_node
    
    
    def remove(self, val):
        current = self.head
        while current.next:
            if current.next.val == val:
                current.next = current.next.next
                if current.next is None:  # Removed tail
                    self.tail = current
                return True
            current = current.next
        return False
    
if __name__ == "__main__":
    ll = LinkedList()
    
    print("Creating a new linked list...")
    print("\nAdding elements: 10, 20, 30, 40, 50")
    ll.add(10)
    ll.add(20)
    ll.add(30)
    ll.add(40)
    breakpoint()
    ll.add(50)
    
            

        



            