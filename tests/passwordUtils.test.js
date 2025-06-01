const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const bcrypt = require('bcryptjs');

jest.mock('bcryptjs', () => ({
  hash: jest.fn((password, saltRounds) => Promise.resolve(`hashed_${password}_${saltRounds}`)),
  compare: jest.fn((candidate, hashed) => Promise.resolve(candidate.startsWith('correct') && hashed.startsWith('hashed_correct'))),
}));

describe('passwordUtils', () => {
  // Clear mocks before each test to ensure isolation
  beforeEach(() => {
    bcrypt.hash.mockClear();
    bcrypt.compare.mockClear();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'mySecretPassword123';
      const hashedPassword = await hashPassword(password);

      // Expect bcrypt.hash to have been called with the password and salt rounds
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10); // HASH_SALT_ROUNDS is 10

      // Expect the function to return the mocked hashed password
      expect(hashedPassword).toBe(`hashed_${password}_10`);
    });

    it('should throw an error if password is not provided', async () => {
      await expect(hashPassword(null)).rejects.toThrow('Password is required for hashing');
      await expect(hashPassword(undefined)).rejects.toThrow('Password is required for hashing');
      await expect(hashPassword('')).rejects.toThrow('Password is required for hashing');
    });
  });

  describe('comparePassword', () => {
    it('should return true for a correct password', async () => {
      const isMatch = await comparePassword('correctPassword', 'hashed_correctPassword_10');
      expect(isMatch).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', 'hashed_correctPassword_10');
    });

    it('should return false for an incorrect password', async () => {
      const isMatch = await comparePassword('wrongPassword', 'hashed_correctPassword_10');
      expect(isMatch).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashed_correctPassword_10');
    });

    it('should throw an error if candidatePassword is not provided', async () => {
      await expect(comparePassword(null, 'hashed')).rejects.toThrow('Both passwords are required for comparison');
    });

    it('should throw an error if hashedPassword is not provided', async () => {
      await expect(comparePassword('candidate', null)).rejects.toThrow('Both passwords are required for comparison');
    });
  });
});