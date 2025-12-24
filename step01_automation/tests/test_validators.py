"""
Tests para validadores deterministas - GO-ESP-01
"""

import pytest
import json
import sys
from pathlib import Path

# Configurar path para importaciones
_project_root = Path(__file__).parent.parent
_src_dir = _project_root / "src"
if str(_src_dir) not in sys.path:
    sys.path.insert(0, str(_src_dir))

from validators.deterministic_validators import (
    validate_names_count,
    validate_objectives_count,
    validate_description_length,
    validate_structure,
    validate_names_not_empty,
    validate_objectives_not_empty,
    count_words_spanish,
    DeterministicValidatorRunner,
    ValidationSeverity
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def valid_artifact():
    """Artefacto válido para testing"""
    return {
        "nombres": [
            "Liderazgo Transformacional: De Gerente a Líder Inspirador",
            "El Arte del Liderazgo que Transforma Equipos",
            "Gerentes que Inspiran: Masterclass en Liderazgo"
        ],
        "objetivos": [
            "Identificar los cuatro componentes del liderazgo transformacional",
            "Aplicar técnicas de comunicación inspiradora para motivar equipos",
            "Diseñar un plan de desarrollo personal como líder transformacional",
            "Demostrar habilidades de coaching para desarrollar colaboradores"
        ],
        "descripcion": {
            "texto": "Este programa está diseñado para gerentes y líderes de equipo que buscan evolucionar de un estilo de gestión tradicional hacia un liderazgo que inspire y transforme. A través de metodologías experienciales y casos de estudio reales, los participantes desarrollarán competencias clave para motivar equipos, gestionar el cambio y crear culturas de alto rendimiento. El curso se estructura en cuatro módulos progresivos: fundamentos del liderazgo transformacional, comunicación inspiradora, desarrollo de equipos y gestión del cambio organizacional. Lo que distingue este programa es su enfoque práctico basado en neurociencia del liderazgo y herramientas de coaching ejecutivo, permitiendo a los participantes aplicar inmediatamente lo aprendido en sus contextos laborales con resultados tangibles desde la primera semana.",
            "publico_objetivo": "Gerentes y líderes de equipo con experiencia en gestión",
            "beneficios": "Habilidades de comunicación, coaching y gestión del cambio",
            "estructura_general": "4 módulos progresivos con metodología experiencial",
            "diferenciador": "Enfoque basado en neurociencia y coaching ejecutivo"
        }
    }


@pytest.fixture
def load_fixtures():
    """Carga fixtures desde archivos JSON"""
    fixtures_dir = Path(__file__).parent / "fixtures"

    def _load(filename):
        filepath = fixtures_dir / filename
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    return _load


# =============================================================================
# TESTS: validate_names_count (VAL_001)
# =============================================================================

class TestValidateNamesCount:
    """Tests para validación de cantidad de nombres"""

    def test_valid_three_names(self, valid_artifact):
        """3 nombres debe pasar"""
        result = validate_names_count(valid_artifact)
        assert result.passed is True
        assert result.code == "VAL_001"
        assert result.observed == 3

    def test_invalid_two_names(self):
        """2 nombres debe fallar"""
        artifact = {"nombres": ["Nombre 1", "Nombre 2"]}
        result = validate_names_count(artifact)
        assert result.passed is False
        assert result.code == "VAL_001"
        assert result.observed == 2
        assert result.severity == ValidationSeverity.ERROR

    def test_invalid_four_names(self):
        """4 nombres debe fallar"""
        artifact = {"nombres": ["N1", "N2", "N3", "N4"]}
        result = validate_names_count(artifact)
        assert result.passed is False
        assert result.observed == 4

    def test_empty_names(self):
        """Sin nombres debe fallar"""
        artifact = {"nombres": []}
        result = validate_names_count(artifact)
        assert result.passed is False
        assert result.observed == 0

    def test_missing_nombres_key(self):
        """Sin key 'nombres' debe fallar"""
        artifact = {}
        result = validate_names_count(artifact)
        assert result.passed is False
        assert result.observed == 0


# =============================================================================
# TESTS: validate_objectives_count (VAL_002)
# =============================================================================

class TestValidateObjectivesCount:
    """Tests para validación de cantidad de objetivos"""

    def test_valid_four_objectives(self, valid_artifact):
        """4 objetivos (dentro del rango 3-6) debe pasar"""
        result = validate_objectives_count(valid_artifact)
        assert result.passed is True
        assert result.code == "VAL_002"
        assert result.observed == 4

    def test_valid_three_objectives(self):
        """3 objetivos (mínimo) debe pasar"""
        artifact = {"objetivos": ["Obj1", "Obj2", "Obj3"]}
        result = validate_objectives_count(artifact)
        assert result.passed is True
        assert result.observed == 3

    def test_valid_six_objectives(self):
        """6 objetivos (máximo) debe pasar"""
        artifact = {"objetivos": ["O1", "O2", "O3", "O4", "O5", "O6"]}
        result = validate_objectives_count(artifact)
        assert result.passed is True
        assert result.observed == 6

    def test_invalid_two_objectives(self):
        """2 objetivos debe fallar"""
        artifact = {"objetivos": ["Obj1", "Obj2"]}
        result = validate_objectives_count(artifact)
        assert result.passed is False
        assert result.observed == 2
        assert "al menos 3" in result.message

    def test_invalid_seven_objectives(self):
        """7 objetivos debe fallar"""
        artifact = {"objetivos": ["O1", "O2", "O3", "O4", "O5", "O6", "O7"]}
        result = validate_objectives_count(artifact)
        assert result.passed is False
        assert result.observed == 7
        assert "máximo 6" in result.message


# =============================================================================
# TESTS: count_words_spanish
# =============================================================================

class TestCountWordsSpanish:
    """Tests para conteo de palabras en español"""

    def test_simple_sentence(self):
        """Oración simple"""
        text = "Esto es una prueba de conteo"
        assert count_words_spanish(text) == 6

    def test_with_punctuation(self):
        """Con puntuación"""
        text = "¡Hola, mundo! ¿Cómo estás?"
        assert count_words_spanish(text) == 4

    def test_with_accents(self):
        """Con acentos"""
        text = "La comunicación efectiva es clave para el éxito"
        assert count_words_spanish(text) == 8

    def test_empty_string(self):
        """String vacío"""
        assert count_words_spanish("") == 0

    def test_none_value(self):
        """Valor None"""
        assert count_words_spanish(None) == 0

    def test_only_spaces(self):
        """Solo espacios"""
        assert count_words_spanish("   ") == 0

    def test_multiple_spaces(self):
        """Múltiples espacios entre palabras"""
        text = "Palabra1   Palabra2    Palabra3"
        assert count_words_spanish(text) == 3


# =============================================================================
# TESTS: validate_description_length (VAL_003)
# =============================================================================

class TestValidateDescriptionLength:
    """Tests para validación de longitud de descripción"""

    def test_valid_length(self, valid_artifact):
        """Descripción con longitud válida"""
        result = validate_description_length(valid_artifact)
        assert result.passed is True
        assert result.code == "VAL_003"
        assert 150 <= result.observed <= 200

    def test_too_short(self):
        """Descripción muy corta"""
        artifact = {
            "descripcion": {
                "texto": "Este es un texto muy corto para la descripción del curso."
            }
        }
        result = validate_description_length(artifact)
        assert result.passed is False
        assert "mínimo" in result.message.lower()

    def test_too_long(self):
        """Descripción muy larga"""
        long_text = " ".join(["palabra"] * 250)
        artifact = {"descripcion": {"texto": long_text}}
        result = validate_description_length(artifact)
        assert result.passed is False
        assert "máximo" in result.message.lower()

    def test_exactly_150_words(self):
        """Exactamente 150 palabras (límite inferior)"""
        text = " ".join(["palabra"] * 150)
        artifact = {"descripcion": {"texto": text}}
        result = validate_description_length(artifact)
        assert result.passed is True

    def test_exactly_200_words(self):
        """Exactamente 200 palabras (límite superior)"""
        text = " ".join(["palabra"] * 200)
        artifact = {"descripcion": {"texto": text}}
        result = validate_description_length(artifact)
        assert result.passed is True


# =============================================================================
# TESTS: validate_structure (VAL_004)
# =============================================================================

class TestValidateStructure:
    """Tests para validación de estructura"""

    def test_valid_structure(self, valid_artifact):
        """Estructura completa válida"""
        result = validate_structure(valid_artifact)
        assert result.passed is True
        assert result.code == "VAL_004"

    def test_missing_nombres(self):
        """Falta 'nombres'"""
        artifact = {
            "objetivos": ["Obj1", "Obj2", "Obj3"],
            "descripcion": {"texto": "...", "publico_objetivo": "...",
                           "beneficios": "...", "estructura_general": "...",
                           "diferenciador": "..."}
        }
        result = validate_structure(artifact)
        assert result.passed is False
        assert "nombres" in result.message

    def test_missing_descripcion_field(self):
        """Falta campo dentro de descripción"""
        artifact = {
            "nombres": ["N1", "N2", "N3"],
            "objetivos": ["O1", "O2", "O3"],
            "descripcion": {
                "texto": "...",
                "publico_objetivo": "...",
                "beneficios": "...",
                "estructura_general": "..."
                # Falta 'diferenciador'
            }
        }
        result = validate_structure(artifact)
        assert result.passed is False
        assert "diferenciador" in result.message


# =============================================================================
# TESTS: DeterministicValidatorRunner
# =============================================================================

class TestDeterministicValidatorRunner:
    """Tests para el runner de validadores"""

    def test_valid_artifact_passes_all(self, valid_artifact):
        """Artefacto válido pasa todas las validaciones"""
        runner = DeterministicValidatorRunner()
        report = runner.validate(valid_artifact)

        assert report.all_passed is True
        assert len(report.errors) == 0
        assert len(report.results) > 0

    def test_invalid_artifact_has_errors(self):
        """Artefacto inválido genera errores"""
        artifact = {
            "nombres": ["Solo un nombre"],
            "objetivos": ["Un objetivo"],
            "descripcion": {"texto": "Corto"}
        }
        runner = DeterministicValidatorRunner()
        report = runner.validate(artifact)

        assert report.all_passed is False
        assert len(report.errors) > 0

    def test_get_first_error(self):
        """get_first_error retorna el primer error"""
        artifact = {"nombres": ["N1", "N2"]}  # Faltan campos
        runner = DeterministicValidatorRunner()
        first_error = runner.get_first_error(artifact)

        assert first_error is not None
        assert first_error.passed is False

    def test_get_first_error_no_errors(self, valid_artifact):
        """get_first_error retorna None si no hay errores"""
        runner = DeterministicValidatorRunner()
        first_error = runner.get_first_error(valid_artifact)

        assert first_error is None

    def test_report_to_dict(self, valid_artifact):
        """El reporte se serializa correctamente a dict"""
        runner = DeterministicValidatorRunner()
        report = runner.validate(valid_artifact)
        report_dict = report.to_dict()

        assert "all_passed" in report_dict
        assert "results" in report_dict
        assert "errors" in report_dict
        assert isinstance(report_dict["results"], list)


# =============================================================================
# TESTS: Con fixtures de archivo
# =============================================================================

class TestWithFixtureFiles:
    """Tests usando fixtures de archivos JSON"""

    def test_valid_artifacts_from_file(self, load_fixtures):
        """Todos los artefactos válidos pasan"""
        data = load_fixtures("valid_artifacts.json")
        if data is None:
            pytest.skip("Fixture file not found")

        runner = DeterministicValidatorRunner()

        for item in data.get("artifacts", []):
            artifact = item["artifact"]
            report = runner.validate(artifact)
            assert report.all_passed is True, f"Failed for {item['id']}: {report.errors}"

    def test_invalid_artifacts_from_file(self, load_fixtures):
        """Artefactos inválidos fallan con el error esperado"""
        data = load_fixtures("invalid_artifacts.json")
        if data is None:
            pytest.skip("Fixture file not found")

        runner = DeterministicValidatorRunner()

        for item in data.get("artifacts", []):
            artifact = item["artifact"]
            expected_error = item.get("expected_error")

            report = runner.validate(artifact)
            assert report.all_passed is False, f"Should fail for {item['id']}"

            if expected_error:
                error_codes = [e.code for e in report.errors]
                # Verificar que el error esperado está presente
                # (puede haber múltiples errores)
                has_expected = any(expected_error in code for code in error_codes)
                assert has_expected, f"Expected {expected_error} for {item['id']}, got {error_codes}"
