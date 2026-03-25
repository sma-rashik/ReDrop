const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate token
const authUser = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// @route   PUT /api/users/profile
// @desc    Update only availability and last donation
router.put('/profile', authUser, async (req, res) => {
    try {
        const { isAvailable, lastDonation } = req.body;

        const userFields = { isAvailable, lastDonation };

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: userFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/users/location
// @desc    Update user coordinates
router.put('/location', authUser, async (req, res) => {
    try {
        const { coordinates } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { coordinates } },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/nearby
// @desc    Get all active users for map (replace firebase listener)
router.get('/nearby', async (req, res) => {
    try {
        const users = await User.find({ coordinates: { $exists: true, $not: {$size: 0} } })
            .select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
