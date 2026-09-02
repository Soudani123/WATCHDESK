# -*- coding: utf-8 -*-
"""Les six diagrammes de sequence du rapport WatchDesk.

- chapitre 4 : connexion avec 2FA, activation de la 2FA
- chapitre 5 : collecte de l'agent, action a distance
- chapitre 6 : incident et alerte e-mail, assistant IA
"""
from pathlib import Path

from _uml_style import render_sequence

FIG = Path(r"C:\Users\User\Desktop\ALL-FILES\figures")


def P(key, label, tone, stereo=None):
    return {"key": key, "label": label, "tone": tone, "stereo": stereo}


USER = P("U", "Utilisateur", "blue", "acteur")
ADMIN = P("U", "Administrateur", "green", "acteur")
CONSOLE = P("C", "Console React", "cyan", "IHM")
API = P("A", "API Spring Boot", "indigo", "service")
DB = P("D", "PostgreSQL", "teal", "BD")
TOTP = P("T", "App. d\u2019authentification", "purple", "acteur")
AGENT = P("G", "Agent Windows", "olive", "acteur")
SMTP = P("S", "Service SMTP", "amber", "acteur")
GEMINI = P("M", "API Gemini", "violet", "acteur")


# --------------------------------------------------------------------------
# Chapitre 4 - sprint 1
# --------------------------------------------------------------------------
def login(s):
    s.activate("U")
    s.activate("C")
    s.msg("U", "C", "Saisir e-mail et mot de passe")
    s.activate("A")
    s.msg("C", "A", "POST /api/auth/login")
    s.activate("D")
    s.msg("A", "D", "Rechercher le compte par e-mail")
    s.reply("D", "A", "Hash BCrypt, r\u00f4le, \u00e9tat 2FA")
    s.deactivate("D")
    s.self_msg("A", "V\u00e9rifier le mot de passe (BCrypt)")
    with s.fragment("alt", "identifiants valides et compte actif"):
        s.reply("A", "C", "Second facteur demand\u00e9")
        s.activate("T")
        s.msg("U", "T", "Lire le code \u00e0 6 chiffres (renouvel\u00e9 toutes les 30 s)")
        s.deactivate("T")
        s.msg("U", "C", "Saisir le code TOTP")
        s.msg("C", "A", "POST /api/auth/verify-2fa")
        s.self_msg("A", "Contr\u00f4ler le code TOTP")
        s.activate("D")
        s.msg("A", "D", "Enregistrer la derni\u00e8re connexion")
        s.deactivate("D")
        s.reply("A", "C", "JWT (e-mail, r\u00f4le, nom) valable 24 h")
        s.reply("C", "U", "Ouvrir la console selon le r\u00f4le")
        s.alt_else("e-mail inconnu, mot de passe faux, compte d\u00e9sactiv\u00e9 ou code invalide")
        s.reply("A", "C", "401 / 403 \u2014 aucun jeton d\u00e9livr\u00e9")
        s.reply("C", "U", "Afficher le message d\u2019erreur")
    s.deactivate("A")
    s.deactivate("C")
    s.deactivate("U")


def activate_2fa(s):
    s.activate("U")
    s.activate("C")
    s.msg("U", "C", "Saisir e-mail et mot de passe")
    s.activate("A")
    s.msg("C", "A", "POST /api/auth/login")
    s.activate("D")
    s.msg("A", "D", "Lire le compte")
    s.reply("D", "A", "Identifiants valides, 2FA non activ\u00e9e")
    s.deactivate("D")
    with s.fragment("opt", "aucun secret TOTP li\u00e9 au compte"):
        s.self_msg("A", "G\u00e9n\u00e9rer le secret TOTP")
        s.reply("A", "C", "URI otpauth:// (QR code)")
        s.reply("C", "U", "Afficher le QR code")
        s.activate("T")
        s.msg("U", "T", "Scanner le QR code")
        s.reply("T", "U", "Premier code \u00e0 6 chiffres")
        s.deactivate("T")
        s.msg("U", "C", "Saisir le code de confirmation")
        s.msg("C", "A", "POST /api/auth/verify-2fa")
        s.self_msg("A", "V\u00e9rifier le code de confirmation")
        s.activate("D")
        s.msg("A", "D", "Enregistrer le secret (2FA activ\u00e9e)")
        s.deactivate("D")
        s.reply("A", "C", "JWT + r\u00f4le")
        s.reply("C", "U", "Ouvrir la console")
    s.deactivate("A")
    s.deactivate("C")
    s.deactivate("U")
    s.note("C", "Sans code de confirmation, le secret n\u2019est pas enregistr\u00e9 :\nla 2FA reste inactive et le QR devra \u00eatre rescann\u00e9.", dx=-120)


