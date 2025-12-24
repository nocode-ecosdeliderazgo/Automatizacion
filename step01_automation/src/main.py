"""
Orquestador Principal - GO-ESP-01
Pipeline completo del Paso 01: Normalización de Insumo y Artefacto Base
"""

import os
import sys
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# Agregar el directorio src al path para importaciones
_src_dir = Path(__file__).parent
_project_root = _src_dir.parent
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

# Cargar variables de entorno desde .env
from dotenv import load_dotenv
_env_file = _project_root / ".env"
if _env_file.exists():
    load_dotenv(_env_file)
else:
    # Intentar cargar desde directorio actual
    load_dotenv()

from adapters.gemini_adapter import GeminiAdapter, ThinkingLevel
from generators.step01_generator import Step01Generator, GenerationResult
from validators.deterministic_validators import (
    DeterministicValidatorRunner,
    ValidationReport,
    ValidationResult
)
from validators.semantic_validator import SemanticValidator, SemanticValidationResult
from correction.auto_correction_engine import AutoCorrectionEngine, CorrectionResult


class PipelineState(Enum):
    """Estados del pipeline"""
    DRAFT_INPUT = "DRAFT_INPUT"
    GENERATED = "GENERATED"
    VALIDATING_DETERMINISTIC = "VALIDATING_DETERMINISTIC"
    AUTO_REPAIR = "AUTO_REPAIR"
    VALIDATING_SEMANTIC = "VALIDATING_SEMANTIC"
    READY_FOR_QA = "READY_FOR_QA"
    QA_APPROVED = "QA_APPROVED"
    QA_REJECTED = "QA_REJECTED"
    ESCALATED = "ESCALATED"
    PERSISTED = "PERSISTED"


@dataclass
class PipelineResult:
    """Resultado del pipeline completo"""
    success: bool
    state: PipelineState
    artifact: Optional[Dict[str, Any]]
    run_id: str
    course_id: Optional[str]
    idea_central: str
    iteration_count: int
    auto_retry_count: int
    validation_report: Optional[ValidationReport] = None
    semantic_result: Optional[SemanticValidationResult] = None
    error_message: Optional[str] = None
    escalation_payload: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "state": self.state.value,
            "run_id": self.run_id,
            "course_id": self.course_id,
            "idea_central": self.idea_central,
            "iteration_count": self.iteration_count,
            "auto_retry_count": self.auto_retry_count,
            "artifact": self.artifact,
            "validation_report": self.validation_report.to_dict() if self.validation_report else None,
            "semantic_result": self.semantic_result.to_dict() if self.semantic_result else None,
            "error_message": self.error_message,
            "escalation_payload": self.escalation_payload,
            "metadata": self.metadata
        }


