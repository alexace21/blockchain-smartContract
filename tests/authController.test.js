const { register, login, refresh, logout } = require('../controllers/authController');

// Mock dependencies
const authService = require('../services/authService'); // The real one
const { AppError } = require('../utils/appError'); // The real one
const RefreshToken = require('../models/RefreshToken'); // The real one

// Jest will automatically mock these modules when they are required by authController.js
// This means any function/method exported by these modules will be a Jest mock function.
jest.mock('../services/authService');
jest.mock('../models/RefreshToken'); // Mock the entire module for static methods

describe('authController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks before each test
    // authService mocks
    authService.registerUser.mockClear();
    authService.loginUser.mockClear();
    authService.refreshAccessToken.mockClear();
    authService.logoutUser.mockClear();

    // RefreshToken mocks (for static methods)
    RefreshToken.deleteMany.mockClear();

    // Express mocks
    mockReq = {
      body: {},
      user: {}, // Simulating req.user being set by auth middleware
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allows chaining .status().json() or .status().send()
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
  });

  // --- register controller tests ---
  describe('register', () => {
    it('should register a user and return 201 status with user data', async () => {
      const mockUser = {
        _id: 'newUserId123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
      };
      // Arrange: authService.registerUser resolves successfully
      authService.registerUser.mockResolvedValue(mockUser);

      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      // Act
      await register(mockReq, mockRes, mockNext);

      // Assert: authService.registerUser was called with correct arguments
      expect(authService.registerUser).toHaveBeenCalledTimes(1);
      expect(authService.registerUser).toHaveBeenCalledWith(
        mockReq.body.email,
        mockReq.body.password,
        mockReq.body.username
      );

      // Assert: Response status and JSON data
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        id: mockUser._id,
        email: mockUser.email,
        username: mockUser.username,
        createdAt: mockUser.createdAt,
      });

      // Assert: next() was not called (no errors)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with an error if authService.registerUser fails', async () => {
      const serviceError = new AppError('Registration failed', 400); // Simulate a specific error
      // Arrange: authService.registerUser rejects with an error
      authService.registerUser.mockRejectedValue(serviceError);

      mockReq.body = { /* some data that would cause the error */ };

      // Act
      await register(mockReq, mockRes, mockNext);

      // Assert: authService.registerUser was called
      expect(authService.registerUser).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  // --- login controller tests ---
  describe('login', () => {
    it('should log in a user and return 200 status with tokens and expiry', async () => {
      const mockLoginData = {
        user: { _id: 'loggedInUserId', email: 'user@example.com' },
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
        expiresIn: 3600,
      };
      // Arrange: authService.loginUser resolves successfully
      authService.loginUser.mockResolvedValue(mockLoginData);

      mockReq.body = { email: 'user@example.com', password: 'password123' };

      // Act
      await login(mockReq, mockRes, mockNext);

      // Assert: authService.loginUser was called
      expect(authService.loginUser).toHaveBeenCalledTimes(1);
      expect(authService.loginUser).toHaveBeenCalledWith(
        mockReq.body.email,
        mockReq.body.password
      );

      // Assert: Response status and JSON data
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: mockLoginData.accessToken,
        refreshToken: mockLoginData.refreshToken,
        expiresIn: mockLoginData.expiresIn,
      });

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with an error if authService.loginUser fails', async () => {
      const serviceError = new AppError('Invalid credentials', 401);
      // Arrange: authService.loginUser rejects with an error
      authService.loginUser.mockRejectedValue(serviceError);

      mockReq.body = { /* wrong creds */ };

      // Act
      await login(mockReq, mockRes, mockNext);

      // Assert: authService.loginUser was called
      expect(authService.loginUser).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  // --- refresh controller tests ---
  describe('refresh', () => {
    it('should refresh access token and return 200 status with new tokens and expiry', async () => {
      const mockRefreshData = {
        accessToken: 'newMockAccessToken',
        expiresIn: 3500,
        newRefreshToken: 'newMockRefreshToken',
      };
      // Arrange: authService.refreshAccessToken resolves successfully
      authService.refreshAccessToken.mockResolvedValue(mockRefreshData);

      mockReq.body = { refreshToken: 'oldRefreshToken' };

      // Act
      await refresh(mockReq, mockRes, mockNext);

      // Assert: authService.refreshAccessToken was called
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(authService.refreshAccessToken).toHaveBeenCalledWith(mockReq.body.refreshToken);

      // Assert: Response status and JSON data
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: mockRefreshData.accessToken,
        expiresIn: mockRefreshData.expiresIn,
        refreshToken: mockRefreshData.newRefreshToken,
      });

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with an error if authService.refreshAccessToken fails', async () => {
      const serviceError = new AppError('Invalid refresh token', 401);
      // Arrange: authService.refreshAccessToken rejects with an error
      authService.refreshAccessToken.mockRejectedValue(serviceError);

      mockReq.body = { refreshToken: 'invalidRefreshToken' };

      // Act
      await refresh(mockReq, mockRes, mockNext);

      // Assert: authService.refreshAccessToken was called
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  // --- logout controller tests ---
  describe('logout', () => {
    // Setup for req.user.id, as it's typically set by a preceding auth middleware
    const userId = 'authenticatedUserId';
    beforeEach(() => {
        mockReq.user.id = userId;
    });

    it('should logout a user by invalidating a specific refresh token if provided', async () => {
      const refreshTokenValue = 'specificRefreshTokenToInvalidate';
      // Arrange: authService.logoutUser resolves successfully
      authService.logoutUser.mockResolvedValue(true);
      mockReq.body = { refreshToken: refreshTokenValue };

      // Act
      await logout(mockReq, mockRes, mockNext);

      // Assert: authService.logoutUser was called
      expect(authService.logoutUser).toHaveBeenCalledTimes(1);
      expect(authService.logoutUser).toHaveBeenCalledWith(userId, refreshTokenValue);

      // Assert: RefreshToken.deleteMany was NOT called (because specific token was provided)
      expect(RefreshToken.deleteMany).not.toHaveBeenCalled();

      // Assert: Response status and send
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
      expect(mockRes.send).toHaveBeenCalledWith();

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should logout a user by invalidating all refresh tokens for a user if no specific token is provided', async () => {
      // Arrange: RefreshToken.deleteMany resolves successfully
      RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 5 }); // Simulate some tokens deleted
      mockReq.body = {}; // No refresh token in body

      // Act
      await logout(mockReq, mockRes, mockNext);

      // Assert: RefreshToken.deleteMany was called
      expect(RefreshToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId: userId });

      // Assert: authService.logoutUser was NOT called (because no specific token was provided)
      expect(authService.logoutUser).not.toHaveBeenCalled();

      // Assert: Response status and send
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
      expect(mockRes.send).toHaveBeenCalledWith();

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with an error if logoutUser service fails', async () => {
      const serviceError = new AppError('Failed to logout', 500);
      // Arrange: authService.logoutUser rejects with an error
      authService.logoutUser.mockRejectedValue(serviceError);
      mockReq.body = { refreshToken: 'someToken' }; // Trigger the service path

      // Act
      await logout(mockReq, mockRes, mockNext);

      // Assert: authService.logoutUser was called
      expect(authService.logoutUser).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should call next with an error if RefreshToken.deleteMany fails', async () => {
      const dbError = new Error('Database connection lost');
      // Arrange: RefreshToken.deleteMany rejects with an error
      RefreshToken.deleteMany.mockRejectedValue(dbError);
      mockReq.body = {}; // Trigger the deleteMany path

      // Act
      await logout(mockReq, mockRes, mockNext);

      // Assert: RefreshToken.deleteMany was called
      expect(RefreshToken.deleteMany).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(dbError); // Original error passed

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });
});