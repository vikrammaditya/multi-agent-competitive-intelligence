from app.utils.llm import generate_completion

class BaseAgent:
    def __init__(self, name: str, role: str, system_prompt: str):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt

    def run(self, prompt: str, key_override: dict = None) -> str:
        """Executes the agent with the given prompt and system instructions."""
        return generate_completion(
            prompt=prompt, 
            system_instruction=self.system_prompt, 
            key_override=key_override
        )
