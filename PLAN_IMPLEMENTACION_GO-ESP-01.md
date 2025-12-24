# Plan de Implementación — GO-ESP-01
## Automatización del Paso 01: Normalización de Insumo y Artefacto Base

---

## 0. Decisión Arquitectónica: Roles de Claude Code y Gemini

### 0.1 Decisión Tomada: **Interpretación A**

| Herramienta | Fase | Rol |
|-------------|------|-----|
| **Claude Code** | Desarrollo (dev-time) | Construir y mantener el sistema: specs, contratos, tests, prompts, estructura |
| **Gemini 3 Flash** | Ejecución (runtime) | Agente principal del pipeline: generación, autocorrección, validación semántica |

### 0.2 Justificación

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA HÍBRIDA                      │
├─────────────────────────────┬───────────────────────────────┤
│      DEV-TIME (Claude)      │      RUNTIME (Gemini)         │
├─────────────────────────────┼───────────────────────────────┤
│ • Generar specs YAML/JSON   │ • Generar artefactos          │
│ • Diseñar prompts           │ • Autocorregir errores        │
│ • Implementar validators    │ • Evaluar semánticamente      │
│ • Crear tests               │ • Ejecutar pipeline           │
│ • Estructurar repositorio   │ • Responder en producción     │
├─────────────────────────────┼───────────────────────────────┤
│ Costo: N/A (herramienta)    │ Costo: $0.50-3.00/1M tokens   │
│ Velocidad: Interactivo      │ Velocidad: 3x más rápido      │
└─────────────────────────────┴───────────────────────────────┘
```

### 0.3 Interpretación B (Alternativa - No seleccionada)

> **Nota:** Si en el futuro se requiere que Claude participe en runtime (ej. como critic semántico alternativo), esto impactará:
> - Costos (Claude API adicional)
> - Seguridad (más API keys)
> - Observabilidad (logging multi-modelo)

---

## 1. Resumen Ejecutivo

Este plan detalla la implementación de un sistema automatizado para el **Paso 01** del proceso de creación de cursos, que transforma una "idea central" en un artefacto estructurado (3 nombres, 3-6 objetivos, descripción 150-200 palabras).

**Objetivo principal:** Reducir intervención humana en validaciones mecánicas, garantizar consistencia y trazabilidad, y reservar HITL solo para evaluaciones semánticas.

**Modelo LLM seleccionado:** Google Gemini 3 Flash (`gemini-3-flash-preview`)

---

## 2. Modelo LLM: Gemini 3 Flash

### 2.1 Justificación de Elección

| Criterio | Gemini 3 Flash | Beneficio para el proyecto |
|----------|----------------|---------------------------|
| **Costo** | $0.50/1M input, $3/1M output | Económico para alto volumen de generaciones |
| **Velocidad** | 3x más rápido que 2.5 Pro | Ciclos de autocorrección rápidos |
| **Context Window** | 1M tokens input / 64K output | Permite prompts extensos con ejemplos |
| **Structured Output** | Soporte nativo JSON Schema | Ideal para artefactos estructurados |
| **Razonamiento configurable** | `thinking_level` ajustable | Optimizar costo/calidad por tarea |

### 2.2 Especificaciones Técnicas

```yaml
modelo:
  id: "gemini-3-flash-preview"
  provider: "google"
  knowledge_cutoff: "Enero 2025"
  context_window:
    input: 1048576  # 1M tokens
    output: 65536   # 64K tokens

pricing:
  input_tokens: 0.50   # USD por 1M tokens
  output_tokens: 3.00  # USD por 1M tokens
  audio_tokens: 1.00   # USD por 1M tokens (si aplica)

capabilities:
  - text_generation
  - structured_output (JSON Schema)
  - multimodal (text, images, audio, video, PDF)
  - function_calling
  - code_execution
```

### 2.3 Niveles de Razonamiento (Thinking Level)

Gemini 3 Flash permite configurar la profundidad de razonamiento:

| Nivel | Uso recomendado | Latencia | Costo |
|-------|-----------------|----------|-------|
| `minimal` | Validaciones simples, re-prompts dirigidos | Mínima | Mínimo |
| `low` | Generación inicial, correcciones rápidas | Baja | Bajo |
| `medium` | Evaluación semántica (LLM-Critic) | Media | Medio |
| `high` | Tareas complejas, análisis profundo | Alta | Mayor |

**Configuración recomendada por componente:**

| Componente | Thinking Level | Justificación |
|------------|----------------|---------------|
| Generador inicial | `low` | Balance velocidad/calidad |
| Autocorrección | `minimal` | Cambios dirigidos, no requiere análisis profundo |
| LLM-Critic (semántico) | `medium` | Requiere evaluación de rúbrica |
| Casos complejos/escalados | `high` | Análisis exhaustivo |

### 2.4 Ejemplo de Integración

```python
from google import genai
from google.genai import types

# Inicializar cliente
client = genai.Client(api_key="YOUR_API_KEY")

# Generación con structured output
response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="[PROMPT DE GENERACIÓN]",
    config=types.GenerateContentConfig(
        temperature=1.0,  # Recomendado por Google para Gemini 3
        thinking_config=types.ThinkingConfig(thinking_level="low"),
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "nombres": {"type": "array", "items": {"type": "string"}},
                "objetivos": {"type": "array", "items": {"type": "string"}},
                "descripcion": {"type": "object"}
            },
            "required": ["nombres", "objetivos", "descripcion"]
        }
    )
)
```

### 2.5 Consideraciones Importantes

1. **Temperature:** Google recomienda mantener `temperature=1.0` para Gemini 3
2. **SDK mínimo:** Requiere `google-generativeai >= 1.51.0` para soportar `ThinkingConfig`
3. **Thought Signatures:** Requeridas incluso con `thinking_level="minimal"` para function calling
4. **Structured Output:** Compatible con `response_mime_type` y `response_json_schema`

### 2.6 Endpoints y Autenticación

```python
# Opción 1: Google AI Studio (recomendado para desarrollo)
import google.generativeai as genai
genai.configure(api_key="YOUR_API_KEY")

