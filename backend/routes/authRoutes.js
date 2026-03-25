const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/signup
// @desc    Register a user
router.post('/signup', async (req, res) => {
    try {
        const { name, phone, password, address, bloodGroup, lastDonation } = req.body;

        // Check user exists
        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({ error: 'User with this phone number already exists' });
        }

        // Check eligibility manually if date provided
        let isAvailable = true;
        if (lastDonation) {
            const diffTime = new Date() - new Date(lastDonation);
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            if (diffDays <= 90) {
                isAvailable = false;
            }
        }

        user = new User({
            name,
            phone,
            password,
            address,
            bloodGroup,
            lastDonation: lastDonation || '',
            isAvailable
        });

        // Hash PW
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT logic
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        uid: user.id,
                        name: user.name,
                        phone: user.phone,
                        address: user.address,
                        group: user.bloodGroup,
                        lastDonation: user.lastDonation,
                        isAvailable: user.isAvailable,
                        coordinates: user.coordinates
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error. Please check MongoDB connection.' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        let user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        uid: user.id,
                        name: user.name,
                        phone: user.phone,
                        address: user.address,
                        group: user.bloodGroup,
                        lastDonation: user.lastDonation,
                        isAvailable: user.isAvailable,
                        coordinates: user.coordinates
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
