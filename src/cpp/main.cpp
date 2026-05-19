#include <iostream>
#include "include/nlohmann/json.hpp"

using json = nlohmann::json;

int main() {
    // Parsing a string literal
    auto data = json::parse(R"({"name": "Alice", "age": 30, "skills": ["C++", "Python"]})");

    // Seamless object access
    std::string name = data["name"];
    int age = data["age"];
    
    // Iterating over arrays
    for (const auto& skill : data["skills"]) {
        std::cout << skill << "\n";
    }
}