"""
Step01 Generator - Generador de Artefacto Base
Transforma una idea central en el artefacto estructurado GO-ESP-01
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime

# Configurar path para importaciones
_src_dir = Path(__file__).parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from adapters.gemini_adapter import GeminiAdapter, ThinkingLevel, LLMResponse


@dataclass
class GenerationResult:
    """Resultado de la generación del artefacto"""
    success: bool
    artifact: Optional[Dict[str, Any]]
    error: Optional[str]
    llm_response: Optional[LLMResponse]
    metadata: Dict[str, Any] = field(default_factory=dict)


class Step01Generator:
    """
    Generador del artefacto base para GO-ESP-01.

    Responsabilidades:
    - Recibir idea central como input
    - Invocar Gemini con prompt estructurado
    - Retornar JSON con formato estándar
    """

    # Schema para structured output de Gemini
    ARTIFACT_SCHEMA = {
        "type": "object",
        "properties": {
            "nombres": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 3,
                "maxItems": 3
            },
            "objetivos": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 3,
                "maxItems": 6
            },
            "descripcion": {
                "type": "object",
                "properties": {
                    "texto": {"type": "string"},
                    "publico_objetivo": {"type": "string"},
                    "beneficios": {"type": "string"},
                    "estructura_general": {"type": "string"},
                    "diferenciador": {"type": "string"}
                },
                "required": [
                    "texto", "publico_objetivo", "beneficios",
                    "estructura_general", "diferenciador"
                ]
            }
        },
        "required": ["nombres", "objetivos", "descripcion"]
    }

    def __init__(
        self,
        adapter: Optional[GeminiAdapter] = None,
        api_key: Optional[str] = None,
        prompts_dir: Optional[Path] = None
    ):
        """
        Inicializa el generador.

        Args:
            adapter: Adaptador de Gemini (opcional, crea uno nuevo si no se proporciona)
            api_key: API key (opcional, usa env var)
            prompts_dir: Directorio de prompts (opcional, usa default)
        """
        self.adapter = adapter or GeminiAdapter(api_key=api_key)
        self.prompts_dir = prompts_dir or Path(__file__).parent / "prompts"

    def generate(
        self,
        idea_central: str,
        thinking_level: ThinkingLevel = ThinkingLevel.LOW,
        course_id: Optional[str] = None,
        operator_id: Optional[str] = None
    ) -> GenerationResult:
        """
        Genera el artefacto base desde una idea central.

        Args:
            idea_central: La idea central del curso (1 frase)
            thinking_level: Nivel de razonamiento de Gemini
            course_id: ID del curso (opcional)
            operator_id: ID del operador (opcional)

        Returns:
            GenerationResult con el artefacto o error
        """
        # Validar input
        if not idea_central or not idea_central.strip():
            return GenerationResult(
                success=False,
                artifact=None,
                error="La idea central no puede estar vacía",
                llm_response=None,
                metadata={"course_id": course_id, "operator_id": operator_id}
            )

        # Construir prompt
        prompt = self._build_prompt(idea_central.strip())

        # Llamar a Gemini
        response = self.adapter.generate(
            prompt=prompt,
            schema=self.ARTIFACT_SCHEMA,
            thinking_level=thinking_level
        )

        # Preparar metadata
        metadata = {
            "course_id": course_id,
            "operator_id": operator_id,
            "idea_central": idea_central,
            "thinking_level": thinking_level.value,
            "model_id": response.model_id,
            "generated_at": datetime.utcnow().isoformat(),
            "latency_ms": response.latency_ms,
            "usage": response.usage,
            "cost_estimate": self.adapter.estimate_cost(response.usage) if response.usage else None
        }

        if not response.success:
            return GenerationResult(
                success=False,
                artifact=None,
                error=response.error,
                llm_response=response,
                metadata=metadata
            )

        return GenerationResult(
            success=True,
            artifact=response.content,
            error=None,
            llm_response=response,
            metadata=metadata
        )

    def _build_prompt(self, idea_central: str) -> str:
        """
        Construye el prompt de generación.

        Args:
            idea_central: La idea central del curso

        Returns:
            Prompt completo para Gemini
        """
        # Intentar cargar template desde archivo
        template_path = self.prompts_dir / "initial_generation.md"

        if template_path.exists():
            template = template_path.read_text(encoding="utf-8")
            return template.replace("{idea_central}", idea_central)

        # Template inline como fallback
        return f"""Eres un diseñador instruccional experto. A partir de la siguiente idea central,
genera un artefacto estructurado para un curso.

IDEA CENTRAL: {idea_central}

REQUISITOS:
- Exactamente 3 nombres alternativos para el curso
- Entre 3 y 6 objetivos de aprendizaje (medibles y observables)
- Descripción de 150-200 palabras que incluya:
  - Público objetivo
  - Beneficios clave
  - Estructura general
  - Diferenciador único

Los objetivos deben usar verbos de acción observables (identificar, aplicar, demostrar, crear, analizar).
Evita verbos vagos como "entender", "conocer", "apreciar".

Responde ÚNICAMENTE con un JSON válido con la estructura especificada."""

    def get_schema(self) -> Dict[str, Any]:
        """Retorna el schema JSON del artefacto."""
        return self.ARTIFACT_SCHEMA.copy()


# Factory function para crear generador configurado
def create_generator(
    api_key: Optional[str] = None,
    model: str = "gemini-2.0-flash"
) -> Step01Generator:
    """
    Crea un generador configurado.

    Args:
        api_key: API key de Gemini (opcional, usa env var)
        model: ID del modelo

    Returns:
        Step01Generator configurado
    """
    adapter = GeminiAdapter(api_key=api_key, model=model)
    return Step01Generator(adapter=adapter)
