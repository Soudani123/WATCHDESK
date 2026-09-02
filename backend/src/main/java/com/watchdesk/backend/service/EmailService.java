package com.watchdesk.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender; // <-- CORRIGÉ : L'import doit être org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender; // <-- Ne sera plus du tout en rouge après le rechargement Maven !

    @Autowired
    private ConfigurationService configService;

    public void sendAlertEmail(String subject, String text) {
        // Récupération dynamique depuis PostgreSQL via ton interface React
        String emailDestinataire = configService.getConfiguration().getAdminEmail();
        boolean emailActive = configService.getConfiguration().isEnableEmail();

        // Vérification des règles définies dans l'onglet Configuration
        if (emailActive && emailDestinataire != null && !emailDestinataire.isEmpty()) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("sanasoudani405@gmail.com");
            message.setTo(emailDestinataire);
            message.setSubject(subject);
            message.setText(text);

            mailSender.send(message);
            System.out.println("Email d'alerte envoyé avec succès à : " + emailDestinataire);
        } else {
            System.out.println("L'envoi d'email est désactivé ou l'adresse est vide dans la configuration.");
        }
    }

    public void sendTestEmail() {
        String emailDestinataire = configService.getConfiguration().getAdminEmail();
        if (emailDestinataire == null || emailDestinataire.isBlank()) {
            throw new IllegalStateException("Aucune adresse e-mail configurée.");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("sanasoudani405@gmail.com");
        message.setTo(emailDestinataire);
        message.setSubject("WatchDesk — test d'alerte");
        message.setText("Ceci est un e-mail de test WatchDesk. Les alertes du parc arriveront à cette adresse.");
        mailSender.send(message);
    }
}