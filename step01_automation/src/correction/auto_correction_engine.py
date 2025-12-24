"""
Motor de Autocorrección - GO-ESP-01
Re-prompts dirigidos para corregir errores de validación
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
from copy import deepcopy

# Configurar path para importaciones
_src_dir = Path(__file__).parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from adapters.gemini_adapter import GeminiAdapter, ThinkingLevel, LLMResponse
from validators.deterministic_validators import ValidationResult, count_words_spanish


@dataclass
class CorrectionResult:
    """Resultado de una corrección"""
    success: bool
    corrected_artifact: Optional[Dict[str, Any]]
    original_artifact: Dict[str, Any]
    validation_error: ValidationResult
    error_message: Optional[str] = None
    llm_response: Optional[LLMResponse] = None
    attempt_number: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)


class AutoCorrectionEngine:
    """
    Motor de autocorrección para artefactos GO-ESP-01.

    Responsabilidades:
    - Recibir resultado de validación fallida
    - Generar re-prompt dirigido (NO regeneración total)
    - Controlar contador de intentos automáticos
    - Decidir si escalar a QA o reintentar
    """

    # Schemas parciales para correcciones
    NAMES_SCHEMA = {
        "type": "object",
        "properties": {
            "nombres": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 3,
                "maxItems": 3
            }
        },
        "required": ["nombres"]
    }

    OBJECTIVES_SCHEMA = {
        "type": "object",
        "properties": {
            "objetivos": {
                "type": "array",
                "items": {"type": "string"},
                "minItems": 3,
                "maxItems": 6
            }
        },
        "required": ["objetivos"]
    }

    DESCRIPTION_SCHEMA = {
        "type": "object",
        "properties": {
            "descripcion": {
                "type": "object",
                "properties": {
                    "texto": {"type": "string"},
                    "publico_objetivo": {"type": "string"},
                    "beneficios": {"type": "string"},
                    "estructura_general": {"type": "string"},
                    "diferenciador": {"type": "string"}
                },
                "required": ["texto", "publico_objetivo", "beneficios",
                            "estructura_general", "diferenciador"]
            }
        },
        "required": ["descripcion"]
    }

    def __init__(
        self,
        adapter: Optional[GeminiAdapter] = None,
        api_key: Optional[str] = None,
        max_retries: int = 3,
        prompts_dir: Optional[Path] = None
    ):
        """
        Inicializa el motor de autocorrección.

        Args:
            adapter: Adaptador de Gemini
            api_key: API key de Gemini
            max_retries: Número máximo de reintentos
            prompts_dir: Directorio de templates de corrección
        """
        self.adapter = adapter or GeminiAdapter(api_key=api_key)
        self.max_retries = max_retries
        self.prompts_dir = prompts_dir or (
            Path(__file__).parent.parent / "generators" / "prompts" / "correction_templates"
        )

    def correct(
        self,
        artifact: Dict[str, Any],
        validation_error: ValidationResult,
        attempt_number: int = 1
    ) -> CorrectionResult:
        """
        Corrige el artefacto basándose en el error de validación.

        Args:
            artifact: El artefacto a corregir
            validation_error: El error de validación a corregir
            attempt_number: Número de intento actual

        Returns:
            CorrectionResult con el artefacto corregido o error
        """
        error_code = validation_error.code

        # Determinar tipo de corrección
        if error_code in ["VAL_001", "VAL_001b"]:
            return self._correct_names(artifact, validation_error, attempt_number)
        elif error_code in ["VAL_002", "VAL_002b", "VAL_006"]:
            return self._correct_objectives(artifact, validation_error, attempt_number)
        elif error_code in ["VAL_003", "VAL_005"]:
            return self._correct_description(artifact, validation_error, attempt_number)
        elif error_code == "VAL_004":
            return self._correct_structure(artifact, validation_error, attempt_number)
        else:
            return CorrectionResult(
                success=False,
                corrected_artifact=None,
                original_artifact=artifact,
                validation_error=validation_error,
                error_message=f"Código de error no soportado: {error_code}",
                attempt_number=attempt_number
            )

    def _correct_names(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult,
        attempt: int
    ) -> CorrectionResult:
        """Corrige la sección de nombres."""
        prompt = self._build_names_prompt(artifact, error)

        response = self.adapter.generate(
            prompt=prompt,
            schema=self.NAMES_SCHEMA,
            thinking_level=ThinkingLevel.MINIMAL
        )

        if not response.success:
            return CorrectionResult(
                success=False,
                corrected_artifact=None,
                original_artifact=artifact,
                validation_error=error,
                error_message=response.error,
                llm_response=response,
                attempt_number=attempt
            )

        # Merge: solo actualizar nombres
        corrected = deepcopy(artifact)
        corrected["nombres"] = response.content.get("nombres", artifact.get("nombres", []))

        return CorrectionResult(
            success=True,
            corrected_artifact=corrected,
            original_artifact=artifact,
            validation_error=error,
            llm_response=response,
            attempt_number=attempt,
            metadata={
                "correction_type": "names",
                "latency_ms": response.latency_ms
            }
        )

    def _correct_objectives(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult,
        attempt: int
    ) -> CorrectionResult:
        """Corrige la sección de objetivos."""
        prompt = self._build_objectives_prompt(artifact, error)

        response = self.adapter.generate(
            prompt=prompt,
            schema=self.OBJECTIVES_SCHEMA,
            thinking_level=ThinkingLevel.MINIMAL
        )

        if not response.success:
            return CorrectionResult(
                success=False,
                corrected_artifact=None,
                original_artifact=artifact,
                validation_error=error,
                error_message=response.error,
                llm_response=response,
                attempt_number=attempt
            )

        # Merge: solo actualizar objetivos
        corrected = deepcopy(artifact)
        corrected["objetivos"] = response.content.get("objetivos", artifact.get("objetivos", []))

        return CorrectionResult(
            success=True,
            corrected_artifact=corrected,
            original_artifact=artifact,
            validation_error=error,
            llm_response=response,
            attempt_number=attempt,
            metadata={
                "correction_type": "objectives",
                "latency_ms": response.latency_ms
            }
        )

    def _correct_description(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult,
        attempt: int
    ) -> CorrectionResult:
        """Corrige la sección de descripción."""
        prompt = self._build_description_prompt(artifact, error)

        response = self.adapter.generate(
            prompt=prompt,
            schema=self.DESCRIPTION_SCHEMA,
            thinking_level=ThinkingLevel.LOW  # Más razonamiento para descripción
        )

        if not response.success:
            return CorrectionResult(
                success=False,
                corrected_artifact=None,
                original_artifact=artifact,
                validation_error=error,
                error_message=response.error,
                llm_response=response,
                attempt_number=attempt
            )

        # Merge: solo actualizar descripción
        corrected = deepcopy(artifact)
        corrected["descripcion"] = response.content.get(
            "descripcion",
            artifact.get("descripcion", {})
        )

        return CorrectionResult(
            success=True,
            corrected_artifact=corrected,
            original_artifact=artifact,
            validation_error=error,
            llm_response=response,
            attempt_number=attempt,
            metadata={
                "correction_type": "description",
                "latency_ms": response.latency_ms
            }
        )

    def _correct_structure(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult,
        attempt: int
    ) -> CorrectionResult:
        """
        Intenta corregir estructura faltante.
        Para errores de estructura, es mejor regenerar.
        """
        return CorrectionResult(
            success=False,
            corrected_artifact=None,
            original_artifact=artifact,
            validation_error=error,
            error_message="Error de estructura requiere regeneración completa",
            attempt_number=attempt
        )

    def _build_names_prompt(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult
    ) -> str:
        """Construye prompt para corrección de nombres."""
        descripcion = artifact.get("descripcion", {})
        descripcion_texto = descripcion.get("texto", "") if isinstance(descripcion, dict) else ""
        nombres_actuales = artifact.get("nombres", [])

        return f"""El artefacto actual tiene {error.observed} nombres, pero se requieren EXACTAMENTE 3.

