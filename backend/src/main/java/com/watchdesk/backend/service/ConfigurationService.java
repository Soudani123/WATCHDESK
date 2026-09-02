package com.watchdesk.backend.service;

import com.watchdesk.backend.model.Configuration;
import com.watchdesk.backend.repository.ConfigurationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ConfigurationService {

    @Autowired
    private ConfigurationRepository repository;

    /**
     * Récupère la configuration unique de WatchDesk depuis PostgreSQL.
     * Si la table est vide, crée et sauvegarde automatiquement une configuration par défaut.
     */
    public Configuration getConfiguration() {
        return repository.findById(1L).orElseGet(() -> {
            Configuration defaultConfig = new Configuration(
                    1L,                       // ID unique fixe
                    90,                       // Seuil CPU critique par défaut (%)
                    95,                       // Seuil RAM critique par défaut (%)
                    false,                    // Mode Maintenance désactivé par défaut
                    "2",                      // Durée de maintenance par défaut (2h)
                    "sana.soudani@esprit.tn", // Email de réception par défaut
                    true,                     // Alertes email activées par défaut
                    "",                       // Pas de Webhook Slack initial
                    false,                    // Liaison Slack désactivée par défaut
                    30                        // Intervalle de collecte de l'agent (30s)
            );
            return repository.save(defaultConfig);
        });
    }

    /**
     * Met à jour la configuration globale de l'application.
     * Force l'ID à 1L pour s'assurer qu'on écrase toujours l'unique ligne présente en BDD.
     */
    public Configuration updateConfiguration(Configuration newConfig) {
        newConfig.setId(1L);
        return repository.save(newConfig);
    }
}