# --------------------------------------------------------------------------
# Chapitre 5 - sprint 2
# --------------------------------------------------------------------------
def collect(s):
    with s.fragment("loop", "\u00e0 chaque cycle de l\u2019agent (heartbeat)"):
        s.activate("G")
        s.self_msg("G", "Lire CPU, RAM, disques, journaux, inventaire")
        s.activate("A")
        s.msg("G", "A", "POST /api/agent/report (JSON)")
        s.activate("D")
        s.msg("A", "D", "Mettre \u00e0 jour Computer (dernier \u00e9tat)")
        s.reply("D", "A", "Machine cr\u00e9\u00e9e ou mise \u00e0 jour")
        s.deactivate("D")
        s.reply("A", "G", "200 \u2014 rapport enregistr\u00e9")
        s.msg("G", "A", "GET /api/agent/check-tasks/{ip}")
        s.reply("A", "G", "T\u00e2che en attente ou aucune")
        s.deactivate("A")
        s.deactivate("G")
    s.note("A", "Pas de table \u00ab rapports \u00bb : chaque envoi\nmet \u00e0 jour la machine.", dx=-130)
    with s.fragment("loop", "rafra\u00eechissement de la console, toutes les 10 s"):
        s.activate("U")
        s.activate("C")
        s.msg("U", "C", "Ouvrir l\u2019aper\u00e7u ou la page Ordinateurs")
        s.activate("A")
        s.msg("C", "A", "GET /api/computers")
        s.activate("D")
        s.msg("A", "D", "Lire le parc")
        s.reply("D", "A", "Liste des machines")
        s.deactivate("D")
        s.reply("A", "C", "JSON du parc")
        s.deactivate("A")
        s.reply("C", "U", "Compteurs en ligne / alerte / hors ligne")
        s.deactivate("C")
        s.deactivate("U")


def remote_action(s):
    s.activate("U")
    s.activate("C")
    s.msg("U", "C", "Choisir un poste et une action")
    s.reply("C", "U", "Demander une confirmation")
    s.msg("U", "C", "Confirmer l\u2019action")
    s.activate("A")
    s.msg("C", "A", "POST /api/agent/trigger-action/{ip}")
    s.activate("D")
    s.msg("A", "D", "Enregistrer la t\u00e2che (statut en attente)")
    s.deactivate("D")
    s.reply("A", "C", "200 \u2014 ordre enregistr\u00e9")
    s.deactivate("A")
    s.reply("C", "U", "\u00ab Ordre enregistr\u00e9 \u00bb")
    s.deactivate("C")
    s.deactivate("U")
    s.note("C", "L\u2019ex\u00e9cution n\u2019est pas synchrone : l\u2019agent prend\nl\u2019ordre \u00e0 son cycle suivant.", dx=-130)
    with s.fragment("loop", "cycle suivant de l\u2019agent"):
        s.activate("G")
        s.activate("A")
        s.msg("G", "A", "GET /api/agent/check-tasks/{ip}")
        s.reply("A", "G", "restart / shutdown / update")
        s.deactivate("A")
        s.self_msg("G", "Ex\u00e9cuter la commande Windows")
        s.activate("A")
        s.msg("G", "A", "POST /api/agent/report (nouvel \u00e9tat)")
        s.activate("D")
        s.msg("A", "D", "Mettre \u00e0 jour Computer")
        s.deactivate("D")
        s.deactivate("A")
        s.deactivate("G")
    s.activate("U")
    s.activate("C")
    s.activate("A")
    s.msg("C", "A", "GET /api/computers")
    s.reply("A", "C", "Statut du poste mis \u00e0 jour")
    s.deactivate("A")
    s.reply("C", "U", "Rafra\u00eechir la liste des ordinateurs")
    s.deactivate("C")
    s.deactivate("U")


