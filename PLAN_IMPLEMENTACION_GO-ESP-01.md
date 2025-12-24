# Plan de Implementación — GO-ESP-01
## Automatización del Paso 01: Normalización de Insumo y Artefacto Base

---

## 1. Resumen Ejecutivo

Este plan detalla la implementación de un sistema automatizado para el **Paso 01** del proceso de creación de cursos, que transforma una "idea central" en un artefacto estructurado (3 nombres, 3-6 objetivos, descripción 150-200 palabras).

**Objetivo principal:** Reducir intervención humana en validaciones mecánicas, garantizar consistencia y trazabilidad, y reservar HITL solo para evaluaciones semánticas.

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Capas

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

### 2.2 Máquina de Estados

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

## 3. Componentes a Desarrollar

### 3.1 Módulo: Generador LLM

**Archivo:** `src/generators/step01_generator.py`

**Responsabilidades:**
- Recibir "idea central" como input
- Invocar LLM con prompt estructurado
- Retornar JSON con formato estándar

**Tareas de implementación:**
1. Definir plantilla de prompt para generación inicial
2. Implementar LLM adapter (abstracción de proveedor)
3. Configurar parámetros de modelo (temperatura, max_tokens)
4. Parsear respuesta a estructura JSON

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

### 3.2 Módulo: Validadores Deterministas

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

### 3.3 Módulo: Motor de Autocorrección

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

**Tareas de implementación:**
1. Definir plantillas de re-prompt para cada tipo de falla
2. Implementar lógica de merge (mantener secciones válidas)
3. Configurar `MAX_AUTO_RETRIES` (sugerido: 3)
4. Implementar logging de cada intento

---

### 3.4 Módulo: Validador Semántico (LLM-Critic)

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

**Tareas de implementación:**
1. Diseñar prompt de evaluación con rúbrica
2. Implementar parsing de respuesta del critic
3. Definir umbral de aceptación (sugerido: confidence > 0.7)
4. Configurar fallback a QA si confidence < umbral

---

### 3.5 Módulo: Sistema QA/HITL

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

### 3.6 Módulo: Trazabilidad y Logging

**Archivo:** `src/audit/trace_logger.py`

**Campos mínimos por evento:**
```python
{
  "step_id": "GO-ESP-01",
  "run_id": "uuid",
  "version_prompt": "v1.2.3",
  "model_id": "gpt-4" | "claude-3" | etc,
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

## 4. Esquemas y Contratos

### 4.1 JSON Schema del Artefacto Base

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

## 5. Configuración y Parámetros

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

  # LLM Configuration
  llm:
    provider: "openai"         # openai | anthropic | azure
    model: "gpt-4"
    temperature: 0.7
    max_tokens: 2000

  # Logging
  audit:
    enabled: true
    include_llm_ops: true
    storage: "file"            # file | database | api
```

---

## 6. Flujo de Ejecución Detallado

### 6.1 Flujo Principal

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

## 7. Estructura de Directorios Propuesta

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
│       ├── llm_adapter.py           # Abstracción de proveedor LLM
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

## 8. Tareas de Implementación (Ordenadas)

### Fase 1: Fundamentos
- [ ] 1.1 Crear estructura de directorios
- [ ] 1.2 Definir JSON Schema del artefacto
- [ ] 1.3 Crear archivo de configuración base
- [ ] 1.4 Implementar LLM adapter (abstracción de proveedor)

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

## 9. Decisiones Pendientes (OPEN_QUESTIONS)

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

## 10. Métricas de Éxito

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Tasa de aprobación automática | > 70% sin HITL | `approved_auto / total_runs` |
| Reducción de iteraciones QA | < 1.5 promedio | `sum(attempt_count_hitl) / total_runs` |
| Tiempo de ciclo | < 5 min (auto) | `qa_completed_at - started_at` |
| Tasa de escalamiento | < 5% | `escalated / total_runs` |
| Consistencia de artefactos | 100% schema-valid | Validación post-hoc |

---

## 11. Dependencias Técnicas

```
# Python packages sugeridos
pydantic>=2.0          # Validación de schemas
jsonschema>=4.0        # JSON Schema validation
openai>=1.0            # LLM adapter (OpenAI)
anthropic>=0.5         # LLM adapter (Anthropic)
pyyaml>=6.0            # Configuración
structlog>=23.0        # Logging estructurado
pytest>=7.0            # Testing
httpx>=0.24            # HTTP client async
```

---

*Documento generado para la automatización del SOP GO-ESP-01*
*Versión: 1.0*
*Fecha: 2025-12-23*
