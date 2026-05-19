from abc import ABC, abstractmethod
from typing import AsyncIterator


class ILLMService(ABC):

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Gọi LLM, trả về full response"""
        ...

    @abstractmethod
    async def stream(self, prompt: str) -> AsyncIterator[str]:
        """Gọi LLM, stream từng token"""
        ...