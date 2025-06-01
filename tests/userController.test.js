const { getMe, updateMe, changePassword } = require('../controllers/userController');

// Mock dependencies
const authService = require('../services/authService'); // The real one
const { NotFoundError, AppError } = require('../utils/appError'); // The real one

// Jest will automatically mock the authService module
jest.mock('../services/authService');

describe('userController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset mocks before each test
    authService.updateUserProfile.mockClear();
    authService.changeUserPassword.mockClear();

    // Express mocks
    // Simulate req.user being set by a previous middleware (like authMiddleware)
    mockReq = {
      body: {},
      user: {
        id: 'authenticatedUserId123', // Assume user ID is available
        _id: 'authenticatedUserId123', // Both id and _id might be used depending on your User model setup
        email: 'authenticated@example.com',
        username: 'authenticateduser',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Note: password should NOT be here if toJSON is working correctly, but include it if your mock user includes it initially
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allows chaining .status().json() or .status().send()
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
  });

  // --- getMe controller tests ---
  describe('getMe', () => {
    it('should return the authenticated user from req.user with 200 status', async () => {
      // Arrange: req.user is already set up in beforeEach

      // Act
      await getMe(mockReq, mockRes, mockNext);

      // Assert: Response status and JSON data
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith(mockReq.user); // Should return the user object directly

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with a NotFoundError if req.user is not set', async () => {
      // Arrange: Remove user from mockReq
      mockReq.user = undefined; // Or null

      // Act
      await getMe(mockReq, mockRes, mockNext);

      // Assert: next() was called once with a NotFoundError
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));

      // Check the specific error details (message)
      const caughtError = mockNext.mock.calls[0][0];
      expect(caughtError.message).toBe('User not found.');
      expect(caughtError.statusCode).toBe(404); // Assuming NotFoundError has a 404 status

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    // Optional: Test catch block for unexpected errors
    // Though less likely in this simple function, it's good practice
    it('should call next with any unexpected error', async () => {
        const unexpectedError = new Error('Something went wrong');
        // Arrange: Force an error, e.g., by making res.status throw
        mockRes.status.mockImplementation(() => { throw unexpectedError; });

        // Act
        await getMe(mockReq, mockRes, mockNext);

        // Assert: next was called with the unexpected error
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(unexpectedError);

         // Assert: Response methods before the error were called, but subsequent ones were not
        expect(mockRes.status).toHaveBeenCalledTimes(1); // status was called, then threw
        expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  // --- updateMe controller tests ---
  describe('updateMe', () => {
    it('should update user profile and return 200 status with updated data', async () => {
      const updateData = { username: 'newusername', email: 'newemail@example.com' };
      const updatedUser = {
        _id: mockReq.user.id,
        username: updateData.username,
        email: updateData.email,
        updatedAt: new Date(), // Service should update this
      };
      // Arrange: authService.updateUserProfile resolves successfully with updated user
      authService.updateUserProfile.mockResolvedValue(updatedUser);

      mockReq.body = updateData; // Request body contains update fields

      // Act
      await updateMe(mockReq, mockRes, mockNext);

      // Assert: authService.updateUserProfile was called with correct arguments
      expect(authService.updateUserProfile).toHaveBeenCalledTimes(1);
      expect(authService.updateUserProfile).toHaveBeenCalledWith(mockReq.user.id, updateData);

      // Assert: Response status and JSON data
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledTimes(1);
      // Note: The response structure is slightly different from the full user object
      expect(mockRes.json).toHaveBeenCalledWith({
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        updatedAt: updatedUser.updatedAt,
      });

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should update only username if email is not provided', async () => {
        const updateData = { username: 'newusername' };
        const updatedUser = { _id: mockReq.user.id, username: updateData.username, email: mockReq.user.email, updatedAt: new Date() };
        authService.updateUserProfile.mockResolvedValue(updatedUser);
        mockReq.body = updateData;

        await updateMe(mockReq, mockRes, mockNext);

        expect(authService.updateUserProfile).toHaveBeenCalledTimes(1);
        // Expect only username in the update data object
        expect(authService.updateUserProfile).toHaveBeenCalledWith(mockReq.user.id, { username: updateData.username });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockNext).not.toHaveBeenCalled();
    });

     it('should update only email if username is not provided', async () => {
        const updateData = { email: 'newemail@example.com' };
        const updatedUser = { _id: mockReq.user.id, username: mockReq.user.username, email: updateData.email, updatedAt: new Date() };
        authService.updateUserProfile.mockResolvedValue(updatedUser);
        mockReq.body = updateData;

        await updateMe(mockReq, mockRes, mockNext);

        expect(authService.updateUserProfile).toHaveBeenCalledTimes(1);
         // Expect only email in the update data object
        expect(authService.updateUserProfile).toHaveBeenCalledWith(mockReq.user.id, { email: updateData.email });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockNext).not.toHaveBeenCalled();
    });

     it('should call authService.updateUserProfile with empty object if no update fields are provided', async () => {
         const updatedUser = { _id: mockReq.user.id, ...mockReq.user, updatedAt: new Date() }; // Simulate no changes
         authService.updateUserProfile.mockResolvedValue(updatedUser);
         mockReq.body = {}; // Empty body

         await updateMe(mockReq, mockRes, mockNext);

         expect(authService.updateUserProfile).toHaveBeenCalledTimes(1);
         // Expect an empty update data object
         expect(authService.updateUserProfile).toHaveBeenCalledWith(mockReq.user.id, {});
         expect(mockRes.status).toHaveBeenCalledWith(200);
         // Check response data matches expected if no changes occurred
         expect(mockRes.json).toHaveBeenCalledWith({
             id: updatedUser._id,
             email: updatedUser.email,
             username: updatedUser.username,
             updatedAt: updatedUser.updatedAt,
         });
         expect(mockNext).not.toHaveBeenCalled();
     });


    it('should call next with an error if authService.updateUserProfile fails', async () => {
      const serviceError = new AppError('Update failed', 500);
      // Arrange: authService.updateUserProfile rejects with an error
      authService.updateUserProfile.mockRejectedValue(serviceError);

      mockReq.body = { username: 'failuser' }; // Data that would cause failure

      // Act
      await updateMe(mockReq, mockRes, mockNext);

      // Assert: authService.updateUserProfile was called
      expect(authService.updateUserProfile).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  // --- changePassword controller tests ---
  describe('changePassword', () => {
    it('should change user password and return 204 status', async () => {
      const currentPassword = 'oldPassword';
      const newPassword = 'newStrongPassword';

      // Arrange: authService.changeUserPassword resolves successfully
      authService.changeUserPassword.mockResolvedValue(true); // Service could return anything on success

      mockReq.body = { currentPassword, newPassword };

      // Act
      await changePassword(mockReq, mockRes, mockNext);

      // Assert: authService.changeUserPassword was called with correct arguments
      expect(authService.changeUserPassword).toHaveBeenCalledTimes(1);
      expect(authService.changeUserPassword).toHaveBeenCalledWith(
        mockReq.user.id,
        currentPassword,
        newPassword
      );

      // Assert: Response status and send
      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
      expect(mockRes.send).toHaveBeenCalledWith();

      // Assert: next() was not called
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with an error if authService.changeUserPassword fails', async () => {
      const serviceError = new AppError('Invalid current password', 400);
      // Arrange: authService.changeUserPassword rejects with an error
      authService.changeUserPassword.mockRejectedValue(serviceError);

      mockReq.body = { currentPassword: 'wrong', newPassword: 'new' };

      // Act
      await changePassword(mockReq, mockRes, mockNext);

      // Assert: authService.changeUserPassword was called
      expect(authService.changeUserPassword).toHaveBeenCalledTimes(1);

      // Assert: next() was called with the error
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);

      // Assert: Response methods were not called
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });
  });
});