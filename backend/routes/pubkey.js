const express = require('express');
const router = express.Router();
const PublicKey = require('../models/PublicKey');

/**
 * POST /api/pubkey/register
 * Register a new user with their public key
 */
router.post('/register', async (req, res) => {
  try {
    const { username, publicKey } = req.body;

    // Validate request body
    if (!username || !publicKey) {
      return res.status(400).json({
        success: false,
        message: 'Username and public key are required'
      });
    }

    // Check if username already exists
    const existingUser = await PublicKey.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists. Please choose a different username.'
      });
    }

    // Create new public key entry
    const newPublicKey = new PublicKey({
      username,
      publicKey
    });

    await newPublicKey.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        username: newPublicKey.username,
        createdAt: newPublicKey.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle MongoDB duplicate key error (in case unique index catches it)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists. Please choose a different username.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

/**
 * GET /api/pubkey/:username
 * Get public key for a specific username
 */
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const publicKeyDoc = await PublicKey.findOne({ username });

    if (!publicKeyDoc) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        username: publicKeyDoc.username,
        publicKey: publicKeyDoc.publicKey
      }
    });

  } catch (error) {
    console.error('Error fetching public key:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
