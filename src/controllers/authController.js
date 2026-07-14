const authService = require('../services/authService');

class AuthController {

    async register(req, res) {

        try {

            const {
                email,
                username,
                password
            } = req.body;

            const user = await authService.register(
                email,
                username,
                password
            );

            res.status(201).json({
                message: 'Utilisateur créé',
                user
            });

        } catch (error) {

            if (error.message === 'EMAIL_EXISTS') {

                return res.status(400).json({
                    message: 'Email déjà utilisé'
                });

            }

            console.error(error);

            res.status(500).json({
                message: 'Erreur serveur'
            });

        }

    }

    async login(req, res) {

        try {

            const {
                email,
                mot_de_passe
            } = req.body;

            const token = await authService.login(
                email,
                mot_de_passe
            );

            res.json({
                message: 'Connexion réussie',
                token
            });

        } catch (error) {

            if (error.message === 'INVALID_CREDENTIALS') {

                return res.status(401).json({
                    message: 'Email ou mot de passe incorrect'
                });

            }

            if (error.message === 'MISSING_AUTH_CONFIG') {
                return res.status(500).json({
                    message: 'Configuration auth manquante'
                });
            }

            res.status(500).json({
                message: 'Erreur serveur'
            });

        }

    }

    async profile(req, res) {

        try {

            const user = await authService.profile(
                req.user.userId
            );

            res.json(user);

        } catch (error) {

            res.status(500).json({
                message: 'Erreur serveur'
            });

        }

    }

    async changePassword(req, res) {

        try {

            const {
                currentPassword,
                newPassword
            } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    message: 'Mot de passe actuel et nouveau mot de passe requis'
                });
            }

            if (typeof newPassword !== 'string' || newPassword.length < 8) {
                return res.status(400).json({
                    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
                });
            }

            await authService.changePassword(
                req.user.userId,
                currentPassword,
                newPassword
            );

            res.json({
                message: 'Mot de passe modifié avec succès'
            });

        } catch (error) {

            if (error.message === 'INVALID_CURRENT_PASSWORD') {

                return res.status(401).json({
                    message: 'Mot de passe actuel incorrect'
                });

            }

            if (error.message === 'USER_NOT_FOUND') {

                return res.status(404).json({
                    message: 'Utilisateur introuvable'
                });

            }

            console.error(error);

            res.status(500).json({
                message: 'Erreur serveur'
            });

        }

    }

}

module.exports = new AuthController();
