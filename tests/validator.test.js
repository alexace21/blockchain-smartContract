const { validateSchema } = require('../middlewares/validator');
const { BadRequestError } = require('../utils/appError');

const mockSchema = {
  validate: jest.fn(),
};

describe('validateSchema middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn(); // Mock the next() function in middleware chain

    // Clear Joi's validate mock calls before each test
    mockSchema.validate.mockClear();
  });

  it('should call next without an error if validation succeeds', () => {
    // Arrange: Mock Joi's validate method to return no error
    mockSchema.validate.mockReturnValue({ error: undefined });

    // Act: Create the middleware and call it
    const middleware = validateSchema(mockSchema, 'body');
    middleware(mockReq, mockRes, mockNext);

    // Assert: Joi's validate was called with the correct data and options
    expect(mockSchema.validate).toHaveBeenCalledTimes(1);
    expect(mockSchema.validate).toHaveBeenCalledWith(mockReq.body, {
      abortEarly: false,
      allowUnknown: false,
    });

    // Assert: next() was called once without any arguments (indicating success)
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  // --- Test Case 2: Validation Failure (Single Error) ---
  it('should call next with a BadRequestError for a single validation failure', () => {
    // Arrange: Simulate a single Joi validation error
    const joiError = {
      details: [{
        message: '"email" is required',
        context: { key: 'email' },
      }],
    };
    mockSchema.validate.mockReturnValue({ error: joiError });

    // Act
    const middleware = validateSchema(mockSchema, 'body');
    middleware(mockReq, mockRes, mockNext);

    // Assert: Joi's validate was called
    expect(mockSchema.validate).toHaveBeenCalledTimes(1);

    // Assert: next() was called once with a BadRequestError
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));

    // Assert properties of the BadRequestError
    const caughtError = mockNext.mock.calls[0][0]; // Get the error passed to next()
    expect(caughtError.message).toBe('Validation failed');
    expect(caughtError.statusCode).toBe(400);
    expect(caughtError.details).toEqual({ email: 'email is required' }); // Check formatted details
  });

  // --- Test Case 3: Validation Failure (Multiple Errors) ---
  it('should collect and format multiple validation errors', () => {
    // Arrange: Simulate multiple Joi validation errors
    const joiError = {
      details: [
        { message: '"username" must be at least 3 characters long', context: { key: 'username' } },
        { message: '"password" is required', context: { key: 'password' } },
      ],
    };
    mockSchema.validate.mockReturnValue({ error: joiError });

    // Act
    const middleware = validateSchema(mockSchema, 'body');
    middleware(mockReq, mockRes, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));

    const caughtError = mockNext.mock.calls[0][0];
    expect(caughtError.message).toBe('Validation failed');
    expect(caughtError.statusCode).toBe(400);
    expect(caughtError.details).toEqual({
      username: 'username must be at least 3 characters long',
      password: 'password is required',
    });
  });

  // --- Test Case 4: Testing the `property` argument ---
  it('should validate against the specified request property (e.g., "query")', () => {
    // Arrange: Simulate a query parameter and validate against it
    mockReq.query = { search: 'test' };
    mockSchema.validate.mockReturnValue({ error: undefined }); // Success

    // Act
    const middleware = validateSchema(mockSchema, 'query');
    middleware(mockReq, mockRes, mockNext);

    // Assert: Joi's validate was called with `mockReq.query`
    expect(mockSchema.validate).toHaveBeenCalledTimes(1);
    expect(mockSchema.validate).toHaveBeenCalledWith(mockReq.query, expect.any(Object)); // Check options are passed

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should validate against the specified request property (e.g., "params")', () => {
    // Arrange: Simulate a param and validate against it
    mockReq.params = { id: '123' };
    mockSchema.validate.mockReturnValue({ error: undefined }); // Success

    // Act
    const middleware = validateSchema(mockSchema, 'params');
    middleware(mockReq, mockRes, mockNext);

    // Assert: Joi's validate was called with `mockReq.params`
    expect(mockSchema.validate).toHaveBeenCalledTimes(1);
    expect(mockSchema.validate).toHaveBeenCalledWith(mockReq.params, expect.any(Object)); // Check options are passed

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });


  // --- Test Case 5: Message formatting from Joi (removing quotes) ---
  it('should correctly remove quotes from Joi error messages', () => {
    const joiError = {
      details: [{
        message: '"someField" should be a string', // Joi message with quotes
        context: { key: 'someField' },
      }],
    };
    mockSchema.validate.mockReturnValue({ error: joiError });

    const middleware = validateSchema(mockSchema, 'body');
    middleware(mockReq, mockRes, mockNext);

    const caughtError = mockNext.mock.calls[0][0];
    expect(caughtError.details.someField).toBe('someField should be a string');
  });

  // --- Test Case 6: Empty strings in Joi messages (trim) ---
  it('should trim whitespace from Joi error messages', () => {
    const joiError = {
      details: [{
        message: '"anotherField" is required ', // Joi message with trailing space
        context: { key: 'anotherField' },
      }],
    };
    mockSchema.validate.mockReturnValue({ error: joiError });

    const middleware = validateSchema(mockSchema, 'body');
    middleware(mockReq, mockRes, mockNext);

    const caughtError = mockNext.mock.calls[0][0];
    expect(caughtError.details.anotherField).toBe('anotherField is required');
  });
});