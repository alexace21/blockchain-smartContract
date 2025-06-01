const { generateToken, verifyToken, generateAuthTokens } = require('../utils/jwtUtils');
const jsonwebtoken = require('jsonwebtoken'); // Import the actual jsonwebtoken library
const config = require('../config/environment'); // Import your config

// Mock external dependencies: jsonwebtoken and config
// Jest's module mocking means that when `jwtUtils.js` `require`s 'jsonwebtoken',
// it will get our mocked version.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(), // We need to mock decode as well
}));

// Mock config module to control secrets and expiration times
jest.mock('../config/environment', () => ({
  jwt: {
    secret: 'test-access-secret',
    refreshSecret: 'test-refresh-secret',
    accessExpiration: '1h',
    refreshExpiration: '7d',
  },
}));

describe('jwtUtils', () => {
  let originalDateNow;

  beforeAll(() => {
    // Save original Date.now to restore it later
    originalDateNow = Date.now;
  });

  beforeEach(() => {
    // Clear all mock calls before each test to ensure isolation
    jsonwebtoken.sign.mockClear();
    jsonwebtoken.verify.mockClear();
    jsonwebtoken.decode.mockClear();

    // Reset Date.now() for each test, if it was mocked
    Date.now = originalDateNow;
  });

  // --- generateToken tests ---
  describe('generateToken', () => {
    const mockPayload = { id: 'user123' };
    const mockSecret = 'supersecret';
    const mockExpiresIn = '1h';
    const expectedToken = 'mocked.jwt.token';

    it('should generate a JWT token successfully', () => {
      // Arrange: Mock jsonwebtoken.sign to return a predictable value
      jsonwebtoken.sign.mockReturnValue(expectedToken);

      // Act
      const token = generateToken(mockPayload, mockSecret, mockExpiresIn);

      // Assert
      expect(token).toBe(expectedToken);
      expect(jsonwebtoken.sign).toHaveBeenCalledTimes(1);
      expect(jsonwebtoken.sign).toHaveBeenCalledWith(
        mockPayload,
        mockSecret,
        { expiresIn: mockExpiresIn }
      );
    });
  });

  // --- verifyToken tests ---
  describe('verifyToken', () => {
    const mockToken = 'mocked.jwt.token';
    const mockSecret = 'supersecret';
    const mockDecodedPayload = { id: 'user123', iat: 12345, exp: 67890 };

    it('should verify a valid token and return the decoded payload', () => {
      // Arrange: Mock jsonwebtoken.verify to return a decoded payload
      jsonwebtoken.verify.mockReturnValue(mockDecodedPayload);

      // Act
      const decoded = verifyToken(mockToken, mockSecret);

      // Assert
      expect(decoded).toEqual(mockDecodedPayload);
      expect(jsonwebtoken.verify).toHaveBeenCalledTimes(1);
      expect(jsonwebtoken.verify).toHaveBeenCalledWith(mockToken, mockSecret);
    });

    it('should return null for an invalid token', () => {
      // Arrange: Mock jsonwebtoken.verify to throw an error (simulating invalid token)
      jsonwebtoken.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const decoded = verifyToken(mockToken, mockSecret);

      // Assert
      expect(decoded).toBeNull();
      expect(jsonwebtoken.verify).toHaveBeenCalledTimes(1);
      expect(jsonwebtoken.verify).toHaveBeenCalledWith(mockToken, mockSecret);
    });

    it('should return null for an expired token', () => {
      // Arrange: Mock jsonwebtoken.verify to throw an error (simulating expired token)
      jsonwebtoken.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError'; // jsonwebtoken sets a specific error name
        throw error;
      });

      // Act
      const decoded = verifyToken(mockToken, mockSecret);

      // Assert
      expect(decoded).toBeNull();
      expect(jsonwebtoken.verify).toHaveBeenCalledTimes(1);
      expect(jsonwebtoken.verify).toHaveBeenCalledWith(mockToken, mockSecret);
    });
  });

  // --- generateAuthTokens tests ---
  describe('generateAuthTokens', () => {
    const userId = 'testUserId123';
    const mockAccessToken = 'mock.access.token';
    const mockRefreshToken = 'mock.refresh.token';

    // Mock expiration times for deterministic expiresIn calculation
    const currentTimestamp = 1678886400; // Example timestamp in seconds (March 15, 2023 12:00:00 PM UTC)
    const accessExpirationTimestamp = currentTimestamp + 3600; // 1 hour later
    const refreshExpirationTimestamp = currentTimestamp + (7 * 24 * 3600); // 7 days later

    beforeEach(() => {
      // Mock Date.now() for deterministic time calculation in expiresIn
      Date.now = jest.fn(() => currentTimestamp * 1000); // Convert to milliseconds

      // Mock generateToken calls made by generateAuthTokens
      jsonwebtoken.sign
        .mockReturnValueOnce(mockAccessToken) // First call for accessToken
        .mockReturnValueOnce(mockRefreshToken); // Second call for refreshToken

      // Mock jwt.decode for accessToken to get the exp claim
      jsonwebtoken.decode.mockReturnValueOnce({
        id: userId,
        exp: accessExpirationTimestamp, // Access token expires 1 hour from currentTimestamp
        iat: currentTimestamp,
      });
    });

    it('should generate access and refresh tokens with correct details', () => {
      // Act
      const tokens = generateAuthTokens(userId);

      // Assert that generateToken was called twice
      expect(jsonwebtoken.sign).toHaveBeenCalledTimes(2);

      // Assert access token generation call
      expect(jsonwebtoken.sign).toHaveBeenCalledWith(
        { id: userId },
        config.jwt.secret, // Uses mocked config secret
        { expiresIn: config.jwt.accessExpiration } // Uses mocked config expiration
      );

      // Assert refresh token generation call
      expect(jsonwebtoken.sign).toHaveBeenCalledWith(
        { id: userId },
        config.jwt.refreshSecret, // Uses mocked config refresh secret
        { expiresIn: config.jwt.refreshExpiration } // Uses mocked config refresh expiration
      );

      // Assert the returned token structure and values
      expect(tokens).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: accessExpirationTimestamp - currentTimestamp, // Expected remaining seconds
      });

      // Verify jwt.decode was called for the access token
      expect(jsonwebtoken.decode).toHaveBeenCalledTimes(1);
      expect(jsonwebtoken.decode).toHaveBeenCalledWith(mockAccessToken);
    });

  });
});