CONTEXTO DEL CURSO:
{descripcion_texto}

NOMBRES ACTUALES (incorrectos):
{json.dumps(nombres_actuales, ensure_ascii=False, indent=2)}

INSTRUCCIONES:
- Genera EXACTAMENTE 3 nombres alternativos para el curso
- Cada nombre debe ser distinto, profesional y atractivo
- Los nombres deben reflejar el contenido del curso

Responde ÚNICAMENTE con un JSON válido:
{{"nombres": ["Nombre 1", "Nombre 2", "Nombre 3"]}}"""

    def _build_objectives_prompt(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult
    ) -> str:
        """Construye prompt para corrección de objetivos."""
        descripcion = artifact.get("descripcion", {})
        descripcion_texto = descripcion.get("texto", "") if isinstance(descripcion, dict) else ""
        objetivos_actuales = artifact.get("objetivos", [])

        # Determinar instrucción específica
        if error.code == "VAL_006":
            instruccion = "Reescribe los objetivos usando SOLO verbos observables: identificar, aplicar, demostrar, crear, analizar, diseñar, implementar, evaluar"
        elif isinstance(error.observed, int) and error.observed < 3:
            instruccion = f"Agrega objetivos hasta tener entre 3 y 6 (actualmente hay {error.observed})"
        elif isinstance(error.observed, int) and error.observed > 6:
            instruccion = f"Reduce a máximo 6 objetivos (actualmente hay {error.observed})"
        else:
            instruccion = "Ajusta los objetivos para tener entre 3 y 6, todos medibles y observables"

        return f"""PROBLEMA: {error.message}

