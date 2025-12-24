"""
Validador Semántico - GO-ESP-01
Evaluación de calidad semántica usando LLM-Critic
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

# Configurar path para importaciones
_src_dir = Path(__file__).parent.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from adapters.gemini_adapter import GeminiAdapter, ThinkingLevel, LLMResponse


@dataclass
class ObjectiveScore:
    """Score individual de un objetivo"""
    objective: str
    score: float
    feedback: str
    criteria_met: Dict[str, bool] = field(default_factory=dict)


@dataclass
class SemanticValidationResult:
    """Resultado de validación semántica"""
    passed: bool
    confidence: float
    rationale: str
    objective_scores: List[ObjectiveScore]
    llm_response: Optional[LLMResponse] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pass": self.passed,
            "confidence": self.confidence,
            "rationale": self.rationale,
            "objective_scores": [
                {
                    "objective": s.objective,
                    "score": s.score,
                    "feedback": s.feedback,
                    "criteria_met": s.criteria_met
                }
                for s in self.objective_scores
            ]
        }


class SemanticValidator:
    """
    Validador semántico usando LLM-Critic.

    Responsabilidades:
    - Evaluar calidad semántica de objetivos
    - Aplicar rúbrica de "medible/observable"
    - Retornar score de confianza y justificación
    """

    # Schema para structured output del critic
    EVALUATION_SCHEMA = {
        "type": "object",
        "properties": {
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
            },
            "rationale": {"type": "string"},
            "objective_scores": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "objective": {"type": "string"},
                        "score": {"type": "number"},
                        "feedback": {"type": "string"},
                        "criteria_met": {
                            "type": "object",
                            "properties": {
                                "observable_verb": {"type": "boolean"},
                                "verifiable_result": {"type": "boolean"},
                                "no_vagueness": {"type": "boolean"}
                            }
                        }
                    }
                }
            }
        },
        "required": ["confidence", "rationale", "objective_scores"]
    }

    # Verbos prohibidos (vagos, no medibles)
    FORBIDDEN_VERBS = [
        "entender", "conocer", "apreciar", "saber",
        "comprender", "aprender", "valorar", "reconocer"
    ]

    # Verbos recomendados (observables)
    RECOMMENDED_VERBS = [
        "identificar", "aplicar", "demostrar", "crear",
        "analizar", "diseñar", "implementar", "evaluar",
        "desarrollar", "construir", "elaborar", "ejecutar",
        "formular", "clasificar", "comparar", "contrastar"
    ]

    def __init__(
        self,
        adapter: Optional[GeminiAdapter] = None,
        api_key: Optional[str] = None,
        confidence_threshold: float = 0.7
    ):
        """
        Inicializa el validador semántico.

        Args:
            adapter: Adaptador de Gemini
            api_key: API key de Gemini
            confidence_threshold: Umbral mínimo de confianza para pasar
        """
        self.adapter = adapter or GeminiAdapter(api_key=api_key)
        self.confidence_threshold = confidence_threshold

    def validate(
        self,
        objectives: List[str],
        locale: str = "es"
    ) -> SemanticValidationResult:
        """
        Evalúa semánticamente los objetivos de aprendizaje.

        Args:
            objectives: Lista de objetivos a evaluar
            locale: Código de idioma

        Returns:
            SemanticValidationResult con evaluación detallada
        """
        # Validación rápida previa (heurística)
        quick_check = self._quick_verb_check(objectives)

        # Construir prompt para LLM-Critic
        prompt = self._build_critic_prompt(objectives, locale)

        # Llamar al LLM con thinking level medium para evaluación profunda
        response = self.adapter.generate(
            prompt=prompt,
            schema=self.EVALUATION_SCHEMA,
            thinking_level=ThinkingLevel.MEDIUM
        )

        if not response.success:
            # Fallback a evaluación heurística
            return self._heuristic_evaluation(objectives, quick_check)

        # Parsear respuesta
        try:
            result = response.content
            confidence = result.get("confidence", 0.5)
            rationale = result.get("rationale", "")

            objective_scores = []
            for obj_data in result.get("objective_scores", []):
                objective_scores.append(ObjectiveScore(
                    objective=obj_data.get("objective", ""),
                    score=obj_data.get("score", 0.5),
                    feedback=obj_data.get("feedback", ""),
                    criteria_met=obj_data.get("criteria_met", {})
                ))

            passed = confidence >= self.confidence_threshold

            return SemanticValidationResult(
                passed=passed,
                confidence=confidence,
                rationale=rationale,
                objective_scores=objective_scores,
                llm_response=response,
                metadata={
                    "threshold": self.confidence_threshold,
                    "quick_check": quick_check,
                    "latency_ms": response.latency_ms
                }
            )

        except Exception as e:
            return self._heuristic_evaluation(
                objectives,
                quick_check,
                error=str(e)
            )

    def _quick_verb_check(self, objectives: List[str]) -> Dict[str, Any]:
        """
        Verificación rápida de verbos sin usar LLM.

        Args:
            objectives: Lista de objetivos

        Returns:
            Dict con resultados de verificación rápida
        """
        results = {
            "forbidden_found": [],
            "recommended_found": [],
            "issues": []
        }

        for i, obj in enumerate(objectives):
            obj_lower = obj.lower()

            # Buscar verbos prohibidos
            for verb in self.FORBIDDEN_VERBS:
                if verb in obj_lower:
                    results["forbidden_found"].append({
                        "objective_index": i,
                        "verb": verb
                    })
                    results["issues"].append(
                        f"Objetivo {i+1}: contiene verbo vago '{verb}'"
                    )

            # Buscar verbos recomendados
            for verb in self.RECOMMENDED_VERBS:
                if verb in obj_lower:
                    results["recommended_found"].append({
                        "objective_index": i,
                        "verb": verb
                    })
                    break

        results["has_issues"] = len(results["forbidden_found"]) > 0
        results["coverage"] = len(results["recommended_found"]) / len(objectives) if objectives else 0

        return results

    def _build_critic_prompt(
        self,
        objectives: List[str],
        locale: str
    ) -> str:
        """
        Construye el prompt para el LLM-Critic.

        Args:
            objectives: Lista de objetivos
            locale: Código de idioma

        Returns:
            Prompt formateado
        """
        objectives_text = "\n".join(
            f"{i+1}. {obj}" for i, obj in enumerate(objectives)
        )

        return f"""Eres un evaluador experto en diseño instruccional. Evalúa los siguientes
