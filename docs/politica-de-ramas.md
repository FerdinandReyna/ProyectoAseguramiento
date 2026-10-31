# Política de ramas y promoción entre ambientes (E9)

| Rama | Ambiente | Quién escribe | Cómo entra el código |
|---|---|---|---|
| `feature/*`, `fix/*` | Local | Desarrollador | Commits directos |
| `dev` | Integración (sin despliegue) | Nadie directo | Pull Request desde `feature/*` o `fix/*` |
| `qa` | QA (Render, servicio de QA) | Nadie directo | Pull Request desde `dev` |
| `main` | Producción (Render) | Nadie directo | Pull Request desde `qa` |

## Reglas
1. Todo cambio nace en una rama `feature/<tema>` o `fix/<defecto>` creada desde `dev`.
2. Se abre un Pull Request hacia `dev` con la plantilla del repositorio. El PR necesita la revisión de otro integrante y el pipeline en verde.
3. Para promover a QA se abre un PR `dev → qa`. Al hacer merge, el pipeline vuelve a correr completo y despliega en el ambiente de QA.
4. Para promover a producción se abre un PR `qa → main`, solo cuando las pruebas de QA están aprobadas. Al hacer merge se despliega en producción.
5. Nunca se hace push directo a `dev`, `qa` ni `main`. Los hotfix siguen el mismo flujo desde una rama `fix/*`.

## Protección configurada en GitHub (Settings → Branches → Rulesets)
- Ramas protegidas: `dev`, `qa`, `main`.
- Requerir Pull Request antes de hacer merge.
- Requerir que pasen los checks de estado: `1. Compilación`, `2. Pruebas unitarias`, `3. Análisis estático (SonarCloud)`, `4. Pruebas de API (Newman)`.
- Requerir que la rama esté actualizada antes del merge.
- Bloquear force push y eliminación de la rama.

Con esto, si cualquier etapa del pipeline falla, GitHub deshabilita el botón de merge hacia `qa` y `main`.