CONTEXTO DEL CURSO:
{descripcion_texto}

OBJETIVOS ACTUALES:
{json.dumps(objetivos_actuales, ensure_ascii=False, indent=2)}

INSTRUCCIONES:
- {instruccion}
- Cada objetivo DEBE usar verbos observables: identificar, aplicar, demostrar, crear, analizar, diseñar, implementar, evaluar
- EVITA verbos vagos: entender, conocer, apreciar, saber, comprender
- Formato: "Al finalizar, el participante será capaz de [verbo] [resultado]"

Responde ÚNICAMENTE con un JSON válido:
{{"objetivos": ["Objetivo 1", "Objetivo 2", ...]}}"""

    def _build_description_prompt(
        self,
        artifact: Dict[str, Any],
        error: ValidationResult
    ) -> str:
        """Construye prompt para corrección de descripción."""
        descripcion = artifact.get("descripcion", {})
        descripcion_actual = descripcion.get("texto", "") if isinstance(descripcion, dict) else ""
        word_count = count_words_spanish(descripcion_actual)

        # Determinar instrucción
        if word_count < 150:
            instruccion = f"EXPANDE la descripción de {word_count} a 150-200 palabras"
        elif word_count > 200:
            instruccion = f"CONDENSA la descripción de {word_count} a 150-200 palabras"
        else:
            instruccion = "Asegúrate de incluir todos los elementos requeridos"

        return f"""PROBLEMA: {error.message}
Palabras actuales: {word_count}
Rango requerido: 150-200 palabras

DESCRIPCIÓN ACTUAL:
{descripcion_actual}

INSTRUCCIONES:
- {instruccion}
- La descripción DEBE incluir:
  1. Público objetivo
  2. Beneficios clave
  3. Estructura general
  4. Diferenciador único

Responde ÚNICAMENTE con un JSON válido:
{{
  "descripcion": {{
    "texto": "Descripción completa de 150-200 palabras...",
    "publico_objetivo": "...",
    "beneficios": "...",
    "estructura_general": "...",
    "diferenciador": "..."
  }}
}}"""

    def should_escalate(self, attempt_number: int) -> bool:
        """
        Determina si se debe escalar basado en el número de intentos.

        Args:
            attempt_number: Número de intento actual

        Returns:
            True si se debe escalar
        """
        return attempt_number >= self.max_retries


# Factory function
def create_correction_engine(
    api_key: Optional[str] = None,
    max_retries: int = 3
) -> AutoCorrectionEngine:
    """
    Crea un motor de corrección configurado.

    Args:
        api_key: API key de Gemini
        max_retries: Número máximo de reintentos

    Returns:
        AutoCorrectionEngine configurado
    """
    return AutoCorrectionEngine(api_key=api_key, max_retries=max_retries)
