const mongoose = require('mongoose'); 
const User = require('../models/User');

// To unit test a Mongoose schema method like toJSON, we can mock a Mongoose document
// or directly call the method on a plain object that mimics the Mongoose document's
// behavior. For toJSON, the latter is simpler as it relies on .toObject().

describe('User Model', () => {

  describe('toJSON method', () => {
    it('should exclude password field from the returned object', () => {
      const userData = {
        _id: new mongoose.Types.ObjectId(),
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedPassword123', // This should be excluded
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      };

      // Create a mock Mongoose document instance.
      // We only need to mock the `toObject` method that `toJSON` calls.
      const mockUserDocument = {
        toObject: () => ({ ...userData }), // Return a copy of userData
        // The actual toJSON method from the schema
        toJSON: User.schema.methods.toJSON,
      };

      const jsonUser = mockUserDocument.toJSON();

      expect(jsonUser).toBeDefined();
      expect(jsonUser.email).toBe(userData.email);
      expect(jsonUser.username).toBe(userData.username);
      expect(jsonUser._id).toEqual(userData._id); // Compare ObjectIds
      expect(jsonUser.createdAt).toEqual(userData.createdAt);
      expect(jsonUser.updatedAt).toEqual(userData.updatedAt);
      expect(jsonUser.__v).toBe(userData.__v);

      // Crucial assertion: password should be undefined
      expect(jsonUser.password).toBeUndefined();
    });
  });

});