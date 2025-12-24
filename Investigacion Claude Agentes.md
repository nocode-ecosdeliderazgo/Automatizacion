Aplícalo así: Claude Code (con subagentes) te sirve para construir y mantener el sistema, y el pipeline que ejecuta GO-ESP-01 (runtime) puede seguir siendo Gemini 3 Flash como “agente principal”.
CONFLICT: tú pediste antes “Claude = asistente del desarrollador, no agente del pipeline”, pero ahora pides “subagentes Claude que ejecuten los pasos del SOP”.

Interpretación A (recomendada): subagentes Claude colaboran para implementar el sistema; en runtime Gemini ejecuta generación/auto-corrección.

Interpretación B: runtime orquesta con Gemini, pero algunas subtareas (p.ej. creatividad de nombres o “critic”) se delegan a Claude subagents vía API.
DECISION_NEEDED: ¿Claude participa en runtime o solo en dev? (si es B, cambia seguridad/costos/observabilidad).

A partir de aquí te dejo la arquitectura implementable para SOP GO-ESP-01 Paso 1 (reglas: 3 nombres exactos, 3–6 objetivos, descripción 150–200 palabras en español; QA obligatorio; guardar en Coda; máximo 2 iteraciones y luego escalar).

SOP´s - Guías operativas V1

A) Extracción de requisitos (SOP 1 / GO-ESP-01)
1) Propósito

Transformar una idea central (1 frase) en una propuesta base de curso con exactamente 3 nombres, 3–6 objetivos medibles, y descripción en español de 150–200 palabras con elementos requeridos; aprobación QA obligatoria; y persistencia en Coda como insumo del Paso 2.

SOP´s - Guías operativas V1

2) Inputs / Outputs

Inputs (tipos)

idea_central: string (1 frase)

course_id: string

operator_id: string

locale: "es-MX" | "es-ES" | "es" (default es)

attempt: int (1..N)

Outputs

names: string[3]

objectives: string[3..6]

description_es: string (150–200 palabras)

qa_status: "En revision QA" | "Aprobado" | "Rechazado" | "Escalado"

iteration_count: int

evidence: { prompts, model_ids, timestamps }

coda_record_id: string

3) Precondiciones

Existe idea central.

Acceso a IA generativa.

Salida debe estar en español y por secciones Nombres / Objetivos / Descripción.

SOP´s - Guías operativas V1

4) Reglas duras (DoD, límites, iteraciones, escalamiento)

Nombres: exactamente 3.

SOP´s - Guías operativas V1

Objetivos: 3–6, con verbos de acción y medibles/observables.

SOP´s - Guías operativas V1

Descripción: 150–200 palabras, incluye público objetivo, beneficios, estructura general y diferenciador.

SOP´s - Guías operativas V1

QA obligatorio: sin aprobación no hay “Fin del tramo”.

SOP´s - Guías operativas V1

Persistencia: guardar versión final aprobada en Coda con trazabilidad.

SOP´s - Guías operativas V1

Límite iteraciones: si tras 2 correcciones no cumple DoD → Escalar.

SOP´s - Guías operativas V1

5) Roles / HITL

Operador: ejecuta prompt, valida DoD básico, retrabaja, registra en Coda.

SOP´s - Guías operativas V1

QA/Coordinación: revisa objetivos medibles + descripción; aprueba/rechaza con correcciones.

SOP´s - Guías operativas V1

Cliente/Superior: decide en bloqueos tras máximo de iteraciones (escalamiento).

SOP´s - Guías operativas V1

6) Errores típicos + acciones

2/4 nombres → pedir “corrige y entrega exactamente 3”. Escala si persiste 2 iteraciones.

SOP´s - Guías operativas V1

Objetivos vagos (“entender”) → pedir reescritura con resultados observables/medibles. Escala si persiste.

SOP´s - Guías operativas V1

Descripción 149/201 palabras o sin elementos → pedir ajuste + checklist. Escala si persiste.

SOP´s - Guías operativas V1

