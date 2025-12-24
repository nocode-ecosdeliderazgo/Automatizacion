## SOP — GO-ESP-01 | Comentarios técnicos complementados

### A. Observación general  
El Paso 01 funciona como **normalización del insumo** (“idea central en 1 frase”) y su conversión en un **artefacto base estructurado** (3 nombres, 3–6 objetivos, descripción 150–200 palabras con elementos obligatorios) que opera como **contrato de entrada** para pasos posteriores (especialmente el temario). Su criticidad sistémica radica en: (1) fijar el **marco semántico** que condiciona toda la desagregación curricular; (2) establecer el **primer punto de control de calidad y trazabilidad** (aprobación QA y registro), evitando que ambigüedades y errores mecánicos se propaguen y generen retrabajo aguas abajo. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

---

### B. Hallazgos clave  
1) **El SOP describe el resultado, pero no el mecanismo reproducible** (plantilla/prompt/contrato de salida). Esto limita estandarización, control de cambios y pruebas. :contentReference[oaicite:2]{index=2}  
2) **Validaciones mecánicas se tratan como revisión humana**, pese a que pueden y deben automatizarse “en el momento del paso” (conteos, rangos, formato). Esto incrementa carga HITL e inconsistencia. :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}  
3) **La propuesta técnica adjunta concreta interfaces y capas (validators, re-prompt, auditoría)** que vuelven el paso directamente implementable; aporta valor como especificación de sistema. :contentReference[oaicite:5]{index=5}  
4) **Riesgo de consumo de iteraciones por fallas triviales**: si no hay bloqueo automático previo a QA, se gastan ciclos en incumplimientos deterministas (p. ej., “4 nombres”). :contentReference[oaicite:6]{index=6} :contentReference[oaicite:7]{index=7}  
5) **Reglas semánticas (p. ej., objetivos medibles/observables)** requieren rúbrica y/o LLM-critic; sin ello se vuelve subjetivo y difícil de escalar. :contentReference[oaicite:8]{index=8} :contentReference[oaicite:9]{index=9}  
6) **Trazabilidad y logging**: el SOP exige evidencia y escalamiento; el adjunto aporta campos concretos (prompts/respuestas, transiciones, métricas) que habilitan auditoría y LLM Ops. :contentReference[oaicite:10]{index=10} :contentReference[oaicite:11]{index=11}  
7) **Posible conflicto conceptual sobre “iteración”**: el SOP limita iteraciones (p. ej., 2), mientras el adjunto propone separar reintentos automáticos vs ciclos de QA. Esto requiere definición formal para no contradecir la fuente de verdad. :contentReference[oaicite:12]{index=12} :contentReference[oaicite:13]{index=13}  

---

### C. Análisis técnico (con investigación)

#### C.1 Automatización viable  
Debe bloquearse automáticamente (sin HITL) cuando falle:  
- **Cardinalidad**: exactamente 3 nombres; objetivos en rango 3–6. :contentReference[oaicite:14]{index=14}  
- **Rango de palabras**: descripción 150–200 palabras (validación por script). :contentReference[oaicite:15]{index=15}  
- **Estructura mínima**: presencia de secciones obligatorias (o, preferentemente, emisión en JSON válido). :contentReference[oaicite:16]{index=16} :contentReference[oaicite:17]{index=17}  

Recomendación de salida implementable: **output primario JSON** (machine-readable) y **render humano** derivado del JSON. Esto elimina fricción de copy/paste y hace consumible el Paso 01 por el Paso 02 de forma determinista. :contentReference[oaicite:18]{index=18} :contentReference[oaicite:19]{index=19}  

Interfaz recomendada (determinista): funciones puras que retornen un objeto estándar, p. ej.:  
- `pass: bool`  
- `code: string`  
- `message: string`  
- `observed: any` (conteo, listas, etc.)  
Esto habilita pruebas unitarias y agregación de resultados. :contentReference[oaicite:20]{index=20}  

