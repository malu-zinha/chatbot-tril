from src.chatbot import ChatBot

def main():
    chatbot = ChatBot()
    print(f"Welcome to {chatbot.name}! Type 'bye' to exit.")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'bye':
            print(f"{chatbot.name}: Goodbye!")
            break
            
        response = chatbot.generate_response(user_input)
        print(f"{chatbot.name}: {response}")

if __name__ == "__main__":
    main()