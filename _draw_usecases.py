# -*- coding: utf-8 -*-
"""Les quatre diagrammes de cas d'utilisation du rapport WatchDesk.

- chapitre 2 : diagramme global
- chapitre 4 : sprint 1, authentification
- chapitre 5 : sprint 2, supervision du parc
- chapitre 6 : sprint 3, incidents, IA et administration
"""
from pathlib import Path

from _uml_style import Canvas, actor, assoc, dependency, frame, generalization, legend, usecase

ROOT = Path(r"C:\Users\User\Desktop\ALL-FILES")
FIG = ROOT / "figures"


# --------------------------------------------------------------------------
# Chapitre 2 : diagramme de cas d'utilisation global
# --------------------------------------------------------------------------
def global_usecases():
    c = Canvas(1760, 1680)
    frame(c, 340, 40, 1110, 1560, "Diagramme de cas d\u2019utilisation global")

    sa = actor(c, 170, 362, "Super\nadministrateur", "purple")
    ad = actor(c, 170, 811, "Administrateur", "green")
    ls = actor(c, 170, 1260, "Lecture seule", "blue")
    ag = actor(c, 1600, 380, "Agent Windows", "teal", facing="left")
    smtp = actor(c, 1600, 764, "Service SMTP", "olive", facing="left")
    gem = actor(c, 1600, 924, "API Gemini", "violet", facing="left")

    generalization(c, (170, 430), (170, 747))
    generalization(c, (170, 868), (170, 1196))

    LX, RX = 650, 1150
    u_admins = usecase(c, LX, 155, "G\u00e9rer les\nadministrateurs")
    u_config = usecase(c, LX, 277, "Configurer\nle syst\u00e8me")
    u_rules = usecase(c, LX, 399, "G\u00e9rer les r\u00e8gles\nd\u2019alertes")
    u_deploy = usecase(c, LX, 521, "D\u00e9ployer l\u2019agent\nWindows")
    u_superv = usecase(c, LX, 665, "Superviser les\nordinateurs")
    u_incid = usecase(c, LX, 787, "G\u00e9rer les\nincidents")
    u_audit = usecase(c, LX, 909, "Consulter le\njournal d\u2019audit")
    u_auth = usecase(c, LX, 1053, "S\u2019authentifier")
    u_dash = usecase(c, LX, 1175, "Consulter le\ndashboard")
    u_report = usecase(c, LX, 1297, "G\u00e9n\u00e9rer des\nrapports")
    u_vuln = usecase(c, LX, 1419, "Suivre les\nvuln\u00e9rabilit\u00e9s")

    u_metrics = usecase(c, RX, 200, "Collecter les\nm\u00e9triques")
    u_action = usecase(c, RX, 560, "Ex\u00e9cuter une action\n\u00e0 distance")
    u_mail = usecase(c, RX, 740, "Envoyer une\nnotification e-mail")
    u_ia = usecase(c, RX, 900, "Interroger\nl\u2019assistant IA")
    u_kpi = usecase(c, RX, 1090, "Voir les KPIs")
    u_state = usecase(c, RX, 1220, "Voir l\u2019\u00e9tat\ndes machines")
    u_recent = usecase(c, RX, 1350, "Voir les\nincidents r\u00e9cents")

    for uc in (u_admins, u_config, u_rules, u_deploy):
        assoc(c, sa, uc)
    for uc in (u_superv, u_incid, u_audit):
        assoc(c, ad, uc)
    for uc in (u_auth, u_dash, u_report, u_vuln):
        assoc(c, ls, uc)
    assoc(c, ag, u_metrics)
    assoc(c, ag, u_action)
    assoc(c, smtp, u_mail)
    assoc(c, gem, u_ia)

    dependency(c, u_action, u_superv, "extend")
    dependency(c, u_mail, u_incid, "extend")
    dependency(c, u_ia, u_incid, "extend")
    dependency(c, u_dash, u_kpi, "include")
    dependency(c, u_dash, u_state, "include")
    dependency(c, u_dash, u_recent, "include")

    legend(c, 1000, 1428)
    c.save([FIG / "diagramme-cas-utilisation.png", ROOT / "diagramme-cas-utilisation.png"])


# --------------------------------------------------------------------------
# Chapitre 4 : sprint 1 - authentification
# --------------------------------------------------------------------------
def sprint1_usecases():
    c = Canvas(1530, 910)
    frame(c, 310, 40, 940, 830, "Diagramme de cas d\u2019utilisation authentification")

    sa = actor(c, 150, 200, "Super\nadministrateur", "purple")
    ad = actor(c, 150, 430, "Administrateur", "green")
    ls = actor(c, 150, 660, "Lecture seule", "blue")
    go = actor(c, 1390, 184, "Google", "amber", facing="left")
    totp = actor(c, 1390, 634, "App. d\u2019authentification\n(TOTP)", "cyan", facing="left")

    generalization(c, (150, 262), (150, 366))
    generalization(c, (150, 483), (150, 596))

    u_auth = usecase(c, 600, 430, "S\u2019authentifier")
    u_google = usecase(c, 1010, 160, "Se connecter\navec Google")
    u_check = usecase(c, 1010, 340, "V\u00e9rifier e-mail\net mot de passe")
    u_2fa = usecase(c, 1010, 520, "Valider le code\n2FA (TOTP)")
    u_qr = usecase(c, 1010, 700, "Activer la 2FA\n(scanner le QR)")

    assoc(c, ls, u_auth)
    assoc(c, go, u_google)
    assoc(c, totp, u_2fa)
    assoc(c, totp, u_qr)

    dependency(c, u_auth, u_check, "include")
    dependency(c, u_auth, u_2fa, "include")
    dependency(c, u_google, u_auth, "extend")
    dependency(c, u_qr, u_auth, "extend")

    legend(c, 350, 700)
    c.save([FIG / "fig-sprint1-usecase.png"])