7) OPEN_QUESTIONS (mínimas)

OPEN_QUESTION: ¿Qué “Coda schema” exacto (tabla/columnas) ya existe?

Propuesta: definir CourseArtifacts con columnas mínimas del SOP (ver audit_log_fields).

Impacto: sin esto, persistencia y trazabilidad quedan inconsistentes.

B) Spec implementable (YAML) — GO-ESP-01 Paso 1
step_id: GO-ESP-01
name: Definición inicial del curso
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

inputs:
  - name: idea_central
    type: string
    constraints: ["non_empty", "max_chars:500"]
  - name: course_id
    type: string
  - name: operator_id
    type: string
  - name: locale
    type: enum
    values: ["es", "es-MX", "es-ES"]
    default: "es"
  - name: iteration_count
    type: integer
    default: 0

outputs:
  - name: artifact
    type: object
    schema_ref: "#/schemas/GO_ESP_01_artifact"
  - name: qa_packet
    type: object
    schema_ref: "#/schemas/QA_packet"
  - name: coda_record_id
    type: string

validations:
  - rule: "artifact.sections == [Nombres, Objetivos, Descripción]"
    severity: "error"
    message: "Formato inválido: debe venir por secciones Nombres/Objetivos/Descripción."
    how: "validate_artifact_schema + regex headings"
  - rule: "len(names)==3"
    severity: "error"
    message: "Deben ser exactamente 3 nombres."
    how: "validate_artifact_schema"
  - rule: "3<=len(objectives)<=6"
    severity: "error"
    message: "Deben ser 3–6 objetivos."
    how: "validate_artifact_schema"
  - rule: "150<=count_words_es(description)<=200"
    severity: "error"
    message: "La descripción debe tener 150–200 palabras."
    how: "count_words_es"
  - rule: "description_has_elements(público, beneficios, estructura, diferenciador)"
    severity: "warning"
    message: "Faltan elementos en la descripción (público/beneficios/estructura/diferenciador)."
    how: "llm_critic_description_elements OR heuristic keywords + llm fallback"
  - rule: "objectives_measurable"
    severity: "warning"
    message: "Objetivos deben ser medibles/observables y con verbos de acción."
    how: "check_objectives_measurable_llmcritic"

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

escalation_policy:
  max_auto_retries: 2
  max_hitl_iterations: 2
  escalate_to_role: "Cliente/Superior directo"
  escalate_when:
    - "iteration_count >= 2 AND DoD_not_met"

audit_log_fields:
  - course_id
  - idea_central
  - iteration_count
  - status  # En revisión QA / Aprobado / Rechazado / Escalado
  - operator_id
  - qa_approver_id
  - qa_decision_timestamp
  - artifact_text_final
  - artifact_text_candidates
  - validation_results
  - escalation_payload_links
  - created_at
  - updated_at

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

C) Cómo usar subagentes Claude (Claude Code) para implementar y operar SOP 1
Patrón recomendado

Gemini 3 Flash (runtime): genera/corrige el artefacto.

Python validators (runtime): validaciones deterministas (conteos, secciones, wordcount).

Claude subagentes (dev-time + opcional runtime):

Dev-time: generar specs, contratos, tests, prompts, estructura repo.

Opcional runtime (Interpretación B): actuar como “critic” semántico o generador alterno.

“Aplicación” práctica en Claude Code (worktrees + subagentes)

En Claude Code Desktop:

Abre worktrees para paralelizar features:

wt-backend (API + state machine)

wt-validators (Python validadores + tests)

wt-prompts (prompts + schemas + fixtures)

wt-coda (persistencia + auditoría)

Luego ejecuta chaining de subagentes (abajo) para que cada uno produzca artefactos versionables (YAML/JSON/tests).

D) Subagentes (definiciones iniciales)

Estos subagentes son para Claude Code (para construir el sistema). Si decides Interpretación B, reutilizas los mismos prompts/contratos para runtime.