class Step01Pipeline:
    """
    Pipeline orquestador del Paso 01.

    Flujo:
    1. Recibir idea_central
    2. Generar artefacto via LLM
    3. Validar determinísticamente
    4. Si falla: auto-corregir (máx N intentos) o escalar
    5. Validar semánticamente
    6. Preparar para QA
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash",
        max_auto_retries: int = 3,
        max_hitl_iterations: int = 2,
        semantic_confidence_threshold: float = 0.7
    ):
        """
        Inicializa el pipeline.

        Args:
            api_key: API key de Gemini
            model: ID del modelo
            max_auto_retries: Máximo reintentos automáticos
            max_hitl_iterations: Máximo iteraciones HITL
            semantic_confidence_threshold: Umbral semántico
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.model = model
        self.max_auto_retries = max_auto_retries
        self.max_hitl_iterations = max_hitl_iterations
        self.semantic_threshold = semantic_confidence_threshold

        # Inicializar componentes (lazy loading para permitir uso sin API key)
        self._adapter = None
        self._generator = None
        self._validator = None
        self._semantic_validator = None
        self._correction_engine = None

    @property
    def adapter(self) -> GeminiAdapter:
        if self._adapter is None:
            self._adapter = GeminiAdapter(api_key=self.api_key, model=self.model)
        return self._adapter

    @property
    def generator(self) -> Step01Generator:
        if self._generator is None:
            self._generator = Step01Generator(adapter=self.adapter)
        return self._generator

    @property
    def validator(self) -> DeterministicValidatorRunner:
        if self._validator is None:
            self._validator = DeterministicValidatorRunner()
        return self._validator

    @property
    def semantic_validator(self) -> SemanticValidator:
        if self._semantic_validator is None:
            self._semantic_validator = SemanticValidator(
                adapter=self.adapter,
                confidence_threshold=self.semantic_threshold
            )
        return self._semantic_validator

    @property
    def correction_engine(self) -> AutoCorrectionEngine:
        if self._correction_engine is None:
            self._correction_engine = AutoCorrectionEngine(
                adapter=self.adapter,
                max_retries=self.max_auto_retries
            )
        return self._correction_engine

    def run(
        self,
        idea_central: str,
        course_id: Optional[str] = None,
        operator_id: Optional[str] = None
    ) -> PipelineResult:
        """
        Ejecuta el pipeline completo.

        Args:
            idea_central: Idea central del curso
            course_id: ID del curso (opcional)
            operator_id: ID del operador (opcional)

        Returns:
            PipelineResult con el resultado final
        """
        run_id = str(uuid.uuid4())
        history = []
        auto_retry_count = 0

        # Log inicio
        self._log_event(history, "PIPELINE_START", {
            "run_id": run_id,
            "idea_central": idea_central,
            "course_id": course_id,
            "operator_id": operator_id
        })

        # === PASO 1: Generar artefacto ===
        self._log_event(history, "STATE_CHANGE", {"state": PipelineState.GENERATED.value})

        gen_result = self.generator.generate(
            idea_central=idea_central,
            thinking_level=ThinkingLevel.LOW,
            course_id=course_id,
            operator_id=operator_id
        )

        if not gen_result.success:
            return PipelineResult(
                success=False,
                state=PipelineState.ESCALATED,
                artifact=None,
                run_id=run_id,
                course_id=course_id,
                idea_central=idea_central,
                iteration_count=0,
                auto_retry_count=0,
                error_message=f"Error en generación: {gen_result.error}",
                history=history,
                metadata=gen_result.metadata
            )

        artifact = gen_result.artifact
        self._log_event(history, "ARTIFACT_GENERATED", {"artifact": artifact})

        # === PASO 2: Validación determinista + auto-corrección ===
        while auto_retry_count < self.max_auto_retries:
            self._log_event(history, "STATE_CHANGE", {
                "state": PipelineState.VALIDATING_DETERMINISTIC.value
            })

            val_report = self.validator.validate(artifact)
            self._log_event(history, "VALIDATION_COMPLETE", {
                "passed": val_report.all_passed,
                "errors": len(val_report.errors)
            })

            if val_report.all_passed:
                break

            # Intentar auto-corrección
            first_error = val_report.errors[0]
            auto_retry_count += 1

            self._log_event(history, "STATE_CHANGE", {
                "state": PipelineState.AUTO_REPAIR.value,
                "attempt": auto_retry_count,
                "error_code": first_error.code
            })

            correction_result = self.correction_engine.correct(
                artifact=artifact,
                validation_error=first_error,
                attempt_number=auto_retry_count
            )

            if correction_result.success:
                artifact = correction_result.corrected_artifact
                self._log_event(history, "CORRECTION_SUCCESS", {
                    "attempt": auto_retry_count
                })
            else:
                self._log_event(history, "CORRECTION_FAILED", {
                    "attempt": auto_retry_count,
                    "error": correction_result.error_message
                })

        # Verificar si pasó validación determinista
        final_val_report = self.validator.validate(artifact)

        if not final_val_report.all_passed:
            # Escalar si aún tiene errores
            escalation_payload = self._build_escalation_payload(
                idea_central=idea_central,
                artifact=artifact,
                validation_report=final_val_report,
                history=history
            )

            return PipelineResult(
                success=False,
                state=PipelineState.ESCALATED,
                artifact=artifact,
                run_id=run_id,
                course_id=course_id,
                idea_central=idea_central,
                iteration_count=0,
                auto_retry_count=auto_retry_count,
                validation_report=final_val_report,
                error_message="Máximo de reintentos automáticos alcanzado",
                escalation_payload=escalation_payload,
                history=history
            )

        # === PASO 3: Validación semántica ===
        self._log_event(history, "STATE_CHANGE", {
            "state": PipelineState.VALIDATING_SEMANTIC.value
        })

        objetivos = artifact.get("objetivos", [])
        semantic_result = self.semantic_validator.validate(objetivos)

        self._log_event(history, "SEMANTIC_VALIDATION", {
            "passed": semantic_result.passed,
            "confidence": semantic_result.confidence
        })

        # === PASO 4: Preparar para QA ===
        self._log_event(history, "STATE_CHANGE", {
            "state": PipelineState.READY_FOR_QA.value
        })

        return PipelineResult(
            success=True,
            state=PipelineState.READY_FOR_QA,
            artifact=artifact,
            run_id=run_id,
            course_id=course_id,
            idea_central=idea_central,
            iteration_count=0,  # HITL aún no iniciado
            auto_retry_count=auto_retry_count,
            validation_report=final_val_report,
            semantic_result=semantic_result,
            history=history,
            metadata={
                "generation": gen_result.metadata,
                "ready_for_qa_at": datetime.now(timezone.utc).isoformat()
            }
        )

    def _log_event(
        self,
        history: List[Dict[str, Any]],
        event_type: str,
        data: Dict[str, Any]
    ):
        """Registra un evento en el historial."""
        history.append({
            "event": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data
        })

    def _build_escalation_payload(
        self,
        idea_central: str,
        artifact: Dict[str, Any],
        validation_report: ValidationReport,
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Construye el payload para escalamiento."""
        return {
            "idea_central": idea_central,
            "artifact_final": artifact,
            "validation_errors": [e.to_dict() for e in validation_report.errors],
            "criteria_not_met": [e.code for e in validation_report.errors],
            "history_summary": {
                "total_events": len(history),
                "events": history[-10:]  # Últimos 10 eventos
            },
            "escalated_at": datetime.now(timezone.utc).isoformat(),
            "reason": "Máximo de reintentos automáticos alcanzado sin cumplir DoD"
        }


# Factory function para crear pipeline
def create_pipeline(
    api_key: Optional[str] = None,
    model: str = "gemini-2.0-flash",
    max_auto_retries: int = 3
) -> Step01Pipeline:
    """
    Crea un pipeline configurado.

    Args:
        api_key: API key de Gemini
        model: ID del modelo
        max_auto_retries: Máximo reintentos

    Returns:
        Step01Pipeline configurado
    """
    return Step01Pipeline(
        api_key=api_key,
        model=model,
        max_auto_retries=max_auto_retries
    )


# Función de conveniencia para ejecutar el pipeline
def run_step01(
    idea_central: str,
    course_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    api_key: Optional[str] = None
) -> PipelineResult:
    """
    Ejecuta el pipeline GO-ESP-01 completo.

    Args:
        idea_central: Idea central del curso
        course_id: ID del curso
        operator_id: ID del operador
        api_key: API key de Gemini

    Returns:
        PipelineResult con el resultado
    """
    pipeline = create_pipeline(api_key=api_key)
    return pipeline.run(
        idea_central=idea_central,
        course_id=course_id,
        operator_id=operator_id
    )


if __name__ == "__main__":
    # Ejemplo de uso
    import json

    result = run_step01(
        idea_central="Curso sobre liderazgo transformacional para gerentes de nivel medio",
        course_id="COURSE-001",
        operator_id="OP-001"
    )

    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
