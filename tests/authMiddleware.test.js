const { protect } = require('../middlewares/authMiddleware');
const {AppError, UnauthorizedError} = require('../utils/appError');
const { verifyToken } = require('../utils/jwtUtils');
const User = require('../models/User'); // Import the User model
const JWT_SECRET= '028326e3e2779ffd08ff1f358c4204f7c6c8e7f61d2c0c860dc8d5f7076c8d71';
// Mock external dependencies
jest.mock('../utils/jwtUtils', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));

describe('authMiddleware', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: null, // Ensure user is null before each test
    };
    mockResponse = {}; // No methods needed for this middleware's happy path
    mockNext = jest.fn(); // Mock next() function

    // Clear all mocks before each test
    verifyToken.mockClear();
    User.findById.mockClear();
  });

  it('should call next with an AppError if no token is provided', async () => {
    mockRequest.headers = {}; // No authorization header

    await protect(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].message).toBe('You are not logged in! Please log in to get access.');
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });

 it('should call next with an AppError if token verification fails', async () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };

    await protect(mockRequest, mockResponse, mockNext);

    expect(verifyToken).toHaveBeenCalledTimes(1);
    expect(verifyToken).toHaveBeenCalledWith('invalid-token', JWT_SECRET);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].message).toBe('Invalid token. Please log in again!');
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });



  it('should call next with an AppError if user does not exist', async () => {
    const validToken = 'valid-token'; // Use a variable for clarity
    const decodedId = 'user123';

    mockRequest.headers = { authorization: `Bearer ${validToken}` };
    verifyToken.mockReturnValue({ id: decodedId });
    User.findById.mockResolvedValue(null); // Simulate user not found

    await protect(mockRequest, mockResponse, mockNext);

    expect(verifyToken).toHaveBeenCalledTimes(1);
    expect(verifyToken).toHaveBeenCalledWith(validToken, JWT_SECRET); // <-- Adjusted expectation
    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(User.findById).toHaveBeenCalledWith(decodedId);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(mockNext.mock.calls[0][0].message).toBe('The user belonging to this token no longer exists.');
    expect(mockNext.mock.calls[0][0].statusCode).toBe(401);
  });

  it('should attach user to request and call next if token and user are valid', async () => {
    const mockUser = { _id: 'user123', username: 'testuser' };
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    verifyToken.mockReturnValue({ id: 'user123' });
    User.findById.mockResolvedValue(mockUser); // Simulate user found

    await protect(mockRequest, mockResponse, mockNext);

    expect(verifyToken).toHaveBeenCalledTimes(1);
    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(mockRequest.user).toEqual(mockUser); // Assert user is attached
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(); // Expect next to be called without arguments for success
  });
});