subagents:
  - name: process-analyst
    purpose: "Extraer DoD/reglas del SOP y convertirlas en validaciones y estados."
    allowed_tools: ["read_files", "search_in_repo"]
    inputs: ["SOP PDF/text", "PLAN_IMPLEMENTACION.md"]
    outputs: ["rules.yaml", "state_machine.yaml", "open_questions.md"]
    done_definition: "Reglas completas del Paso 1, sin inventar, con OPEN_QUESTIONS explícitas."

  - name: backend-architect
    purpose: "Diseñar API, módulos y state machine (Next.js/Express o Python) para GO-ESP-01."
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

E) Tools / functions (contratos JSON) — runtime

Aquí asumo runtime en Python/Express. Marca strict: true en tu capa LLM (Gemini tools o tu wrapper) para forzar inputs válidos.

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
      }
    },
    {
      "name": "count_words_es",
      "description": "Cuenta palabras de un texto en español (tokenización simple por espacios + normalización).",
      "strict": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "text": { "type": "string" }
        },
        "required": ["text"]
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
          "status": { "type": "string", "enum": ["En revision QA", "Aprobado", "Rechazado", "Escalado"] },
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

F) Validadores + Suite de pruebas
1) Tabla regla → validación → acción
Regla (SOP)	Cómo validar	Si falla
3 nombres exactos	JSON schema (min=max=3)	Auto-repair: “corrige y entrega exactamente 3”
3–6 objetivos	JSON schema (min=3 max=6)	Auto-repair focal: “ajusta a 3–6”
Objetivos medibles	LLM-critic + lista de verbos prohibidos (“entender”, “conocer”)	Auto-repair: reescritura solo objetivos
150–200 palabras	count_words_es	Auto-repair: acortar/extender manteniendo elementos
Incluye público/beneficios/estructura/diferenciador	Heurística + LLM-critic	Auto-repair: reescribir descripción
Máx 2 iteraciones	contador iteration_count	Escalar con paquete de evidencia

Reglas y escalamiento vienen del SOP (2 iteraciones máx; QA obligatorio; guardar en Coda).

SOP´s - Guías operativas V1

2) Casos Dado/Cuando/Entonces

Happy path
Dado idea central válida, Cuando Gemini genera artefacto, Entonces pasa validaciones deterministas y semánticas, se envía a QA, QA aprueba, se persiste en Coda.

Edge: 2 nombres
Dado salida con 2 nombres, Cuando corre validate_artifact_schema, Entonces falla y se ejecuta Auto-repair (iteración +1).

Edge: 7 objetivos
Dado 7 objetivos, Cuando valida, Entonces falla y se pide reducir a 3–6.

Edge: 149 palabras
Dado 149 palabras, Cuando count_words_es, Entonces falla y se pide extender a 150–200 sin perder elementos.

Edge: Objetivos vagos
Dado objetivos con “entender/conocer”, Cuando check_objectives_measurable_llmcritic, Entonces warning/fail y se reescriben objetivos.

Edge: Iteración 2 aún falla
Dado iteration_count=2 y DoD no cumplido, Cuando valida, Entonces transiciona a ESCALATED y genera paquete de escalamiento con idea central + últimas salidas + criterios incumplidos.

SOP´s - Guías operativas V1

3) Criterios de aceptación por módulo

validators: 100% deterministic pass/fail consistente; tests cubren conteos y wordcount.

orchestrator: respeta state machine; nunca excede 2 auto-retries.

qa: no permite “Fin” sin aprobación registrada.

coda: guarda estado, versiones, evidencias (quién/cuándo)

SOP´s - Guías operativas V1

Referencias (SOP como fuente de verdad)

Reglas Paso 1: 3 nombres, 3–6 objetivos medibles, descripción 150–200 palabras con elementos, QA obligatorio, guardar en Coda, máximo 2 iteraciones y escalamiento.

SOP´s - Guías operativas V1

Si me dices A o B (Claude solo dev vs Claude también runtime), te dejo el diseño del “orquestador” (Gemini) con prompts exactos y el “QA packet” listo para UI/cola, sin cambiar el SOP.