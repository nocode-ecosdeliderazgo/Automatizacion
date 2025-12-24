"""
Validadores Deterministas - GO-ESP-01
Validaciones basadas en reglas que no requieren LLM
"""

import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class ValidationSeverity(Enum):
    """Severidad de la validación"""
    ERROR = "error"      # Bloquea, requiere corrección
    WARNING = "warning"  # Advierte, puede continuar


@dataclass
class ValidationResult:
    """Resultado estándar de una validación"""
    passed: bool
    code: str
    message: str
    observed: Any = None
    expected: Any = None
    severity: ValidationSeverity = ValidationSeverity.ERROR

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pass": self.passed,
            "code": self.code,
            "message": self.message,
            "observed": self.observed,
            "expected": self.expected,
            "severity": self.severity.value
        }


@dataclass
class ValidationReport:
    """Reporte completo de validaciones"""
    all_passed: bool
    results: List[ValidationResult]
    errors: List[ValidationResult] = field(default_factory=list)
    warnings: List[ValidationResult] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "all_passed": self.all_passed,
            "results": [r.to_dict() for r in self.results],
            "errors": [r.to_dict() for r in self.errors],
            "warnings": [r.to_dict() for r in self.warnings]
        }


# =============================================================================
# VALIDADORES INDIVIDUALES
# =============================================================================

def validate_names_count(artifact: Dict[str, Any]) -> ValidationResult:
    """
    VAL_001: Valida que haya exactamente 3 nombres.

    Args:
        artifact: El artefacto a validar

    Returns:
        ValidationResult con el resultado
    """
    nombres = artifact.get("nombres", [])
    count = len(nombres) if isinstance(nombres, list) else 0
    expected = 3

    if count == expected:
        return ValidationResult(
            passed=True,
            code="VAL_001",
            message="Cantidad correcta de nombres",
            observed=count,
            expected=expected
        )

    return ValidationResult(
        passed=False,
        code="VAL_001",
        message=f"Se requieren exactamente 3 nombres, se encontraron {count}",
        observed=count,
        expected=expected,
        severity=ValidationSeverity.ERROR
    )


def validate_objectives_count(artifact: Dict[str, Any]) -> ValidationResult:
    """
    VAL_002: Valida que haya entre 3 y 6 objetivos.

    Args:
        artifact: El artefacto a validar

    Returns:
        ValidationResult con el resultado
    """
    objetivos = artifact.get("objetivos", [])
    count = len(objetivos) if isinstance(objetivos, list) else 0
    expected = {"min": 3, "max": 6}

    if expected["min"] <= count <= expected["max"]:
        return ValidationResult(
            passed=True,
            code="VAL_002",
            message="Cantidad correcta de objetivos",
            observed=count,
            expected=expected
        )

    if count < expected["min"]:
        message = f"Se requieren al menos 3 objetivos, se encontraron {count}"
    else:
        message = f"Se requieren máximo 6 objetivos, se encontraron {count}"

    return ValidationResult(
        passed=False,
        code="VAL_002",
        message=message,
        observed=count,
        expected=expected,
        severity=ValidationSeverity.ERROR
    )


