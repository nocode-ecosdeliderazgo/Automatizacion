# Re-prompt: Corrección de Nombres (VAL_001)

## Problema Detectado
El artefacto actual tiene {observed} nombres, pero se requieren EXACTAMENTE 3.

## Instrucciones
- Modifica SOLO la sección de nombres
- Mantén todo lo demás intacto (objetivos y descripción)
- Genera exactamente 3 nombres alternativos para el curso

## Contexto del Curso
Descripción: {descripcion_texto}

## Nombres Actuales (incorrectos)
{nombres_actuales}

## Respuesta Requerida
Responde ÚNICAMENTE con un JSON que contenga los 3 nombres corregidos:

```json
{
  "nombres": [
    "Nombre alternativo 1",
    "Nombre alternativo 2",
    "Nombre alternativo 3"
  ]
}
```

## Restricciones
- EXACTAMENTE 3 nombres, ni más ni menos
- Cada nombre debe ser distinto y profesional
- El JSON debe ser válido
