// const router = require('express').Router();
// const userService = require('../services/authService');
// const { COOKIE_SESSION_NAME } = require('../constants');
// const { isAuth, isGuest } = require('../middlewares/authMiddleware');
// const { getErrorMessage } = require('../utils/errorMapper');
// const BlockchainService = require("../services/blockchainService");

// class AuthController {
//     constructor() {
//         this.blockchainService = new BlockchainService();
//     }
//     async registerGuest(req, res) {
//         const { password, repeatPassword, ...userData } = req.body;
//         console.log(userData)
//         console.log(password)
//         console.log(repeatPassword)

//         if (password !== repeatPassword) {
//             return res.status(400).json("Password Mismatch!");
//         }

//         try {
//             const newUser = await userService.create({ password, ...userData });
//             const token = await userService.generateToken(newUser);

//             res.cookie(COOKIE_SESSION_NAME, token, { httpOnly: true });
//             res.status(201).json({
//                 "id": newUser._id,
//                 email: newUser.email,
//                 username: newUser.username,
//                 createdAt: newUser.createdAt

//             })
//         } catch (error) {
//             // Add mongoose error mapper/handler
//             return res.status(500).json("INTERNAL SERVER ERROR 500");
//         }
//     }

//     async loginUser(req, res) {
//         const { email, password } = req.body;
//         console.log(req.body)
//         console.log(email)
//         console.log(password)
//         try {
//             const user = await userService.login(email, password);
//             const token = await userService.generateToken(user);

//             res.cookie(COOKIE_SESSION_NAME, token, { httpOnly: true });
//             res.status(200).json({
//                 accessToken: token,
//                 refreshToken: COOKIE_SESSION_NAME,
//                 expiresIn: token
//             });
//         } catch (error) {
//             return res.status(401).json("Error while authenticating you...: " + error.toLocaleString())
//         }
//     }
//     }

// module.exports = AuthController;


const authService = require('../services/authService');
const { AppError } = require('../utils/appError');
const RefreshToken = require('../models/RefreshToken');

const register = async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    const user = await authService.registerUser(email, password, username);
    res.status(201).json({
      id: user._id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken, expiresIn } = await authService.loginUser(email, password);
    res.status(200).json({ accessToken, refreshToken, expiresIn });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const { accessToken, expiresIn, newRefreshToken } = await authService.refreshAccessToken(refreshToken);

    // If new refresh token is generated, client should use it.
    // In a real-world scenario, you might send it back in a cookie or header.
    // For this API, we'll return it as a new refreshToken field.
    res.status(200).json({ accessToken, expiresIn, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Get refresh token from request body for explicit logout
    const { refreshToken } = req.body;

    // Alternatively, if refreshToken is sent in a specific header, retrieve it from there.
    // For a Bearer token in Authorization header, it's the access token.
    // For logout, we typically need the refresh token to invalidate it.
    // The spec provided POST /api/auth/logout with Authorization header, but without a body for refresh token.
    // We'll assume the client sends the *refresh token* in the body for invalidation, or the access token in header
    // and we invalidate *all* refresh tokens for that user ID.
    // Let's go with the `refreshToken` in the body for clear invalidation.
    // If the access token is used, we only need req.user.id.

    if (!refreshToken) {
        // If no explicit refresh token, try to invalidate all for the user
        // (This might be too broad for some use cases, but handles simple logout)
        // Or throw a BadRequestError if refresh token is expected.
        await RefreshToken.deleteMany({ userId: req.user.id });
    } else {
        await authService.logoutUser(req.user.id, refreshToken);
    }

    res.status(204).send(); // No Content
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};