def count_words_spanish(text: str) -> int:
    """
    Cuenta palabras en español de forma simple.
    Tokenización por espacios con normalización básica.

    Args:
        text: Texto a contar

    Returns:
        Número de palabras
    """
    if not text or not isinstance(text, str):
        return 0

    # Normalizar espacios y caracteres especiales
    text = re.sub(r'[^\w\sáéíóúüñÁÉÍÓÚÜÑ]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    if not text:
        return 0

    return len(text.split())


def validate_description_length(
    artifact: Dict[str, Any],
    min_words: int = 150,
    max_words: int = 200
) -> ValidationResult:
    """
    VAL_003: Valida que la descripción tenga entre 150-200 palabras.

    Args:
        artifact: El artefacto a validar
        min_words: Mínimo de palabras (default 150)
        max_words: Máximo de palabras (default 200)

    Returns:
        ValidationResult con el resultado
    """
    descripcion = artifact.get("descripcion", {})
    texto = descripcion.get("texto", "") if isinstance(descripcion, dict) else ""
    word_count = count_words_spanish(texto)
    expected = {"min": min_words, "max": max_words}

    if min_words <= word_count <= max_words:
        return ValidationResult(
            passed=True,
            code="VAL_003",
            message=f"Longitud de descripción correcta ({word_count} palabras)",
            observed=word_count,
            expected=expected
        )

    if word_count < min_words:
        message = f"La descripción tiene {word_count} palabras, requiere mínimo {min_words}"
    else:
        message = f"La descripción tiene {word_count} palabras, máximo permitido {max_words}"

    return ValidationResult(
        passed=False,
        code="VAL_003",
        message=message,
        observed=word_count,
        expected=expected,
        severity=ValidationSeverity.ERROR
    )


def validate_structure(artifact: Dict[str, Any]) -> ValidationResult:
    """
    VAL_004: Valida que el artefacto tenga la estructura correcta.
    Verifica presencia de todas las secciones requeridas.

    Args:
        artifact: El artefacto a validar

    Returns:
        ValidationResult con el resultado
    """
    required_top_level = ["nombres", "objetivos", "descripcion"]
    required_descripcion = [
        "texto", "publico_objetivo", "beneficios",
        "estructura_general", "diferenciador"
    ]

    missing = []

    # Verificar campos de nivel superior
    for field in required_top_level:
        if field not in artifact:
            missing.append(field)

    # Verificar campos de descripción
    descripcion = artifact.get("descripcion", {})
    if isinstance(descripcion, dict):
        for field in required_descripcion:
            if field not in descripcion:
                missing.append(f"descripcion.{field}")

    if not missing:
        return ValidationResult(
            passed=True,
            code="VAL_004",
            message="Estructura del artefacto correcta",
            observed=list(artifact.keys()),
            expected=required_top_level + [f"descripcion.{f}" for f in required_descripcion]
        )

    return ValidationResult(
        passed=False,
        code="VAL_004",
        message=f"Faltan campos requeridos: {', '.join(missing)}",
        observed=missing,
        expected=required_top_level + [f"descripcion.{f}" for f in required_descripcion],
        severity=ValidationSeverity.ERROR
    )


def validate_names_not_empty(artifact: Dict[str, Any]) -> ValidationResult:
    """
    Valida que los nombres no estén vacíos.

    Args:
        artifact: El artefacto a validar

    Returns:
        ValidationResult
    """
    nombres = artifact.get("nombres", [])
    empty_names = []

    if isinstance(nombres, list):
        for i, nombre in enumerate(nombres):
            if not nombre or not isinstance(nombre, str) or len(nombre.strip()) < 5:
                empty_names.append(i + 1)

    if not empty_names:
        return ValidationResult(
            passed=True,
            code="VAL_001b",
            message="Todos los nombres tienen contenido válido",
            observed=len(nombres)
        )

    return ValidationResult(
        passed=False,
        code="VAL_001b",
        message=f"Nombres vacíos o muy cortos en posiciones: {empty_names}",
        observed=empty_names,
        severity=ValidationSeverity.ERROR
    )


def validate_objectives_not_empty(artifact: Dict[str, Any]) -> ValidationResult:
    """
    Valida que los objetivos no estén vacíos.

    Args:
        artifact: El artefacto a validar

    Returns:
        ValidationResult
    """
    objetivos = artifact.get("objetivos", [])
    empty_objectives = []

    if isinstance(objetivos, list):
        for i, objetivo in enumerate(objetivos):
            if not objetivo or not isinstance(objetivo, str) or len(objetivo.strip()) < 10:
                empty_objectives.append(i + 1)

    if not empty_objectives:
        return ValidationResult(
            passed=True,
            code="VAL_002b",
            message="Todos los objetivos tienen contenido válido",
            observed=len(objetivos)
        )

    return ValidationResult(
        passed=False,
        code="VAL_002b",
        message=f"Objetivos vacíos o muy cortos en posiciones: {empty_objectives}",
        observed=empty_objectives,
        severity=ValidationSeverity.ERROR
    )


# =============================================================================
# VALIDATOR RUNNER
# =============================================================================

class DeterministicValidatorRunner:
    """
    Runner que ejecuta todos los validadores deterministas.
    """

    def __init__(
        self,
        min_description_words: int = 150,
        max_description_words: int = 200
    ):
        """
        Inicializa el runner.

        Args:
            min_description_words: Mínimo de palabras en descripción
            max_description_words: Máximo de palabras en descripción
        """
        self.min_description_words = min_description_words
        self.max_description_words = max_description_words

    def validate(self, artifact: Dict[str, Any]) -> ValidationReport:
        """
        Ejecuta todas las validaciones deterministas.

        Args:
            artifact: El artefacto a validar

        Returns:
            ValidationReport con todos los resultados
        """
        results = []

        # Ejecutar cada validador
        results.append(validate_structure(artifact))
        results.append(validate_names_count(artifact))
        results.append(validate_names_not_empty(artifact))
        results.append(validate_objectives_count(artifact))
        results.append(validate_objectives_not_empty(artifact))
        results.append(validate_description_length(
            artifact,
            min_words=self.min_description_words,
            max_words=self.max_description_words
        ))

        # Clasificar resultados
        errors = [r for r in results if not r.passed and r.severity == ValidationSeverity.ERROR]
        warnings = [r for r in results if not r.passed and r.severity == ValidationSeverity.WARNING]
        all_passed = len(errors) == 0

        return ValidationReport(
            all_passed=all_passed,
            results=results,
            errors=errors,
            warnings=warnings
        )

    def get_first_error(self, artifact: Dict[str, Any]) -> Optional[ValidationResult]:
        """
        Obtiene el primer error encontrado (para auto-corrección dirigida).

        Args:
            artifact: El artefacto a validar

        Returns:
            El primer ValidationResult con error, o None si no hay errores
        """
        report = self.validate(artifact)
        return report.errors[0] if report.errors else None


# Factory function
def create_validator(
    min_words: int = 150,
    max_words: int = 200
) -> DeterministicValidatorRunner:
    """
    Crea un validador configurado.

    Args:
        min_words: Mínimo palabras en descripción
        max_words: Máximo palabras en descripción

    Returns:
        DeterministicValidatorRunner configurado
    """
    return DeterministicValidatorRunner(
        min_description_words=min_words,
        max_description_words=max_words
    )
