#include <iostream>
#include <string>

struct Node {
    int value;
    Node* next;
    
    Node(int val) : value(val), next(nullptr) {}
};

class LinkedList {
public:
    Node* head;
    Node* tail;
    
    LinkedList() : head(nullptr), tail(nullptr) {}
    
    void append(int value) {
        Node* newNode = new Node(value);
        
        if (!head) {
            head = newNode;
            tail = newNode;
        } else {
            tail->next = newNode;
            tail = newNode;
        }
    }
    
    void remove(int value) {
        if (!head) return;
        
        if (head->value == value) {
            Node* temp = head;
            head = head->next;
            delete temp;
            if (!head) tail = nullptr;
            return;
        }
        
        Node* current = head;
        while (current->next) {
            if (current->next->value == value) {
                Node* temp = current->next;
                current->next = current->next->next;
                if (!current->next) tail = current;
                delete temp;
                return;
            }
            current = current->next;
        }
    }
    
    void print() {
        Node* current = head;
        while (current) {
            std::cout << current->value << " -> ";
            current = current->next;
        }
        std::cout << "null" << std::endl;
    }
    
    ~LinkedList() {
        Node* current = head;
        while (current) {
            Node* temp = current;
            current = current->next;
            delete temp;
        }
    }
};

int main() {
    LinkedList list;
    
    std::cout << "Creating linked list..." << std::endl;
    list.append(10);
    list.append(20);
    list.append(30);
    list.append(40);
    
    std::cout << "List contents: ";
    list.print();
    
    // Set breakpoint here to visualize the structure
    int breakpoint_here = 0;
    
    list.append(50);
    list.print();
    
    return 0;
}

