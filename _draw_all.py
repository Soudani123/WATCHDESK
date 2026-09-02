# -*- coding: utf-8 -*-
"""Regenere les treize figures UML du rapport WatchDesk.

    python _draw_all.py

Charte graphique commune : _uml_style.py. Toutes les sorties vont dans figures/
(et, pour les figures des chapitres 2 et 3, a la racine du dossier).
"""
from _draw_architecture import build_architecture
from _draw_classes import class_diagram
from _draw_sequences import build_sequences
from _draw_usecases import build_usecases

if __name__ == "__main__":
    build_usecases()
    print("OK  4 diagrammes de cas d\u2019utilisation")
    class_diagram()
    print("OK  1 diagramme de classes")
    build_architecture()
    print("OK  2 architectures (logique, physique)")
    build_sequences()
    print("OK  6 diagrammes de s\u00e9quence")