# Opción 2: Vertex AI (recomendado para producción)
from google.cloud import aiplatform
aiplatform.init(project="PROJECT_ID", location="us-central1")

# Endpoint REST directo
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview"
```

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA 5: INTERFAZ QA/HITL                 │
│         (Aprobación/Rechazo con comentarios)                │
├─────────────────────────────────────────────────────────────┤
│                CAPA 4: VALIDADOR SEMÁNTICO                  │
│    (LLM-Critic para objetivos medibles/observables)         │
├─────────────────────────────────────────────────────────────┤
│              CAPA 3: MOTOR DE AUTOCORRECCIÓN                │
│       (Re-prompt dirigido, máximo N intentos)               │
├─────────────────────────────────────────────────────────────┤
│            CAPA 2: VALIDADOR DETERMINISTA                   │
│     (Schema JSON + reglas de conteo/rango)                  │
├─────────────────────────────────────────────────────────────┤
│                 CAPA 1: GENERACIÓN LLM                      │
│              (Produce JSON estructurado)                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Máquina de Estados

```
DRAFT_INPUT
    ↓
GENERATED
    ↓
AUTO_VALIDATION_FAILED ←──┐
    ↓                     │
AUTO_CORRECTING(n) ───────┘ (si n < MAX_AUTO_RETRIES)
    ↓
SEMANTIC_CHECK
    ↓
READY_FOR_QA
    ↓
QA_REJECTED ──→ READY_FOR_QA (si intentos HITL < MAX)
    ↓
APPROVED ──→ [PASO 02]
    │
    └──→ ESCALATED (si excede límites)
```

---

## 4. Componentes a Desarrollar

### 4.1 Módulo: Generador LLM (Gemini 3 Flash)

**Archivo:** `src/generators/step01_generator.py`

**Responsabilidades:**
- Recibir "idea central" como input
- Invocar Gemini 3 Flash con prompt estructurado
- Retornar JSON con formato estándar usando structured output nativo

**Implementación con Gemini 3 Flash:**
```python
from google import genai
from google.genai import types
from typing import Optional
import json

class Step01Generator:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3-flash-preview"

    def generate(self, idea_central: str, thinking_level: str = "low") -> dict:
        """Genera artefacto estructurado desde idea central."""

        prompt = self._build_prompt(idea_central)

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=1.0,
                thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
                response_mime_type="application/json",
                response_schema=self._get_schema()
            )
        )

        return json.loads(response.text)

    def _get_schema(self) -> dict:
        """Schema JSON para structured output."""
        return {
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
                    "required": ["texto", "publico_objetivo", "beneficios",
                                "estructura_general", "diferenciador"]
                }
            },
            "required": ["nombres", "objetivos", "descripcion"]
        }

    def _build_prompt(self, idea_central: str) -> str:
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
"""
```

**Contrato de salida (JSON Schema):**
```json
{
  "nombres": ["string", "string", "string"],
  "objetivos": ["string"],  // 3-6 elementos
  "descripcion": {
    "texto": "string",  // 150-200 palabras
    "publico_objetivo": "string",
    "beneficios": "string",
    "estructura_general": "string",
    "diferenciador": "string"
  }
}
```

---

### 4.2 Módulo: Validadores Deterministas

**Archivo:** `src/validators/deterministic_validators.py`

**Interfaz estándar para cada validador:**
```python
{
  "pass": bool,
  "code": "VAL_001",
  "message": "string",
  "observed": any  # conteo, lista, etc.
}
```

**Validadores a implementar:**

| ID | Validador | Regla | Acción si falla |
|----|-----------|-------|-----------------|
| VAL_001 | `validate_names_count` | Exactamente 3 nombres | BLOCK → Re-prompt |
| VAL_002 | `validate_objectives_count` | Entre 3-6 objetivos | BLOCK → Re-prompt |
| VAL_003 | `validate_description_length` | 150-200 palabras | BLOCK → Re-prompt |
| VAL_004 | `validate_structure` | Todas las secciones presentes | BLOCK → Re-prompt |
| VAL_005 | `validate_json_schema` | JSON válido contra schema | BLOCK → Re-prompt |

**Tareas de implementación:**
1. Crear clase base `DeterministicValidator`
2. Implementar cada validador como función pura
3. Crear runner que ejecute todos los validadores
4. Agregar tests unitarios para cada validador

---

### 4.3 Módulo: Motor de Autocorrección (con Gemini 3 Flash)

**Archivo:** `src/correction/auto_correction_engine.py`

**Responsabilidades:**
- Recibir resultado de validación fallida
- Generar re-prompt dirigido (NO regeneración total)
- Controlar contador de intentos automáticos
- Decidir si escalar a QA o reintentar

**Plantillas de re-prompt dirigido:**

```markdown
# Re-prompt para VAL_001 (nombres)
El output anterior tiene {observed} nombres, pero se requieren exactamente 3.
Modifica SOLO la sección de nombres. Mantén todo lo demás intacto.
Output anterior: {previous_output}
Genera exactamente 3 nombres alternativos para el curso.

# Re-prompt para VAL_002 (objetivos)
El output anterior tiene {observed} objetivos, pero se requieren entre 3 y 6.
Modifica SOLO la sección de objetivos. Mantén todo lo demás intacto.
{instrucción_específica: agregar/eliminar}

# Re-prompt para VAL_003 (longitud descripción)
La descripción tiene {observed} palabras, pero debe tener entre 150-200.
Modifica SOLO la descripción. Mantén nombres y objetivos intactos.
{instrucción_específica: expandir/condensar}
```

**Implementación con Gemini 3 Flash (thinking_level="minimal"):**
```python
from google import genai
from google.genai import types
import json

class AutoCorrectionEngine:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3-flash-preview"
        self.max_retries = 3

    def correct(self, artifact: dict, validation_error: dict) -> dict:
        """Corrige el artefacto basándose en el error de validación."""

        correction_prompt = self._build_correction_prompt(artifact, validation_error)

        response = self.client.models.generate_content(
            model=self.model,
            contents=correction_prompt,
            config=types.GenerateContentConfig(
                temperature=1.0,
                # Usa 'minimal' para correcciones rápidas y económicas
                thinking_config=types.ThinkingConfig(thinking_level="minimal"),
                response_mime_type="application/json",
                response_schema=self._get_partial_schema(validation_error["code"])
            )
        )

        corrected_section = json.loads(response.text)
        return self._merge_artifact(artifact, corrected_section, validation_error["code"])

    def _build_correction_prompt(self, artifact: dict, error: dict) -> str:
        prompts = {
            "VAL_001": f"""El artefacto tiene {error['observed']} nombres, pero se requieren exactamente 3.
