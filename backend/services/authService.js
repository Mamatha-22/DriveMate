const Token = require('../models/Token');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

/**
 * Handle successful authentication by generating and storing tokens
 * @param {Object} user - User document
 * @param {string} userType - 'Owner' or 'Worker'
 * @returns {Object} { accessToken, refreshToken }
 */
const loginUser = async (user, userType) => {
    const userPayload = {
        _id: user._id,
        role: userType.toLowerCase(),
        phone: user.phone,
        name: user.name
    };

    const accessToken = generateToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await Token.create({
        userId: user._id,
        userModel: userType,
        refreshToken: refreshToken,
        expiresAt: expiresAt
    });

    return { accessToken, refreshToken };
};

/**
 * Remove a refresh token from database (logout)
 */
const logoutUser = async (refreshToken) => {
    await Token.findOneAndDelete({ refreshToken });
};

/**
 * Refresh an access token using a valid refresh token
 */
const refreshAccessToken = async (refreshToken) => {
    const Token = require('../models/Token');
    const { verifyRefreshToken, generateToken } = require('../middleware/auth');
    
    // Verify token cryptographically
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return null;

    // Verify token exists in database
    const tokenDoc = await Token.findOne({ refreshToken }).populate('userId');
    if (!tokenDoc) return null;

    // Check if user still exists
    const user = tokenDoc.userId;
    if (!user) return null;

    // Generate new access token
    const userPayload = {
        id: user._id,
        role: tokenDoc.userModel.toLowerCase(),
        phone: user.phone,
        name: user.name
    };

    return generateToken(userPayload);
};

module.exports = {
    loginUser,
    logoutUser,
    refreshAccessToken
};
