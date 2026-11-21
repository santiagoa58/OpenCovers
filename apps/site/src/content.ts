import demo from "../demo.json";

/** Public marketing copy and linked resources, kept separate from view logic. */
export const REPO = "https://github.com/David-Cabeza/OpenCovers";
export const GOOD_FIRST_ISSUES = `${REPO}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`;
export const REPO_API = "https://api.github.com/repos/David-Cabeza/OpenCovers";
// The hosted demo (ADR-0022). Empty hides every demo link. Set `url` in apps/site/demo.json once the demo is live.
export const DEMO_URL: string = demo.url;

/* ------------------------------------------------------------------ data */

export const bands = [
  {
    s: "Cambias de front sin perder nada.",
    c: "Plataformas, app de sala y agentes escriben por el mismo contrato y emiten el mismo feed de eventos. Tu libro de reservas no depende de ninguno.",
    on: "var(--f1)",
    start: true,
  },
  {
    s: "Ninguna mesa se reserva dos veces.",
    c: "Una restricción de exclusión GiST en PostgreSQL rechaza cualquier solapamiento de mesa, con cualquier número de escritores a la vez.",
    on: "var(--f2)",
    start: true,
  },
  {
    s: "Tu agente de IA puede reservar.",
    c: "El servidor MCP expone 18 herramientas (reservation.*, waitlist.* y venue.*) a Claude, Cursor y otros hosts. Se instala con npx.",
    on: "var(--f4)",
  },
  {
    s: "Dibujas tu sala y la usas.",
    c: "Mesas redondas, ovaladas, cuadradas, rectangulares y largas con sillas, y elementos de sala como barra, cocina, columnas o chimenea. Arrastra, rota y redimensiona con ajuste a rejilla. La app de sala está en español e inglés, con modo claro y oscuro.",
    on: "var(--f3)",
  },
  {
    s: "Es tuyo: código abierto, Apache-2.0.",
    c: "Auditable, extensible y sin lock-in. Se arranca con Node.js, pnpm y Docker.",
    on: "var(--f1)",
  },
];

export const tiles = [
  {
    h: "Primero, el contrato.",
    p: "Disponibilidad y reserva se deciden en una sola transacción. El contrato y los casos de conformidad van antes que el código.",
  },
  {
    h: "Después, la base de datos.",
    p: "La regla de no-solapamiento vive en PostgreSQL, no en la aplicación. Cada local queda aislado: pedir otro local devuelve no encontrado.",
  },
  {
    h: "Por último, todos por la misma puerta.",
    p: "El personal entra con sesión; las plataformas y los agentes, con claves con roles y permisos por local. Todos escriben por el mismo camino y emiten el mismo feed.",
  },
];

export const modules = [
  {
    name: "Agenda",
    tag: "Sala",
    body: "Las reservas del día con su estado. Cada una guarda su traza: por qué canal entró (widget, app, API o MCP) y quién la cambió después. Mover, cancelar o sentar.",
    img: "/media/agenda.webp",
    pos: "18% 28%",
    alt: "Agenda del día en la app de sala",
  },
  {
    name: "Lista de espera y walk-ins",
    tag: "Sala",
    body: "Los dos flujos físicos más comunes en sala, con el ritmo del servicio a la vista.",
    img: "/media/agenda.webp",
    pos: "70% 60%",
    alt: "Agenda con lista de espera",
  },
  {
    name: "Plano de sala",
    tag: "Sala",
    body: "Mesas con sillas y símbolos de barra, cocina, puerta y planta, sobre suelo de madera.",
    img: "/media/floor-plan.webp",
    pos: "26% 50%",
    alt: "Plano de sala con mesas y sillas",
  },
  {
    name: "Zonas y asignación",
    tag: "Motor",
    body: "Disponibilidad por zona y mesa automática cuando el cliente solo dice hora y personas.",
    img: "/media/floor-plan.webp",
    pos: "78% 40%",
    alt: "Plano con zonas",
  },
  {
    name: "Editor de plano",
    tag: "Sala",
    body: "Arrastra, rota 90° y redimensiona con ajuste a rejilla.",
    img: "/media/floor-editor.webp",
    pos: "40% 50%",
    alt: "Editor del plano de sala",
  },
];

export const challenges = [
  { title: "Ficha de cliente en sala", tag: "producto", body: "Una pantalla con la ficha y el historial de visitas. El motor ya guarda un cliente por local." },
  { title: "Revisar o añadir idiomas del widget", tag: "producto", body: "El widget habla siete idiomas: español, inglés, catalán, francés, alemán, italiano y portugués. Revisar una traducción o añadir otro idioma es una tarea pequeña y sin dependencias." },
  { title: "Temas declarativos", tag: "producto", body: "Paquetes de tema solo de datos que se puedan compartir. El local ya cambia colores, fuente y logo desde Setup." },
  { title: "Primer adaptador de TPV", tag: "integración", body: "Leer la reserva de una mesa, enviar la cuenta y liberar la mesa." },
  { title: "Pagos con Stripe y Redsys", tag: "motor", body: "Depósitos y garantías con la cuenta de pago de cada local." },
];

export const faqs = [
  {
    t: "Alcance",
    q: "¿Es un CRM o un TPV?",
    a: "No. OpenCovers es el motor de reservas: disponibilidad, reservas, mesas y eventos. No sustituye a tu TPV ni a tu CRM. Guarda una ficha mínima de cliente por local y más adelante se conectará con tu propia cuenta de pago, siempre abierto a combinarse con lo que ya usas.",
  },
  {
    t: "Estado",
    q: "¿En qué estado está?",
    a: "Pre-alfa. El motor, la app de sala y el servidor MCP funcionan en local y pasan sus tests. El widget de reservas para la web del local está en curso. Hay una demo alojada para pruebas internas, que se abrirá al público tras la revisión legal. Todavía no hay un servicio gestionado en producción.",
  },
  {
    t: "Hosting",
    q: "¿Puedo autohospedarlo?",
    a: "Sí. Es Apache-2.0 y se arranca con Node.js, pnpm y Docker (PostgreSQL). El repositorio incluye un Dockerfile y un runbook de despliegue.",
  },
  {
    t: "Agentes",
    q: "¿Cómo lo opera un agente de IA?",
    a: "Con el servidor MCP incluido: el mismo catálogo de 18 herramientas que la API, expuesto por stdio. Está publicado en npm: npx -y @opencovers/mcp.",
  },
  {
    t: "Pagos",
    q: "¿Y los depósitos y pagos con tarjeta?",
    a: "Están en la hoja de ruta (fase 12). Cada local conectará su propia cuenta de pago, con Stripe primero y Redsys para España. OpenCovers no cobra comisión ni guarda datos de tarjeta.",
  },
  {
    t: "Precio",
    q: "¿Cuánto cuesta?",
    a: "Nada: es open source. Si algún día hay hosting gestionado, se anunciará aparte.",
  },
];

export const cardColors = ["var(--f2)", "var(--f1)", "var(--f3)", "var(--f4)", "var(--f2)", "var(--f1)"];

export const markColors = ["var(--f1)", "var(--f2)", "var(--f3)", "var(--f4)", "var(--f1)", "var(--f2)", "var(--f3)", "var(--f4)", "var(--f1)", "var(--f2)"];
export const markHeights = [100, 78, 92, 70, 100, 84, 66, 94, 72, 88];

export const commands = `git clone ${REPO}.git
cd OpenCovers
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev`;

