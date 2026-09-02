# -*- coding: utf-8 -*-
"""Chapitre 3 : les deux architectures de WatchDesk.

- Architecture logique : diagramme de paquetages en trois couches (UML 2).
- Architecture physique : diagramme de deploiement (noeuds, artefacts, chemins).
"""
from pathlib import Path

from _uml_style import (
    Canvas, component, database, dep_link, env, frame, legend, node, note, package, path_link,
)

ROOT = Path(r"C:\Users\User\Desktop\ALL-FILES")
FIG = ROOT / "figures"


# --------------------------------------------------------------------------
# 8.1 Architecture logique : trois couches
# --------------------------------------------------------------------------
def logique():
    c = Canvas(1620, 1120)
    frame(c, 30, 30, 1540, 1060, "Architecture logique de WatchDesk")

    LX, LW = 80, 980

    package(c, LX, 120, LW, 230, "\u00abcouche\u00bb Pr\u00e9sentation", "blue")
    component(c, 120, 195, 430, 130, "Console React 19 (Vite)", [
        "navigateur \u2014 pages et formulaires",
        "aucun acc\u00e8s direct \u00e0 la base",
    ], tone="cyan")
    component(c, 590, 195, 430, 130, "Agent Windows (.NET 10)", [
        "collecte CPU, RAM, disques, journaux",
        "ex\u00e9cute les actions distantes",
    ], tone="olive")

    package(c, LX, 420, LW, 280, "\u00abcouche\u00bb M\u00e9tier", "green")
    component(c, 120, 500, 280, 170, "Contr\u00f4leurs REST", [
        "/api/auth, /api/agent",
        "/api/computers, /api/incidents",
        "/api/chat, /api/configuration",
    ], tone="lightgreen")
    component(c, 430, 500, 280, 170, "Services m\u00e9tier", [
        "d\u00e9duplication des incidents",
        "r\u00e8gles d\u2019alertes, e-mails, audit",
        "tableau de bord, vuln\u00e9rabilit\u00e9s",
    ], tone="green")
    component(c, 740, 500, 280, 170, "S\u00e9curit\u00e9", [
        "authentification JWT et 2FA",
        "contr\u00f4le des r\u00f4les",
        "SUPER_ADMIN / ADMIN / LECTURE",
    ], tone="amber")

    package(c, LX, 770, LW, 250, "\u00abcouche\u00bb Donn\u00e9es", "violet")
    component(c, 120, 850, 430, 140, "Spring Data JPA", [
        "Spring Boot 3.2 \u2014 entit\u00e9s",
        "Computer, Incident, User,",
        "AlertRule, AuditLog, Configuration",
    ], tone="violet")
    database(c, 590, 848, 430, 144, "PostgreSQL 18", ["base monitoring"], tone="teal")

    package(c, 1140, 170, 380, 520, "Services externes", "grey")
    component(c, 1180, 250, 300, 110, "Google Identity", ["connexion OAuth"], tone="amber")
    component(c, 1180, 400, 300, 110, "Service SMTP", ["e-mails d\u2019alerte"], tone="pink")
    component(c, 1180, 550, 300, 110, "API Gemini", ["assistant de diagnostic"], tone="indigo")

    dep_link(c, [(570, 350), (570, 420)], "REST / JSON + JWT")
    dep_link(c, [(570, 700), (570, 770)], "JPA")
    dep_link(c, [(1060, 305), (1180, 305)], "OAuth 2.0")
    dep_link(c, [(1060, 455), (1180, 455)], "SMTP")
    dep_link(c, [(1060, 605), (1180, 605)], "HTTPS")

    note(c, 1140, 760, "Ni la console ni l\u2019agent n\u2019acc\u00e8dent\n\u00e0 la base : tout passe par la\ncouche m\u00e9tier.", w=380)

    legend(c, 1140, 930, [
        ("grey", "Paquetage \u00abcouche\u00bb"),
        ("dep", "D\u00e9pendance entre couches"),
    ], w=380)

    c.save([FIG / "fig-architecture-logique.png", ROOT / "architecture-logique.png"])


# --------------------------------------------------------------------------
# 8.2 Architecture physique : deploiement
# --------------------------------------------------------------------------
def physique():
    c = Canvas(1740, 1000)
    frame(c, 30, 30, 1680, 940, "Architecture physique de WatchDesk")

    node(c, 70, 190, 400, 220, "Poste utilisateur", [
        "\u00abartifact\u00bb console React 19 (Vite)",
        "navigateur Chrome / Edge / Firefox",
        "port 3000",
    ], tone="blue")

    node(c, 70, 590, 400, 220, "Poste Windows supervis\u00e9", [
        "\u00abartifact\u00bb WatchDeskAgent.exe",
        "runtime .NET 10 \u2014 Windows 10 / 11",
        "un noeud par machine du parc",
    ], tone="olive")

    node(c, 650, 170, 440, 640, "Serveur WatchDesk", [], tone="grey")
    env(c, 690, 280, 360, 190, "JVM 21", [
        "\u00abartifact\u00bb watchdesk-api.jar",
        "API Spring Boot 3.2",
        "port 8080",
    ], tone="lightgreen")
    env(c, 690, 540, 360, 190, "PostgreSQL 18", [
        "\u00abartifact\u00bb base monitoring",
        "sch\u00e9ma JPA",
        "port 5432",
    ], tone="teal")

    node(c, 1270, 200, 340, 150, "Google Identity", ["OAuth 2.0"], tone="amber")
    node(c, 1270, 420, 340, 150, "Serveur SMTP Gmail", ["port 587 \u2014 STARTTLS"], tone="pink")
    node(c, 1270, 640, 340, 150, "API Gemini", ["HTTPS"], tone="indigo")

    path_link(c, [(470, 300), (650, 300)], "REST / JSON + JWT", stereo="HTTP :8080")
    path_link(c, [(470, 700), (650, 700)], "report / check-tasks", stereo="HTTP :8080")
    path_link(c, [(870, 470), (870, 540)], "JDBC :5432")
    path_link(c, [(1090, 495), (1270, 495)], "envoi des alertes", stereo="SMTP :587")
    path_link(c, [(1090, 715), (1270, 715)], "questions de l\u2019assistant", stereo="HTTPS")
    path_link(
        c,
        [(270, 190), (270, 120), (1440, 120), (1440, 200)],
        "connexion Google (c\u00f4t\u00e9 console)", seg=1, stereo="OAuth 2.0",
    )

    note(c, 70, 840, "En production, seules les URL changent : les responsabilit\u00e9s des n\u0153uds restent identiques.", w=1000)

    legend(c, 1270, 840, [
        ("assoc", "Chemin de communication"),
        ("grey", "N\u0153ud \u00abdevice\u00bb / environnement"),
    ], w=340)

    c.save([FIG / "fig-architecture-physique.png", ROOT / "architecture-physique.png"])


def build_architecture():
    logique()
    physique()


if __name__ == "__main__":
    build_architecture()
    print("OK architectures")