# --------------------------------------------------------------------------
# Chapitre 6 - sprint 3
# --------------------------------------------------------------------------
def incident(s):
    s.activate("G")
    s.activate("A")
    s.msg("G", "A", "POST /api/agent/report")
    s.deactivate("G")
    s.self_msg("A", "Comparer les mesures aux seuils (CPU, RAM, disque)")
    with s.fragment("alt", "\u00e9cart d\u00e9tect\u00e9 et mode maintenance d\u00e9sactiv\u00e9"):
        s.activate("D")
        s.msg("A", "D", "Chercher un incident OUVERT du m\u00eame type")
        s.reply("D", "A", "Aucun incident ouvert")
        s.msg("A", "D", "Cr\u00e9er l\u2019incident (statut OUVERT)")
        s.deactivate("D")
        with s.fragment("opt", "gravit\u00e9 = critique"):
            s.activate("S")
            s.msg("A", "S", "Envoyer l\u2019e-mail d\u2019alerte")
            s.reply("S", "A", "Accus\u00e9 d\u2019envoi")
            s.deactivate("S")
        s.alt_else("incident d\u00e9j\u00e0 ouvert ou mode maintenance actif")
        s.self_msg("A", "Ne pas cr\u00e9er de doublon")
    s.deactivate("A")
    s.activate("U")
    s.activate("C")
    s.msg("U", "C", "Ouvrir la page Incidents")
    s.activate("A")
    s.msg("C", "A", "GET /api/incidents")
    s.reply("A", "C", "Liste filtr\u00e9e (gravit\u00e9, statut, source)")
    s.msg("U", "C", "Passer l\u2019incident \u00e0 EN COURS ou R\u00c9SOLU")
    s.msg("C", "A", "PATCH /api/incidents/{id}/status")
    s.activate("D")
    s.msg("A", "D", "Mettre \u00e0 jour le statut et journaliser l\u2019audit")
    s.deactivate("D")
    s.reply("A", "C", "Incident mis \u00e0 jour")
    s.deactivate("A")
    s.reply("C", "U", "Rafra\u00eechir la file des incidents")
    s.deactivate("C")
    s.deactivate("U")


def assistant_ia(s):
    s.activate("U")
    s.activate("C")
    s.msg("U", "C", "Poser une question (machine, incident, CVE)")
    s.activate("A")
    s.msg("C", "A", "POST /api/chat/ask")
    s.activate("D")
    s.msg("A", "D", "Charger le contexte (parc, incidents)")
    s.reply("D", "A", "Contexte du parc")
    s.deactivate("D")
    s.activate("M")
    s.msg("A", "M", "Question enrichie du contexte")
    with s.fragment("alt", "service Gemini disponible"):
        s.reply("M", "A", "Diagnostic et pistes de correction")
        s.activate("D")
        s.msg("A", "D", "Journaliser CHAT_ASK dans l\u2019audit")
        s.deactivate("D")
        s.reply("A", "C", "Texte de la r\u00e9ponse")
        s.reply("C", "U", "Afficher la r\u00e9ponse dans le panneau de chat")
        s.alt_else("service indisponible ou d\u00e9lai d\u00e9pass\u00e9")
        s.reply("M", "A", "Erreur")
        s.reply("A", "C", "Message d\u2019erreur")
        s.reply("C", "U", "\u00ab Assistant indisponible \u00bb, session conserv\u00e9e")
    s.deactivate("M")
    s.deactivate("A")
    s.deactivate("C")
    s.deactivate("U")
    s.note("A", "Ni la console ni l\u2019agent n\u2019appellent Gemini\ndirectement : tout passe par le backend.", dx=-140)


def build_sequences():
    render_sequence(
        "Diagramme de s\u00e9quence connexion avec 2FA",
        [USER, CONSOLE, API, DB, TOTP], login,
        [FIG / "fig-sprint1-sequence-login.png"],
    )
    render_sequence(
        "Diagramme de s\u00e9quence activation de la 2FA (QR)",
        [USER, CONSOLE, API, DB, TOTP], activate_2fa,
        [FIG / "fig-sprint1-sequence-2fa.png"],
    )
    render_sequence(
        "Diagramme de s\u00e9quence collecte de l\u2019agent et affichage du parc",
        [AGENT, API, DB, CONSOLE, USER], collect,
        [FIG / "fig-sprint2-sequence-collect.png"],
    )
    render_sequence(
        "Diagramme de s\u00e9quence action \u00e0 distance",
        [ADMIN, CONSOLE, API, DB, AGENT], remote_action,
        [FIG / "fig-sprint2-sequence-action.png"],
    )
    render_sequence(
        "Diagramme de s\u00e9quence incident et alerte e-mail",
        [AGENT, API, DB, SMTP, CONSOLE, ADMIN], incident,
        [FIG / "fig-sprint3-sequence-incident.png"],
    )
    render_sequence(
        "Diagramme de s\u00e9quence assistant IA (Gemini)",
        [ADMIN, CONSOLE, API, DB, GEMINI], assistant_ia,
        [FIG / "fig-sprint3-sequence-ia.png"],
    )


if __name__ == "__main__":
    build_sequences()
    print("OK diagrammes de sequence")
