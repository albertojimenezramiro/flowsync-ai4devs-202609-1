# Arquitectura de FlowSync

Diagrama de contenedores (nivel 2 del modelo C4) de FlowSync tal como está hoy en el código: la persona que lo usa, los tres contenedores del sistema (la SPA de React en `frontend/`, la API de AdonisJS en `backend/` y la base de datos SQLite que crean sus migraciones) y cómo se comunican. No aparece ningún sistema externo porque el código no llama a ninguno. Se dibuja con un `flowchart` de Mermaid en vez de con los elementos `C4Container`, que todavía están en beta y se ven mal, pero mantiene la notación C4: cada caja indica su tipo y su tecnología, el límite del sistema es un `subgraph` y cada flecha dice qué se hace y por qué protocolo.

```mermaid
flowchart TB
    user(["<b>Miembro del equipo</b><br/>[Persona]<br/><br/>Se registra, inicia sesión y gestiona las tareas compartidas del equipo"])

    subgraph flowsync["FlowSync [Sistema de software]"]
        direction TB

        spa["<b>Aplicación web</b><br/>[Contenedor: React 19, Vite 8, react-router]<br/><br/>SPA en el navegador: registro, login, lista, detalle y estado/fecha de las tareas, y perfil. Guarda el token en localStorage"]

        api["<b>API</b><br/>[Contenedor: Node.js, AdonisJS 7]<br/><br/>API JSON bajo /api/v1: auth, perfil y tareas. Valida con VineJS, autentica con access tokens y responde con transformers envueltos en { data }"]

        db[("<b>Base de datos</b><br/>[Contenedor: SQLite, fichero tmp/db.sqlite3]<br/><br/>Tablas users, auth_access_tokens y tasks")]
    end

    user -->|"Usa<br/>[HTTP, navegador :5173]"| spa
    spa -->|"Llama a la API<br/>[JSON/HTTP :3333, Bearer token]"| api
    api -->|"Lee y escribe<br/>[SQL, Lucid + better-sqlite3]"| db

    classDef person fill:#08427b,stroke:#052e56,color:#fff
    classDef container fill:#438dd5,stroke:#2e6295,color:#fff
    classDef boundary fill:none,stroke:#666,stroke-dasharray:6 4,color:#333

    class user person
    class spa,api,db container
    class flowsync boundary
```
