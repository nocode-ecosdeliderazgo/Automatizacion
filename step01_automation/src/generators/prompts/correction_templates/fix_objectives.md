# Re-prompt: Corrección de Objetivos (VAL_002 / VAL_006)

## Problema Detectado
{problema}

## Tipo de Corrección
{tipo_correccion}

## Instrucciones
- Modifica SOLO la sección de objetivos
- Mantén nombres y descripción intactos
- {instruccion_especifica}

## Verbos Observables Permitidos
USA estos verbos: identificar, aplicar, demostrar, crear, analizar, diseñar, implementar, evaluar, desarrollar, construir

## Verbos Prohibidos (NO usar)
EVITA estos verbos: entender, conocer, apreciar, saber, comprender, aprender

## Objetivos Actuales
{objetivos_actuales}

## Contexto del Curso
{descripcion_texto}

## Respuesta Requerida
Responde ÚNICAMENTE con un JSON que contenga los objetivos corregidos:

```json
{
  "objetivos": [
    "Al finalizar el curso, el participante será capaz de [verbo observable] [resultado específico]",
    "..."
  ]
}
```

## Restricciones
- Entre 3 y 6 objetivos
- Todos deben usar verbos observables
- Cada objetivo debe ser verificable
- El JSON debe ser válido
