"""
Gemini Adapter - Cliente para Google Gemini API
Abstrae la comunicacion con Gemini 3 Flash para el pipeline GO-ESP-01
"""

import json
import os
import time
from typing import Any, Dict, Optional
from dataclasses import dataclass
from enum import Enum

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class ThinkingLevel(Enum):
    """Niveles de razonamiento de Gemini 3"""
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class LLMResponse:
    """Respuesta estandarizada del LLM"""
    success: bool
    content: Optional[Dict[str, Any]]
    raw_text: Optional[str]
    error: Optional[str]
    usage: Optional[Dict[str, int]]
    latency_ms: int
    model_id: str
    thinking_level: str


class GeminiAdapter:
    """
    Adaptador para Google Gemini API.
    Soporta structured output y thinking levels configurables.
    """

    # Modelos que soportan thinking_level (Gemini 3+)
    THINKING_SUPPORTED_MODELS = [
        "gemini-3",
        "gemini-2.5",
    ]

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash",
        default_thinking_level: ThinkingLevel = ThinkingLevel.LOW
    ):
        """
        Inicializa el adaptador de Gemini.

        Args:
            api_key: API key de Google. Si no se proporciona, usa GOOGLE_API_KEY
            model: ID del modelo a usar
            default_thinking_level: Nivel de razonamiento por defecto
        """
        if not GENAI_AVAILABLE:
            raise ImportError(
                "google-generativeai no esta instalado. "
                "Ejecuta: pip install google-generativeai>=1.51.0"
            )

        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "API key no proporcionada. "
                "Usa GOOGLE_API_KEY o pasa api_key al constructor."
            )

        self.model = model
        self.default_thinking_level = default_thinking_level
        self.client = genai.Client(api_key=self.api_key)

    def generate(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        thinking_level: Optional[ThinkingLevel] = None,
        temperature: float = 1.0,
        max_retries: int = 3,
        retry_delay: float = 2.0
    ) -> LLMResponse:
        """
        Genera contenido usando Gemini.

        Args:
            prompt: El prompt a enviar
            schema: JSON Schema para structured output (opcional)
            thinking_level: Nivel de razonamiento (opcional, usa default si no se especifica)
            temperature: Temperatura de generacion (default 1.0 recomendado por Google)
            max_retries: Numero maximo de reintentos en caso de error
            retry_delay: Delay base entre reintentos (se multiplica exponencialmente)

        Returns:
            LLMResponse con el resultado
        """
        level = thinking_level or self.default_thinking_level
        start_time = time.time()

        for attempt in range(max_retries):
            try:
                # Construir configuracion
                config_params = {
                    "temperature": temperature,
                }

                # Agregar thinking config solo si el modelo lo soporta (Gemini 3+)
                if self._supports_thinking():
                    config_params["thinking_config"] = types.ThinkingConfig(
                        thinking_level=level.value
                    )

                # Agregar structured output si hay schema
                if schema:
                    config_params["response_mime_type"] = "application/json"
                    config_params["response_schema"] = schema

                config = types.GenerateContentConfig(**config_params)

                # Llamar a la API
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config
                )

                latency_ms = int((time.time() - start_time) * 1000)

                # Parsear respuesta
                raw_text = response.text
                content = None

                if schema and raw_text:
                    try:
                        content = json.loads(raw_text)
                    except json.JSONDecodeError as e:
                        return LLMResponse(
                            success=False,
                            content=None,
                            raw_text=raw_text,
                            error=f"Error parseando JSON: {str(e)}",
                            usage=self._extract_usage(response),
                            latency_ms=latency_ms,
                            model_id=self.model,
                            thinking_level=level.value
                        )
                else:
                    content = {"text": raw_text}

                return LLMResponse(
                    success=True,
                    content=content,
                    raw_text=raw_text,
                    error=None,
                    usage=self._extract_usage(response),
                    latency_ms=latency_ms,
                    model_id=self.model,
                    thinking_level=level.value
                )

            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2 ** attempt))
                    continue

                latency_ms = int((time.time() - start_time) * 1000)
                return LLMResponse(
                    success=False,
                    content=None,
                    raw_text=None,
                    error=str(e),
                    usage=None,
                    latency_ms=latency_ms,
                    model_id=self.model,
                    thinking_level=level.value
                )

    def _supports_thinking(self) -> bool:
        """Verifica si el modelo actual soporta thinking_level."""
        model_lower = self.model.lower()
        return any(prefix in model_lower for prefix in self.THINKING_SUPPORTED_MODELS)

    def _extract_usage(self, response) -> Optional[Dict[str, int]]:
        """Extrae informacion de uso de tokens de la respuesta."""
        try:
            if hasattr(response, 'usage_metadata'):
                metadata = response.usage_metadata
                return {
                    "input_tokens": getattr(metadata, 'prompt_token_count', 0),
                    "output_tokens": getattr(metadata, 'candidates_token_count', 0),
                    "total_tokens": getattr(metadata, 'total_token_count', 0)
                }
        except Exception:
            pass
        return None

    def estimate_cost(self, usage: Dict[str, int]) -> float:
        """
        Estima el costo en USD basado en el uso de tokens.
        Precios de Gemini 3 Flash: $0.50/1M input, $3.00/1M output
        """
        if not usage:
            return 0.0

        input_cost = (usage.get("input_tokens", 0) / 1_000_000) * 0.50
        output_cost = (usage.get("output_tokens", 0) / 1_000_000) * 3.00

        return round(input_cost + output_cost, 6)


# Singleton para uso global (opcional)
_default_adapter: Optional[GeminiAdapter] = None


def get_adapter(
    api_key: Optional[str] = None,
    model: str = "gemini-2.0-flash"
) -> GeminiAdapter:
    """
    Obtiene o crea un adaptador de Gemini (singleton pattern).

    Args:
        api_key: API key (opcional, usa env var si no se proporciona)
        model: ID del modelo

    Returns:
        GeminiAdapter configurado
    """
    global _default_adapter

    if _default_adapter is None:
        _default_adapter = GeminiAdapter(api_key=api_key, model=model)

    return _default_adapter