objetivos de aprendizaje según la rúbrica proporcionada.

OBJETIVOS A EVALUAR:
{objectives_text}

RÚBRICA DE EVALUACIÓN:

Criterio 1: ¿Contiene verbo de acción observable?
- Ejemplos VÁLIDOS: identificar, aplicar, demostrar, crear, analizar, diseñar, implementar, evaluar
- Ejemplos INVÁLIDOS: entender, conocer, apreciar, saber, comprender, aprender

Criterio 2: ¿El resultado es verificable?
- ¿Se puede determinar objetivamente si el estudiante logró el objetivo?
- ¿Hay un resultado tangible o demostrable?

Criterio 3: ¿Evita vaguedades?
- No debe contener: "diversos", "varios", "algunos", "mejor", "adecuadamente", "correctamente"
- Debe ser específico y medible

INSTRUCCIONES DE EVALUACIÓN:
1. Para cada objetivo, asigna un score de 0.0 a 1.0
2. Proporciona feedback específico y accionable
3. Indica qué criterios cumple (true/false)
4. Calcula la confianza general como promedio ponderado de scores
5. Proporciona una justificación general

SCORING:
- 0.0-0.3: Objetivo vago, no medible
- 0.4-0.6: Parcialmente medible, necesita mejoras
- 0.7-0.8: Objetivo bien formulado con mejoras menores
- 0.9-1.0: Objetivo excelente, completamente medible

Responde con la evaluación estructurada en JSON."""

    def _heuristic_evaluation(
        self,
        objectives: List[str],
        quick_check: Dict[str, Any],
        error: Optional[str] = None
    ) -> SemanticValidationResult:
        """
        Evaluación heurística como fallback.

        Args:
            objectives: Lista de objetivos
            quick_check: Resultados de verificación rápida
            error: Mensaje de error si hubo fallo en LLM

        Returns:
            SemanticValidationResult basado en heurísticas
        """
        objective_scores = []

        for i, obj in enumerate(objectives):
            # Verificar si tiene verbos prohibidos
            has_forbidden = any(
                f["objective_index"] == i
                for f in quick_check.get("forbidden_found", [])
            )

            # Verificar si tiene verbos recomendados
            has_recommended = any(
                r["objective_index"] == i
                for r in quick_check.get("recommended_found", [])
            )

            # Calcular score
            if has_forbidden:
                score = 0.3
                feedback = "Contiene verbo vago. Reemplazar por verbo observable."
            elif has_recommended:
                score = 0.8
                feedback = "Objetivo bien formulado con verbo observable."
            else:
                score = 0.5
                feedback = "No se detectó verbo observable claro. Revisar formulación."

            objective_scores.append(ObjectiveScore(
                objective=obj,
                score=score,
                feedback=feedback,
                criteria_met={
                    "observable_verb": has_recommended and not has_forbidden,
                    "verifiable_result": not has_forbidden,
                    "no_vagueness": not has_forbidden
                }
            ))

        # Calcular confianza promedio
        avg_confidence = sum(s.score for s in objective_scores) / len(objective_scores) if objective_scores else 0

        passed = avg_confidence >= self.confidence_threshold and not quick_check.get("has_issues", False)

        rationale = "Evaluación heurística basada en análisis de verbos."
        if error:
            rationale += f" (LLM fallback debido a: {error})"

        return SemanticValidationResult(
            passed=passed,
            confidence=avg_confidence,
            rationale=rationale,
            objective_scores=objective_scores,
            metadata={
                "method": "heuristic",
                "threshold": self.confidence_threshold,
                "quick_check": quick_check
            }
        )


# Factory function
def create_semantic_validator(
    api_key: Optional[str] = None,
    confidence_threshold: float = 0.7
) -> SemanticValidator:
    """
    Crea un validador semántico configurado.

    Args:
        api_key: API key de Gemini
        confidence_threshold: Umbral de confianza

    Returns:
        SemanticValidator configurado
    """
    return SemanticValidator(
        api_key=api_key,
        confidence_threshold=confidence_threshold
    )