#### C.2 Validaciones deterministas vs. semánticas  

| Requisito (DoD) | Tipo | Mejor validador | Severidad recomendada | Acción |
|---|---|---|---|---|
| 3 nombres exactos | Determinista | Script/Schema | BLOCK | Re-prompt dirigido automático |
| 3–6 objetivos | Determinista | Script/Schema | BLOCK | Re-prompt dirigido automático |
| 150–200 palabras | Determinista | Script | BLOCK | Re-prompt dirigido automático |
| Estructura/Secciones | Determinista | JSON schema / parser | BLOCK | Forzar re-emisión estructurada |
| Incluye público/beneficios/estructura/diferenciador | Mixta | Heurística + LLM | WARN/BLOCK según ausencia | Reintento; QA si ambiguo |
| Objetivos medibles/observables | Semántica | LLM-critic con rúbrica + QA | WARN→QA (inicio) | Corrección dirigida; calibración |

El adjunto aporta una separación práctica: **determinista** `(bool, mensaje_error)` y **semántico** `(bool, confianza, justificación)` con umbrales de escalamiento; es recomendable como contrato interno. :contentReference[oaicite:21]{index=21}  

#### C.3 Uso recomendado de IA (LLM)  
1) **Reglas primero; IA después**: generar → validar determinísticamente → si falla, corrección dirigida automática. Minimiza deriva y protege iteraciones. :contentReference[oaicite:22]{index=22} :contentReference[oaicite:23]{index=23}  
2) **Corrección dirigida (no regeneración total)**: el re-prompt debe incluir la regla incumplida y exigir “modifica solo X, mantén el resto intacto”. El adjunto aporta ejemplos y es recomendable formalizarlo como plantilla. :contentReference[oaicite:24]{index=24}  
3) **LLM-critic semántico con rúbrica**: para “medible/observable”, usar un evaluador con checklist (verbo observable, resultado verificable, evita vaguedades) y devolver feedback accionable. En fases iniciales, QA valida decisiones del critic para calibrar. :contentReference[oaicite:25]{index=25} :contentReference[oaicite:26]{index=26}  
4) **Evitar acoplamiento a proveedor**: implementar un “LLM adapter” con contrato estable (input/output), permitiendo cambiar modelo sin reescribir el SOP operativo. :contentReference[oaicite:27]{index=27} :contentReference[oaicite:28]{index=28}  

#### C.4 Riesgos operativos conocidos  
- **Retrabajo por validación tardía**: si QA detecta fallas mecánicas, se pierde el ciclo completo. Mitigación: bloqueo determinista previo. :contentReference[oaicite:29]{index=29}  
- **Consumo de iteraciones** por errores triviales o regeneraciones completas. Mitigación: corrección dirigida + auto-validación. :contentReference[oaicite:30]{index=30}  
- **Propagación de ambigüedad**: una idea central débil degrada objetivos/temario. Mitigación: reglas mínimas de claridad del input + critic semántico. :contentReference[oaicite:31]{index=31}  
- **Fallas de trazabilidad** si no se registran prompts/respuestas/decisiones y transiciones. Mitigación: auditoría por evento + campos mínimos de evidencia. :contentReference[oaicite:32]{index=32} :contentReference[oaicite:33]{index=33}  

---

### D. Implicaciones para diseño del sistema  
**Arquitectura recomendada por capas (implementable):**  
1) **Generación LLM** (produce JSON).  
2) **Validador determinista síncrono** (schema + reglas de conteo/rango).  
3) **Motor de autocorrección** (re-prompt dirigido, máximo N según política).  
4) **Validador semántico (LLM-critic)** para objetivos/criterios cualitativos.  
5) **Cola de QA / HITL** (aprobación/rechazo con comentarios). :contentReference[oaicite:34]{index=34}  

