const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/postgres/User');

class AuthService {

    async register(email, username, password) {

        const existingUser = await User.findByEmail(email);

        if (existingUser) {
            throw new Error('EMAIL_EXISTS');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        return await User.create(
            email,
            username,
            passwordHash
        );

    }

    async login(email, password) {

        if (!process.env.JWT_SECRET) {
            throw new Error('MISSING_AUTH_CONFIG');
        }

        const user = await User.findByEmail(email);

        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const match = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!match) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        return token;

    }

    async profile(userId) {

        return await User.findById(userId);

    }

    async changePassword(userId, currentPassword, newPassword) {

        const user = await User.findPasswordHashById(userId);

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const match = await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

        if (!match) {
            throw new Error('INVALID_CURRENT_PASSWORD');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await User.updatePassword(userId, newPasswordHash);

    }

}

module.exports = new AuthService();