Genera SOLO 3 nombres alternativos para el curso.
Contexto del curso: {artifact.get('descripcion', {}).get('texto', '')}""",

            "VAL_002": f"""El artefacto tiene {error['observed']} objetivos, pero se requieren entre 3 y 6.
{'Agrega más objetivos.' if error['observed'] < 3 else 'Reduce a máximo 6 objetivos.'}
Objetivos actuales: {artifact.get('objetivos', [])}""",

            "VAL_003": f"""La descripción tiene {error['observed']} palabras, pero debe tener entre 150-200.
{'Expande' if error['observed'] < 150 else 'Condensa'} la siguiente descripción:
{artifact.get('descripcion', {}).get('texto', '')}"""
        }
        return prompts.get(error["code"], "Corrige el error indicado.")

    def _merge_artifact(self, original: dict, correction: dict, error_code: str) -> dict:
        """Merge conservando secciones válidas."""
        merged = original.copy()
        if error_code == "VAL_001":
            merged["nombres"] = correction.get("nombres", original["nombres"])
        elif error_code == "VAL_002":
            merged["objetivos"] = correction.get("objetivos", original["objetivos"])
        elif error_code == "VAL_003":
            merged["descripcion"]["texto"] = correction.get("texto", original["descripcion"]["texto"])
        return merged
```

**Tareas de implementación:**
1. Definir plantillas de re-prompt para cada tipo de falla
2. Implementar lógica de merge (mantener secciones válidas)
3. Configurar `MAX_AUTO_RETRIES` (sugerido: 3)
4. Implementar logging de cada intento

---

### 4.4 Módulo: Validador Semántico (LLM-Critic con Gemini)

**Archivo:** `src/validators/semantic_validator.py`

**Responsabilidades:**
- Evaluar calidad semántica de objetivos
- Aplicar rúbrica de "medible/observable"
- Retornar score de confianza y justificación

**Contrato de salida:**
```python
{
  "pass": bool,
  "confidence": float,  # 0.0 - 1.0
  "rationale": "string",
  "objective_scores": [
    {"objective": "string", "score": float, "feedback": "string"}
  ]
}
```

**Rúbrica para objetivos medibles/observables:**
```markdown
Criterio 1: ¿Contiene verbo de acción observable?
  - Ejemplos válidos: identificar, aplicar, demostrar, crear, analizar
  - Ejemplos inválidos: entender, conocer, apreciar, saber

Criterio 2: ¿El resultado es verificable?
  - ¿Se puede determinar objetivamente si se logró?

Criterio 3: ¿Evita vaguedades?
  - Sin "diversos", "varios", "algunos", "mejor", etc.
```

**Implementación con Gemini 3 Flash (thinking_level="medium"):**
```python
from google import genai
from google.genai import types
import json
from typing import List

class SemanticValidator:
    def __init__(self, api_key: str, confidence_threshold: float = 0.7):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3-flash-preview"
        self.confidence_threshold = confidence_threshold

    def validate(self, objectives: List[str]) -> dict:
        """Evalúa semánticamente los objetivos de aprendizaje."""

        prompt = self._build_critic_prompt(objectives)

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=1.0,
                # Usa 'medium' para evaluación semántica profunda
                thinking_config=types.ThinkingConfig(thinking_level="medium"),
                response_mime_type="application/json",
                response_schema=self._get_evaluation_schema()
            )
        )

        result = json.loads(response.text)
        result["pass"] = result["confidence"] >= self.confidence_threshold
        return result

    def _build_critic_prompt(self, objectives: List[str]) -> str:
        return f"""Eres un evaluador experto en diseño instruccional. Evalúa los siguientes
objetivos de aprendizaje según la rúbrica proporcionada.

OBJETIVOS A EVALUAR:
{chr(10).join(f'{i+1}. {obj}' for i, obj in enumerate(objectives))}

RÚBRICA DE EVALUACIÓN:

Criterio 1: ¿Contiene verbo de acción observable?
- Ejemplos VÁLIDOS: identificar, aplicar, demostrar, crear, analizar, diseñar, implementar
- Ejemplos INVÁLIDOS: entender, conocer, apreciar, saber, comprender

Criterio 2: ¿El resultado es verificable?
- ¿Se puede determinar objetivamente si el estudiante logró el objetivo?

Criterio 3: ¿Evita vaguedades?
- No debe contener: "diversos", "varios", "algunos", "mejor", "adecuadamente"

