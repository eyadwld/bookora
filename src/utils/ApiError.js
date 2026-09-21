export function ApiError(statusCode = 500, message = "Internal Server Error") {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export default ApiError;
