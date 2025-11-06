class ChatBot:
    def __init__(self):
        self.name = "Tril"
    
    def generate_response(self, user_input):
        """
        Generate a response based on the user input.
        """
        # Simple response logic - can be expanded later
        if "hello" in user_input.lower():
            return f"Hello! I'm {self.name}. How can I help you today?"
        elif "how are you" in user_input.lower():
            return "I'm doing great, thank you for asking!"
        elif "bye" in user_input.lower():
            return "Goodbye! Have a great day!"
        else:
            return "I'm still learning. Could you try asking something else?"