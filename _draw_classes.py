# -*- coding: utf-8 -*-
"""Chapitre 2 : diagramme de classes global de WatchDesk.

Les classes persistees plus le rapport envoye par l'agent (DTO). Seuls les
attributs utiles a la comprehension du metier sont repris.
"""
from pathlib import Path

from _uml_style import Canvas, class_box, frame, legend, link

ROOT = Path(r"C:\Users\User\Desktop\ALL-FILES")
FIG = ROOT / "figures"

COL = [50, 483, 916, 1349]
BW = 320
TOP, BOTTOM = 130, 580


def class_diagram():
    c = Canvas(1720, 1110)
    frame(c, 20, 14, 1680, 1082, "Diagramme de classes global")

    user = class_box(c, COL[0], TOP, BW, "User", [
        "- id : Long",
        "- email : String",
        "- password : String",
        "- fullName : String",
        "- role : String",
        "- enabled : Boolean",
        "- lastLoginAt : DateTime",
    ], tone="blue")

    rule = class_box(c, COL[1], TOP, BW, "AlertRule", [
        "- id : Long",
        "- name : String",
        "- enabled : boolean",
        "- severity : String",
        "- logic : AND | OR",
        "- conditionsJson : String",
        "- cooldownMinutes : int",
        "- createdBy : String",
    ], tone="amber")

    audit = class_box(c, COL[2], TOP, BW, "AuditLog", [
        "- id : Long",
        "- actorEmail : String",
        "- actorRole : String",
        "- action : String",
        "- targetType : String",
        "- details : String",
        "- createdAt : DateTime",
    ], tone="violet")

    class_box(c, COL[3], TOP, BW, "Configuration", [
        "- id : Long",
        "- cpuCritical : int",
        "- ramCritical : int",
        "- diskCriticalGb : int",
        "- offlineMinutes : int",
        "- heartbeatInterval : int",
        "- maintenanceMode : boolean",
        "- adminEmail : String",
        "- enableEmail : boolean",
    ], tone="cyan", stereo="singleton")

    comp = class_box(c, COL[0], BOTTOM, BW, "Computer", [
        "- id : Long",
        "- name : String",
        "- ip : String",
        "- username : String",
        "- cpuUsage : String",
        "- ramUsedMB : Long",
        "- ramTotalMB : Long",
        "- lastSeen : DateTime",
        "- osVersion : String",
        "- systemLogs : String",
        "- installedSoftware : String",
    ], tone="green")

    inc = class_box(c, COL[1], BOTTOM, BW, "Incident", [
        "- id : Long",
        "- pcName : String",
        "- severity : String",
        "- description : String",
        "- status : String",
        "- source : String",
        "- eventId : String",
        "- createdAt : DateTime",
        "- resolvedAt : DateTime",
    ], tone="red")

    rep = class_box(c, COL[2], BOTTOM, BW, "AgentReport", [
        "- ip : String",
        "- machineName : String",
        "- cpuUsage : String",
        "- ramUsedMB : Long",
        "- ramTotalMB : Long",
        "- disks : DiskInfo [*]",
        "- timestamp : DateTime",
    ], tone="olive", stereo="DTO")

    # Un compte cree des regles d'alertes
    link(c, [(user["r"], 300), (rule["l"], 300)], "cr\u00e9e", "1", "*")

    # Un compte produit des traces d'audit (contournement par le haut)
    ybus = TOP - 38
    link(
        c,
        [(user["cx"], user["t"]), (user["cx"], ybus), (audit["cx"], ybus), (audit["cx"], audit["t"])],
        "produit", "1", "*", seg=1,
    )

    # Un compte supervise le parc
    link(c, [(user["cx"], user["b"]), (user["cx"], comp["t"])], "supervise", "1", "*")

    # Une regle s'applique aux machines
    ymid = 512
    link(
        c,
        [(rule["cx"], rule["b"]), (rule["cx"], ymid), (comp["r"] - 70, ymid), (comp["r"] - 70, comp["t"])],
        "s\u2019applique \u00e0", "*", "*", seg=1,
    )

    # Une machine genere des incidents
    link(c, [(comp["r"], 700), (inc["l"], 700)], "g\u00e9n\u00e8re", "1", "*")

    # Le rapport de l'agent met a jour la machine (contournement par le bas)
    ylow = comp["b"] + 62
    link(
        c,
        [(comp["cx"], comp["b"]), (comp["cx"], ylow), (rep["cx"], ylow), (rep["cx"], rep["b"])],
        "met \u00e0 jour", "1", "1", seg=1,
    )

    legend(c, COL[3], BOTTOM + 40, [
        ("assoc", "Association et multiplicit\u00e9s"),
        ("blue", "Classe persist\u00e9e (entit\u00e9)"),
        ("olive", "\u00abDTO\u00bb transmis, non persist\u00e9"),
    ], w=320)

    c.save([FIG / "fig17-diagramme-classes.png", ROOT / "diagramme-classes.png"])


if __name__ == "__main__":
    class_diagram()
    print("OK diagramme de classes")