**Máquina de estados (recomendación):**  
`DRAFT_INPUT → GENERATED → AUTO_VALIDATION_FAILED → AUTO_CORRECTING(attempt_n) → SEMANTIC_CHECK → READY_FOR_QA → QA_REJECTED → READY_FOR_QA → APPROVED → ESCALATED`  
Esto operacionaliza límites de iteración, escalamiento y evidencia. :contentReference[oaicite:35]{index=35} :contentReference[oaicite:36]{index=36}  

**Trazabilidad (campos mínimos recomendados):**  
- `step_id`, `run_id`, `version_prompt`, `model_id`  
- `attempt_count_auto`, `attempt_count_hitl` (si se decide separar)  
- `validators[]` con resultados (code, pass, message, observed)  
- `semantic_review` (pass, confidence, rationale)  
- `qa_decision`, `qa_comments`, `qa_user`, `timestamps`  
- `artifacts` (input idea central, output JSON, render humano)  
- (Opcional LLM Ops) `token_usage`, `latency_ms`, `cost_estimate` :contentReference[oaicite:37]{index=37}  

**Repositorio (Coda o equivalente):** el sistema debe garantizar persistencia, versionado, evidencia y recuperabilidad, independientemente de la herramienta. La sustitución de Coda solo es viable si se mantiene equivalencia funcional. :contentReference[oaicite:38]{index=38} :contentReference[oaicite:39]{index=39}  

---

### E. Recomendación operativa  
1) **Convertir el Paso 01 en un contrato de salida formal (JSON + schema)**, con render humano automático. :contentReference[oaicite:40]{index=40}  
2) **Bloqueo duro** para reglas deterministas: 3 nombres, 3–6 objetivos, 150–200 palabras, estructura válida. Ejecutar validación inmediatamente tras generar. :contentReference[oaicite:41]{index=41} :contentReference[oaicite:42]{index=42}  
3) **Autocorrección dirigida automática** ante fallas deterministas (sin pasar a QA).  
4) **HITL obligatorio** para evaluación semántica (objetivos medibles/observables y coherencia general) al menos hasta calibración; posteriormente puede migrar a “LLM-critic + muestreo QA”. :contentReference[oaicite:43]{index=43} :contentReference[oaicite:44]{index=44}  
5) **Instrumentación de iteraciones y escalamiento**: imponer el límite declarado por el SOP; si se separan reintentos automáticos vs ciclos de QA, debe definirse formalmente qué cuenta como “iteración” para no contradecir la fuente de verdad. :contentReference[oaicite:45]{index=45} :contentReference[oaicite:46]{index=46}  

---

### F. OPEN_QUESTIONS  
1) **Definición formal de “iteración”**: ¿incluye reintentos automáticos de re-prompt, o solo ciclos que involucran QA/HITL? Importa para cumplir el límite del SOP y evitar inconsistencias operativas. :contentReference[oaicite:47]{index=47} :contentReference[oaicite:48]{index=48}  
2) **Propietario del input “idea central”**: ¿siempre humano? ¿IA solo refina? Importa por responsabilidad, calidad mínima del insumo y diseño de UI. :contentReference[oaicite:49]{index=49}  
3) **Repositorio fuente de verdad**: ¿Coda obligatorio o “equivalente funcional” aceptable? Importa para auditoría, permisos, versionado y acoplamiento del pipeline. :contentReference[oaicite:50]{index=50} :contentReference[oaicite:51]{index=51}  
4) **Rúbrica de “objetivos medibles/observables”**: ¿qué criterios exactos y umbral de aceptación? Importa para diseñar LLM-critic, validación y QA consistente. :contentReference[oaicite:52]{index=52} :contentReference[oaicite:53]{index=53}  
5) **Política de validación de idioma** (si aplica): ¿es requisito bloquear si no está en español? Importa para reglas duras y para evitar falsos positivos (texto mixto, términos técnicos). :contentReference[oaicite:54]{index=54}  
6) **Gobernanza del prompt (versionado/aprobación/rollback)**: ¿dónde se versiona y quién aprueba cambios? Importa para estabilidad, reproducibilidad y control de calidad. :contentReference[oaicite:55]{index=55}
