# Re-prompt: Corrección de Descripción (VAL_003 / VAL_005)

## Problema Detectado
{problema}

## Estadísticas Actuales
- Palabras actuales: {word_count}
- Rango requerido: 150-200 palabras

## Instrucciones
- Modifica SOLO la sección de descripción
- Mantén nombres y objetivos intactos
- {instruccion_especifica}

## Elementos Requeridos en la Descripción
La descripción DEBE incluir claramente:
1. **Público Objetivo**: ¿A quién va dirigido?
2. **Beneficios Clave**: ¿Qué ganará el participante?
3. **Estructura General**: ¿Cómo está organizado?
4. **Diferenciador Único**: ¿Qué lo hace especial?

## Descripción Actual
```
{descripcion_actual}
```

## Elementos Faltantes (si aplica)
{elementos_faltantes}

## Respuesta Requerida
Responde ÚNICAMENTE con un JSON que contenga la descripción corregida:

```json
{
  "descripcion": {
    "texto": "Texto completo de la descripción (150-200 palabras)",
    "publico_objetivo": "Descripción del público objetivo",
    "beneficios": "Beneficios clave",
    "estructura_general": "Estructura del curso",
    "diferenciador": "Elemento diferenciador único"
  }
}
```

## Restricciones
- El texto debe tener entre 150 y 200 palabras
- Todos los elementos deben estar presentes
- El texto debe fluir naturalmente
- El JSON debe ser válido