# --------------------------------------------------------------------------
# Chapitre 5 : sprint 2 - supervision du parc
# --------------------------------------------------------------------------
def sprint2_usecases():
    c = Canvas(1520, 1000)
    frame(c, 310, 40, 960, 910, "Diagramme de cas d\u2019utilisation supervision du parc")

    sa = actor(c, 150, 200, "Super\nadministrateur", "purple")
    ad = actor(c, 150, 429, "Administrateur", "green")
    ls = actor(c, 150, 730, "Lecture seule", "blue")
    ag = actor(c, 1400, 315, "Agent Windows", "teal", facing="left")

    generalization(c, (150, 262), (150, 366))
    generalization(c, (150, 483), (150, 667))

    LX, RX = 600, 990
    u_deploy = usecase(c, LX, 175, "D\u00e9ployer l\u2019agent\nWindows")
    u_superv = usecase(c, LX, 405, "Superviser les\nordinateurs")
    u_apercu = usecase(c, LX, 640, "Consulter l\u2019aper\u00e7u")
    u_report = usecase(c, LX, 860, "G\u00e9n\u00e9rer des rapports\nPDF / Excel")
    u_metrics = usecase(c, RX, 175, "Collecter les\nm\u00e9triques")
    u_action = usecase(c, RX, 405, "Ex\u00e9cuter une action\n\u00e0 distance")
    u_kpis = usecase(c, RX, 640, "Voir les KPIs")

    assoc(c, sa, u_deploy)
    assoc(c, ad, u_superv)
    assoc(c, ls, u_apercu)
    assoc(c, ls, u_report)
    assoc(c, ag, u_metrics)
    assoc(c, ag, u_action)

    dependency(c, u_apercu, u_kpis, "include")
    dependency(c, u_action, u_superv, "extend")

    legend(c, 838, 782)
    c.save([FIG / "fig-sprint2-usecase.png", ROOT / "diagramme_cas_utilisation.png"])


# --------------------------------------------------------------------------
# Chapitre 6 : sprint 3 - incidents, IA et administration
# --------------------------------------------------------------------------
def sprint3_usecases():
    c = Canvas(1560, 1010)
    frame(c, 320, 40, 930, 930, "Diagramme de cas d\u2019utilisation incidents, IA et administration")

    sa = actor(c, 150, 329, "Super\nadministrateur", "purple")
    ad = actor(c, 150, 714, "Administrateur", "green")
    ls = actor(c, 150, 924, "Lecture seule", "blue")
    smtp = actor(c, 1420, 544, "Service SMTP", "olive", facing="left")
    gem = actor(c, 1420, 744, "API Gemini", "violet", facing="left")

    generalization(c, (150, 395), (150, 650))
    generalization(c, (150, 772), (150, 860))

    LX, RX = 620, 1040
    u_config = usecase(c, LX, 165, "Configurer\nle syst\u00e8me")
    u_rules = usecase(c, LX, 305, "G\u00e9rer les r\u00e8gles\nd\u2019alertes")
    u_admins = usecase(c, LX, 445, "G\u00e9rer les\nadministrateurs")
    u_incid = usecase(c, LX, 620, "G\u00e9rer les\nincidents")
    u_audit = usecase(c, LX, 760, "Consulter le\njournal d\u2019audit")
    u_vuln = usecase(c, LX, 900, "Suivre les\nvuln\u00e9rabilit\u00e9s")
    u_mail = usecase(c, RX, 520, "Envoyer une\nnotification e-mail")
    u_ia = usecase(c, RX, 720, "Interroger\nl\u2019assistant IA")

    for uc in (u_config, u_rules, u_admins):
        assoc(c, sa, uc)
    assoc(c, ad, u_incid)
    assoc(c, ad, u_audit)
    assoc(c, ls, u_vuln)
    assoc(c, smtp, u_mail)
    assoc(c, gem, u_ia)

    dependency(c, u_mail, u_incid, "extend")
    dependency(c, u_ia, u_incid, "extend")

    legend(c, 860, 800)
    c.save([FIG / "fig-sprint3-usecase.png"])


def build_usecases():
    global_usecases()
    sprint1_usecases()
    sprint2_usecases()
    sprint3_usecases()


if __name__ == "__main__":
    build_usecases()
    print("OK cas d'utilisation")