Para cada objetivo, asigna un score de 0.0 a 1.0 y proporciona feedback específico.
Calcula la confianza general como el promedio de todos los scores.
"""

    def _get_evaluation_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
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
```

**Tareas de implementación:**
1. Diseñar prompt de evaluación con rúbrica
2. Implementar parsing de respuesta del critic
3. Definir umbral de aceptación (sugerido: confidence > 0.7)
4. Configurar fallback a QA si confidence < umbral

---

### 4.5 Módulo: Sistema QA/HITL

**Archivo:** `src/qa/qa_workflow.py`

**Responsabilidades:**
- Encolar artefactos para revisión humana
- Registrar decisión (aprobado/rechazado)
- Capturar comentarios de QA
- Controlar límite de iteraciones HITL

**Interfaz de cola QA:**
```python
{
  "queue_item_id": "uuid",
  "artifact": {...},
  "validation_results": [...],
  "semantic_review": {...},
  "status": "pending_review" | "approved" | "rejected",
  "qa_comments": "string",
  "qa_user": "string",
  "reviewed_at": "timestamp"
}
```

**Tareas de implementación:**
1. Crear modelo de datos para cola QA
2. Implementar API/interfaz para revisores
3. Integrar con sistema de notificaciones
4. Implementar contador de `attempt_count_hitl`

---

### 4.6 Módulo: Trazabilidad y Logging

**Archivo:** `src/audit/trace_logger.py`

**Campos mínimos por evento:**
```python
{
  "step_id": "GO-ESP-01",
  "run_id": "uuid",
  "version_prompt": "v1.2.3",
  "model_id": "gemini-3-flash-preview",
  "thinking_level": "low" | "minimal" | "medium" | "high",
  "attempt_count_auto": int,
  "attempt_count_hitl": int,
  "validators": [
    {"code": "VAL_001", "pass": bool, "message": str, "observed": any}
  ],
  "semantic_review": {
    "pass": bool,
    "confidence": float,
    "rationale": str
  },
  "qa_decision": "approved" | "rejected" | null,
  "qa_comments": str,
  "qa_user": str,
  "timestamps": {
    "started_at": "ISO8601",
    "generated_at": "ISO8601",
    "validated_at": "ISO8601",
    "qa_completed_at": "ISO8601"
  },
  "artifacts": {
    "input_idea_central": str,
    "output_json": {...},
    "output_render_humano": str
  },
  "llm_ops": {
    "token_usage": {"input": int, "output": int},
    "latency_ms": int,
    "cost_estimate": float
  }
}
```

**Tareas de implementación:**
1. Definir schema de eventos de auditoría
2. Implementar logger estructurado (JSON)
3. Configurar persistencia (archivo/BD/servicio)
4. Crear índices para consultas comunes

---

## 5. Esquemas y Contratos

### 5.1 JSON Schema del Artefacto Base

**Archivo:** `schemas/step01_artifact.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Step01Artifact",
  "type": "object",
  "required": ["nombres", "objetivos", "descripcion"],
  "properties": {
    "nombres": {
      "type": "array",
      "items": {"type": "string", "minLength": 5},
      "minItems": 3,
      "maxItems": 3
    },
    "objetivos": {
      "type": "array",
      "items": {"type": "string", "minLength": 10},
      "minItems": 3,
      "maxItems": 6
    },
    "descripcion": {
      "type": "object",
      "required": ["texto", "publico_objetivo", "beneficios", "estructura_general", "diferenciador"],
      "properties": {
        "texto": {"type": "string"},
        "publico_objetivo": {"type": "string", "minLength": 10},
        "beneficios": {"type": "string", "minLength": 10},
        "estructura_general": {"type": "string", "minLength": 10},
        "diferenciador": {"type": "string", "minLength": 10}
      }
    }
  }
}
```

---

## 6. Configuración y Parámetros

**Archivo:** `config/step01_config.yaml`

```yaml
step01:
  # Límites de iteración
  max_auto_retries: 3          # Reintentos automáticos por validación determinista
  max_hitl_iterations: 2       # Ciclos de revisión QA antes de escalar

  # Umbrales de validación
  description_min_words: 150
  description_max_words: 200
  names_count: 3
  objectives_min: 3
  objectives_max: 6

  # Validación semántica
  semantic_confidence_threshold: 0.7
  semantic_enabled: true

  # LLM Configuration (Gemini 3 Flash)
  llm:
    provider: "google"
    model: "gemini-3-flash-preview"
    temperature: 1.0           # Recomendado por Google para Gemini 3
    max_tokens: 8192

    # Thinking levels por componente
    thinking_levels:
      generation: "low"        # Generación inicial
      correction: "minimal"    # Autocorrección rápida
      semantic_critic: "medium" # Evaluación semántica
      escalated: "high"        # Casos complejos

    # Structured output
    response_mime_type: "application/json"

  # Logging
  audit:
    enabled: true
    include_llm_ops: true
    storage: "file"            # file | database | api
```

---

## 7. Especificación YAML Implementable (Spec Formal)

Esta especificación sirve como **contrato técnico** del paso GO-ESP-01.

```yaml
step_id: GO-ESP-01
name: Definición inicial del curso
version: "1.0"

# Condiciones de inicio y fin
start_conditions:
  - idea_central_present: true
  - ia_access_available: true
  - output_language_required: "es"

end_conditions:
  - names_count_exactly_3: true
  - objectives_count_between_3_and_6: true
  - description_word_count_between_150_and_200: true
  - description_contains_required_elements: true
  - qa_approved: true
  - persisted_to_coda: true

# Inputs del paso
inputs:
  - name: idea_central
    type: string
    constraints: ["non_empty", "max_chars:500"]
    description: "Idea central del curso en 1 frase"
  - name: course_id
    type: string
    description: "Identificador único del curso"
  - name: operator_id
    type: string
    description: "ID del operador que ejecuta"
  - name: locale
    type: enum
    values: ["es", "es-MX", "es-ES"]
    default: "es"
  - name: iteration_count
    type: integer
    default: 0

# Outputs del paso
outputs:
  - name: artifact
    type: object
    schema_ref: "#/schemas/GO_ESP_01_artifact"
  - name: qa_packet
    type: object
    schema_ref: "#/schemas/QA_packet"
  - name: coda_record_id
    type: string

# Validaciones (reglas de negocio)
validations:
  - id: VAL_001
    rule: "len(names)==3"
    severity: "error"
    message: "Deben ser exactamente 3 nombres."
    how: "validate_artifact_schema"

  - id: VAL_002
    rule: "3<=len(objectives)<=6"
    severity: "error"
    message: "Deben ser 3–6 objetivos."
    how: "validate_artifact_schema"

  - id: VAL_003
    rule: "150<=count_words_es(description)<=200"
    severity: "error"
    message: "La descripción debe tener 150–200 palabras."
    how: "count_words_es"

  - id: VAL_004
    rule: "artifact.sections == [Nombres, Objetivos, Descripción]"
    severity: "error"
    message: "Formato inválido: debe venir por secciones."
    how: "validate_artifact_schema + regex headings"

  - id: VAL_005
    rule: "description_has_elements(público, beneficios, estructura, diferenciador)"
    severity: "warning"
    message: "Faltan elementos en la descripción."
    how: "llm_critic_description_elements OR heuristic keywords"

  - id: VAL_006
    rule: "objectives_measurable"
    severity: "warning"
    message: "Objetivos deben ser medibles/observables."
    how: "check_objectives_measurable_llmcritic"

# Máquina de estados
states:
  - name: DRAFT_GENERATED
    on:
      - event: "generate_artifact"
        to: VALIDATING_DETERMINISTIC

  - name: VALIDATING_DETERMINISTIC
    on:
      - event: "deterministic_fail"
        to: AUTO_REPAIR
      - event: "deterministic_pass"
        to: VALIDATING_SEMANTIC

  - name: VALIDATING_SEMANTIC
    on:
      - event: "semantic_fail"
        to: AUTO_REPAIR
      - event: "semantic_pass"
        to: QA_REVIEW

  - name: AUTO_REPAIR
    on:
      - event: "retry_allowed"
        to: DRAFT_GENERATED
      - event: "retry_exhausted"
        to: ESCALATED

  - name: QA_REVIEW
    on:
      - event: "qa_approved"
        to: PERSISTED
      - event: "qa_rejected"
        to: AUTO_REPAIR

  - name: ESCALATED
    terminal: true

  - name: PERSISTED
    terminal: true

# Política de escalamiento
escalation_policy:
  max_auto_retries: 3          # Reintentos automáticos (sin HITL)
  max_hitl_iterations: 2       # Ciclos de revisión QA
  escalate_to_role: "Cliente/Superior directo"
  escalate_when:
    - "iteration_count >= 2 AND DoD_not_met"

# Campos de auditoría
audit_log_fields:
  - course_id
  - idea_central
  - iteration_count
  - status                     # En revision QA / Aprobado / Rechazado / Escalado
  - operator_id
  - qa_approver_id
  - qa_decision_timestamp
  - artifact_text_final
  - artifact_text_candidates
  - validation_results
  - escalation_payload_links
  - created_at
  - updated_at

# Schemas referenciados
schemas:
  GO_ESP_01_artifact:
    type: object
    required: ["names", "objectives", "description_es"]
    properties:
      names:
        type: array
        minItems: 3
        maxItems: 3
        items: { type: string }
      objectives:
        type: array
        minItems: 3
        maxItems: 6
        items: { type: string }
      description_es:
        type: string

  QA_packet:
    type: object
    required: ["artifact", "checks", "notes"]
    properties:
      artifact: { "$ref": "#/schemas/GO_ESP_01_artifact" }
      checks:
        type: object
        properties:
          names_ok: { type: boolean }
          objectives_count_ok: { type: boolean }
          word_count_ok: { type: boolean }
          elements_ok: { type: boolean }
          objectives_measurable_ok: { type: boolean }
      notes:
        type: string
```

---

## 8. Flujo de Ejecución Detallado

### 7.1 Flujo Principal

```
1. RECIBIR idea_central (input humano)
   │
2. GENERAR artefacto via LLM
   │
3. VALIDAR determinísticamente
   │
   ├─[FALLA]─→ ¿intentos < MAX_AUTO?
   │              ├─[SÍ]─→ AUTO-CORREGIR → volver a paso 3
   │              └─[NO]─→ ESCALAR
   │
   └─[PASA]─→ 4. VALIDAR semánticamente
                  │
                  ├─[CONFIANZA < UMBRAL]─→ ENCOLAR para QA
                  │
                  └─[CONFIANZA >= UMBRAL]─→ 5. ENCOLAR para QA
                                               │
                                               ├─[APROBADO]─→ FINALIZAR → Paso 02
                                               │
                                               └─[RECHAZADO]─→ ¿intentos_hitl < MAX?
                                                                 ├─[SÍ]─→ REGENERAR con feedback
                                                                 └─[NO]─→ ESCALAR
```

---

## 8. Estructura de Directorios Propuesta

```
step01_automation/
├── src/
│   ├── __init__.py
│   ├── main.py                      # Orquestador principal
│   ├── generators/
│   │   ├── __init__.py
│   │   ├── step01_generator.py      # Generación LLM
│   │   └── prompts/
│   │       ├── initial_generation.md
│   │       └── correction_templates/
│   │           ├── fix_names.md
│   │           ├── fix_objectives.md
│   │           └── fix_description.md
│   ├── validators/
│   │   ├── __init__.py
│   │   ├── deterministic_validators.py
│   │   ├── semantic_validator.py
│   │   └── validator_runner.py
│   ├── correction/
│   │   ├── __init__.py
│   │   └── auto_correction_engine.py
│   ├── qa/
│   │   ├── __init__.py
│   │   └── qa_workflow.py
│   ├── audit/
│   │   ├── __init__.py
│   │   └── trace_logger.py
│   └── adapters/
│       ├── __init__.py
│       ├── gemini_adapter.py        # Cliente Gemini 3 Flash
│       └── storage_adapter.py       # Abstracción de persistencia
├── schemas/
│   └── step01_artifact.json
├── config/
│   └── step01_config.yaml
├── tests/
│   ├── test_validators.py
│   ├── test_generator.py
│   ├── test_correction.py
│   └── fixtures/
│       ├── valid_artifacts.json
│       └── invalid_artifacts.json
└── docs/
    └── api_reference.md
```

---

## 9. Tareas de Implementación (Ordenadas)

### Fase 1: Fundamentos
- [ ] 1.1 Crear estructura de directorios
- [ ] 1.2 Definir JSON Schema del artefacto
- [ ] 1.3 Crear archivo de configuración base
- [ ] 1.4 Implementar Gemini adapter (`gemini_adapter.py`)
- [ ] 1.5 Configurar autenticación (API Key / Vertex AI)

### Fase 2: Generación
- [ ] 2.1 Diseñar prompt de generación inicial
- [ ] 2.2 Implementar generador LLM
- [ ] 2.3 Implementar parser JSON de respuesta
- [ ] 2.4 Crear tests con fixtures

### Fase 3: Validación Determinista
- [ ] 3.1 Implementar `validate_names_count`
- [ ] 3.2 Implementar `validate_objectives_count`
- [ ] 3.3 Implementar `validate_description_length`
- [ ] 3.4 Implementar `validate_structure`
- [ ] 3.5 Implementar `validate_json_schema`
- [ ] 3.6 Crear validator runner
- [ ] 3.7 Tests unitarios para cada validador

### Fase 4: Autocorrección
- [ ] 4.1 Diseñar plantillas de re-prompt dirigido
- [ ] 4.2 Implementar motor de autocorrección
- [ ] 4.3 Implementar lógica de merge de secciones
- [ ] 4.4 Tests de ciclos de corrección

### Fase 5: Validación Semántica
- [ ] 5.1 Definir rúbrica de objetivos medibles
- [ ] 5.2 Diseñar prompt de LLM-critic
- [ ] 5.3 Implementar validador semántico
- [ ] 5.4 Calibrar umbrales con ejemplos reales

### Fase 6: QA/HITL
- [ ] 6.1 Diseñar modelo de datos de cola QA
- [ ] 6.2 Implementar workflow de QA
- [ ] 6.3 Crear interfaz para revisores (API/UI)
- [ ] 6.4 Integrar control de iteraciones HITL

### Fase 7: Trazabilidad
- [ ] 7.1 Definir schema de eventos de auditoría
- [ ] 7.2 Implementar logger estructurado
- [ ] 7.3 Configurar persistencia
- [ ] 7.4 Crear queries de consulta comunes

### Fase 8: Integración
- [ ] 8.1 Implementar orquestador principal (máquina de estados)
- [ ] 8.2 Integrar todos los módulos
- [ ] 8.3 Tests de integración end-to-end
- [ ] 8.4 Documentar API

### Fase 9: Render Humano
- [ ] 9.1 Crear template de render markdown
- [ ] 9.2 Implementar generador de render desde JSON
- [ ] 9.3 Validar equivalencia JSON ↔ render

---

## 10. Decisiones Pendientes (OPEN_QUESTIONS)

Antes de implementar, se requiere definición formal de:

| # | Pregunta | Impacto en Implementación |
|---|----------|---------------------------|
| 1 | ¿"Iteración" incluye reintentos automáticos o solo ciclos HITL? | Define valores de `max_auto_retries` vs `max_hitl_iterations` |
| 2 | ¿Input "idea central" siempre humano o puede ser IA refinada? | Diseño de UI y validación de input |
| 3 | ¿Coda obligatorio o equivalente funcional aceptable? | Elección de storage adapter |
| 4 | Rúbrica exacta para "objetivos medibles/observables" | Configuración del LLM-critic |
| 5 | ¿Validar idioma español obligatoriamente? | Agregar validador de idioma |
| 6 | ¿Dónde se versiona el prompt y quién aprueba cambios? | Diseño de config management |

---

## 11. Métricas de Éxito

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Tasa de aprobación automática | > 70% sin HITL | `approved_auto / total_runs` |
| Reducción de iteraciones QA | < 1.5 promedio | `sum(attempt_count_hitl) / total_runs` |
| Tiempo de ciclo | < 5 min (auto) | `qa_completed_at - started_at` |
| Tasa de escalamiento | < 5% | `escalated / total_runs` |
| Consistencia de artefactos | 100% schema-valid | Validación post-hoc |

---

## 12. Subagentes Claude Code (Estrategia de Desarrollo)

Estos subagentes definen cómo usar Claude Code para **construir el sistema** de forma organizada y paralelizable.

### 12.1 Definiciones de Subagentes

```yaml
subagents:
  - name: process-analyst
    purpose: "Extraer DoD/reglas del SOP y convertirlas en validaciones y estados."
    allowed_tools: ["read_files", "search_in_repo"]
    inputs: ["SOP PDF/text", "PLAN_IMPLEMENTACION.md"]
    outputs: ["rules.yaml", "state_machine.yaml", "open_questions.md"]
    done_definition: "Reglas completas del Paso 1, sin inventar, con OPEN_QUESTIONS explícitas."

  - name: backend-architect
    purpose: "Diseñar API, módulos y state machine (Python) para GO-ESP-01."
    allowed_tools: ["read_files", "write_files", "run_tests"]
    inputs: ["rules.yaml", "schemas", "tool_contracts"]
    outputs: ["api_routes.md", "state_machine_impl_plan.md", "db_or_coda_model.md"]
    done_definition: "Plan implementable + contratos de datos + endpoints + estados."

  - name: validator-engineer
    purpose: "Implementar validaciones deterministas + suite de pruebas."
    allowed_tools: ["write_files", "run_python"]
    inputs: ["schemas", "rules.yaml"]
    outputs: ["validators.py", "test_validators.py", "fixtures/"]
    done_definition: "Valida conteos/secciones/wordcount y tests pasan."

  - name: llmops-engineer
    purpose: "Diseñar prompts para Gemini, retry policy, structured outputs, observabilidad."
    allowed_tools: ["write_files", "read_files"]
    inputs: ["rules.yaml", "state_machine.yaml"]
    outputs: ["prompts/gemini_go_esp_01.md", "schemas/artifact.json", "retry_policy.md"]
    done_definition: "Prompts y schemas alineados al SOP, con salidas parseables."

  - name: qa-hitl-designer
    purpose: "Diseñar flujo QA: UI/cola, evidencia requerida, y payload de escalamiento."
    allowed_tools: ["write_files", "read_files"]
    inputs: ["audit_log_fields", "rules.yaml"]
    outputs: ["qa_packet_schema.json", "qa_checklist.md", "escalation_template.md"]
    done_definition: "QA obligatorio y evidencias trazables según SOP."

  - name: security-reviewer
    purpose: "Revisar secretos, permisos, logging y least-privilege."
    allowed_tools: ["read_files", "search_in_repo"]
    inputs: ["repo_tree", "env_config"]
    outputs: ["security_findings.md", "recommendations.md"]
    done_definition: "No secrets en repo; políticas mínimas definidas."
```

### 12.2 Worktrees Paralelos (Recomendado)

Para maximizar velocidad de desarrollo, usar worktrees separados:

```
wt-backend/     → API + state machine
wt-validators/  → Python validadores + tests
wt-prompts/     → prompts + schemas + fixtures
wt-coda/        → persistencia + auditoría
```

---

## 13. Contratos JSON de Tools/Functions (Runtime)

Estos contratos definen las funciones que el sistema ejecuta en runtime.

```json
{
  "tools": [
    {
      "name": "validate_artifact_schema",
      "description": "Valida estructura y cardinalidades del artefacto GO-ESP-01.",
      "strict": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "artifact": { "type": "object" }
        },
        "required": ["artifact"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "pass": { "type": "boolean" },
          "errors": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    {
      "name": "count_words_es",
      "description": "Cuenta palabras de un texto en español (tokenización simple).",
      "strict": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "text": { "type": "string" }
        },
        "required": ["text"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "word_count": { "type": "integer" },
          "in_range": { "type": "boolean" }
        }
      }
    },
    {
      "name": "check_objectives_measurable_llmcritic",
      "description": "Evalúa si objetivos son medibles/observables (LLM critic).",
      "strict": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "objectives": { "type": "array", "items": { "type": "string" } },
          "locale": { "type": "string" }
        },
        "required": ["objectives", "locale"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "pass": { "type": "boolean" },
          "confidence": { "type": "number" },
          "feedback": { "type": "array", "items": { "type": "object" } }
        }
      }
    },
    {
      "name": "persist_to_coda",
      "description": "Guarda artefacto, estado, iteraciones y evidencia en Coda.",
      "strict": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "course_id": { "type": "string" },
          "status": {
            "type": "string",
            "enum": ["En revision QA", "Aprobado", "Rechazado", "Escalado"]
          },
          "operator_id": { "type": "string" },
          "qa_approver_id": { "type": "string" },
          "artifact_final": { "type": "object" },
          "artifact_candidates": { "type": "array", "items": { "type": "object" } },
          "iteration_count": { "type": "integer" },
          "validation_results": { "type": "object" }
        },
        "required": ["course_id", "status", "operator_id", "iteration_count", "validation_results"]
      }
    }
  ]
}
```

---

## 14. Casos de Prueba (Dado/Cuando/Entonces)

### 14.1 Tabla de Regla → Validación → Acción

| Regla (SOP) | Cómo validar | Si falla |
|-------------|--------------|----------|
| 3 nombres exactos | JSON schema (min=max=3) | Auto-repair: "corrige y entrega exactamente 3" |
| 3–6 objetivos | JSON schema (min=3 max=6) | Auto-repair focal: "ajusta a 3–6" |
| Objetivos medibles | LLM-critic + verbos prohibidos | Auto-repair: reescritura solo objetivos |
| 150–200 palabras | `count_words_es` | Auto-repair: acortar/extender manteniendo elementos |
| Incluye público/beneficios/estructura/diferenciador | Heurística + LLM-critic | Auto-repair: reescribir descripción |
| Máx 2 iteraciones | contador `iteration_count` | Escalar con paquete de evidencia |

### 14.2 Escenarios de Prueba

#### Happy Path
```gherkin
Dado una idea central válida "Curso de liderazgo transformacional"
Cuando Gemini genera el artefacto
Y pasa validaciones deterministas (3 nombres, 4 objetivos, 175 palabras)
Y pasa validación semántica (objetivos medibles, elementos presentes)
Y se envía a QA
Y QA aprueba
Entonces se persiste en Coda con status "Aprobado"
Y se genera coda_record_id
```

#### Edge Case: 2 nombres
```gherkin
Dado una salida con solo 2 nombres
Cuando corre validate_artifact_schema
Entonces falla con código VAL_001
Y se ejecuta Auto-repair (iteration_count += 1)
Y el re-prompt pide "corrige y entrega exactamente 3 nombres"
```

#### Edge Case: 7 objetivos
```gherkin
Dado una salida con 7 objetivos
Cuando corre validate_artifact_schema
Entonces falla con código VAL_002
Y se pide reducir a máximo 6 objetivos
```

#### Edge Case: 149 palabras
```gherkin
Dado una descripción con 149 palabras
Cuando corre count_words_es
Entonces falla con código VAL_003
Y se pide extender a 150–200 palabras sin perder elementos
```

#### Edge Case: Objetivos vagos
```gherkin
Dado objetivos con verbos "entender" y "conocer"
Cuando corre check_objectives_measurable_llmcritic
Entonces retorna warning/fail (confidence < 0.7)
Y se reescriben solo los objetivos con verbos observables
```

#### Edge Case: Iteración 2 aún falla
```gherkin
Dado iteration_count = 2
Y DoD no cumplido (aún tiene errores)
Cuando se valida
Entonces transiciona a estado ESCALATED
Y genera paquete de escalamiento con:
  - idea_central original
  - últimas 2 salidas generadas
  - criterios incumplidos específicos
```

### 14.3 Criterios de Aceptación por Módulo

| Módulo | Criterio de Aceptación |
|--------|------------------------|
| `validators` | 100% deterministic pass/fail consistente; tests cubren conteos y wordcount |
| `orchestrator` | Respeta state machine; nunca excede max_auto_retries |
| `qa` | No permite "Fin" sin aprobación registrada |
| `coda` | Guarda estado, versiones, evidencias (quién/cuándo) |
| `generator` | Retorna JSON válido 100% del tiempo usando structured output |

---

## 15. Tabla Consolidada de Validaciones

| ID | Regla (SOP) | Tipo | Validador | Severidad | Acción si falla |
|----|-------------|------|-----------|-----------|-----------------|
| VAL_001 | 3 nombres exactos | Determinista | JSON Schema | BLOCK | Re-prompt: "exactamente 3" |
| VAL_002 | 3–6 objetivos | Determinista | JSON Schema | BLOCK | Re-prompt: "ajusta a 3–6" |
| VAL_003 | 150–200 palabras | Determinista | `count_words_es` | BLOCK | Re-prompt: expandir/condensar |
| VAL_004 | Estructura válida | Determinista | JSON Schema | BLOCK | Forzar re-emisión |
| VAL_005 | Elementos descripción | Mixta | Heurística + LLM | WARN→BLOCK | Re-prompt elementos faltantes |
| VAL_006 | Objetivos medibles | Semántica | LLM-critic | WARN→QA | Reescribir objetivos |
| ITER_MAX | Máx 2 iteraciones HITL | Control | `iteration_count` | ESCALATE | Paquete escalamiento |

### Verbos Prohibidos en Objetivos (VAL_006)
```
❌ Vagos: entender, conocer, apreciar, saber, comprender, aprender
✅ Observables: identificar, aplicar, demostrar, crear, analizar, diseñar, implementar, evaluar
```

---

## 16. Dependencias Técnicas

```
# Python packages requeridos
google-generativeai>=1.51.0   # SDK Gemini (MÍNIMO 1.51.0 para ThinkingConfig)
pydantic>=2.0                  # Validación de schemas
jsonschema>=4.0                # JSON Schema validation
pyyaml>=6.0                    # Configuración
structlog>=23.0                # Logging estructurado
pytest>=7.0                    # Testing
httpx>=0.24                    # HTTP client async

# Opcionales para Vertex AI (producción)
google-cloud-aiplatform>=1.40  # Vertex AI SDK
```

### Instalación

```bash
# Instalación básica (Google AI Studio)
pip install google-generativeai>=1.51.0 pydantic jsonschema pyyaml structlog

# Instalación completa (incluye Vertex AI)
pip install google-generativeai>=1.51.0 google-cloud-aiplatform pydantic jsonschema pyyaml structlog pytest
```

### 16.3 Configuración de API Key

```bash
# Opción 1: Variable de entorno
export GOOGLE_API_KEY="your-api-key"

# Opción 2: En código
import google.generativeai as genai
genai.configure(api_key="your-api-key")
```

---

## 17. Ejemplo de Uso Completo

```python
# main.py - Orquestador del Paso 01
import os
from src.generators.step01_generator import Step01Generator
from src.validators.deterministic_validators import DeterministicValidatorRunner
from src.validators.semantic_validator import SemanticValidator
from src.correction.auto_correction_engine import AutoCorrectionEngine
from src.audit.trace_logger import TraceLogger

def run_step01(idea_central: str) -> dict:
    """Ejecuta el pipeline completo del Paso 01."""

    api_key = os.getenv("GOOGLE_API_KEY")
    logger = TraceLogger()

    # Inicializar componentes
    generator = Step01Generator(api_key)
    deterministic_validator = DeterministicValidatorRunner()
    semantic_validator = SemanticValidator(api_key)
    correction_engine = AutoCorrectionEngine(api_key)

    # 1. Generar artefacto inicial
    logger.log_event("GENERATION_START", {"idea_central": idea_central})
    artifact = generator.generate(idea_central, thinking_level="low")
    logger.log_event("GENERATION_COMPLETE", {"artifact": artifact})

    # 2. Validación determinista con autocorrección
    auto_attempts = 0
    max_auto_retries = 3

    while auto_attempts < max_auto_retries:
        validation_result = deterministic_validator.validate(artifact)

        if validation_result["all_passed"]:
            break

        # Autocorregir primer error
        first_error = validation_result["errors"][0]
        logger.log_event("AUTO_CORRECTION", {"attempt": auto_attempts, "error": first_error})
        artifact = correction_engine.correct(artifact, first_error)
        auto_attempts += 1

    if not validation_result["all_passed"]:
        logger.log_event("ESCALATED", {"reason": "max_auto_retries_exceeded"})
        return {"status": "ESCALATED", "artifact": artifact}

    # 3. Validación semántica
    semantic_result = semantic_validator.validate(artifact["objetivos"])
    logger.log_event("SEMANTIC_VALIDATION", semantic_result)

    # 4. Preparar para QA
    return {
        "status": "READY_FOR_QA",
        "artifact": artifact,
        "validation": validation_result,
        "semantic": semantic_result,
        "auto_attempts": auto_attempts
    }

# Ejemplo de ejecución
if __name__ == "__main__":
    result = run_step01("Curso sobre liderazgo transformacional para gerentes")
    print(result)
```

---

## 18. Estimación de Costos (Gemini 3 Flash)

| Operación | Tokens Input | Tokens Output | Costo USD |
|-----------|--------------|---------------|-----------|
| Generación inicial | ~500 | ~800 | $0.0027 |
| Autocorrección (x1) | ~300 | ~200 | $0.0008 |
| Validación semántica | ~400 | ~500 | $0.0017 |
| **Total por artefacto (sin errores)** | ~900 | ~1300 | **$0.0044** |
| **Total con 2 autocorrecciones** | ~1500 | ~1700 | **$0.0059** |

### Proyección mensual

| Volumen | Artefactos/mes | Costo estimado |
|---------|----------------|----------------|
| Bajo | 100 | ~$0.50 |
| Medio | 500 | ~$2.50 |
| Alto | 2000 | ~$10.00 |

> **Nota:** Gemini 3 Flash es significativamente más económico que alternativas (GPT-4, Claude). El uso de `thinking_level="minimal"` para autocorrecciones reduce aún más los costos.

---

*Documento generado para la automatización del SOP GO-ESP-01*
*Versión: 2.0 — Incluye decisión arquitectónica Claude/Gemini, spec YAML, subagentes, tools y casos de prueba*
*Fecha: 2025-12-24*

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-12-22 | Versión inicial con arquitectura y componentes |
| 1.2 | 2025-12-23 | Implementaciones de código Gemini 3 Flash |
| **2.0** | **2025-12-24** | **+ Sección 0: Decisión arquitectónica Claude vs Gemini** |
| | | **+ Sección 7: Spec YAML implementable formal** |
| | | **+ Sección 12: Subagentes Claude Code para desarrollo** |
| | | **+ Sección 13: Contratos JSON de Tools/Functions** |
| | | **+ Sección 14: Casos de prueba Gherkin** |
| | | **+ Sección 15: Tabla consolidada de validaciones** |

---

## Referencias

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Gemini 3 Flash Preview - OpenRouter](https://openrouter.ai/google/gemini-3-flash-preview)
- [Google Developers Blog - Gemini 3 Flash](https://blog.google/products/gemini/gemini-3-flash/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs/models)
