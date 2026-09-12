// utils/getErrorMessage.js

export function getErrorMessage(err) {
  // Case 1: Backend responded, but with an error status (400, 401, 403, 404, 500, etc.)
  if (err.response) {
    const data = err.response.data;

    // Your backend sometimes sends a plain string, sometimes an object with .error or .message
    if (typeof data === 'string') return data;
    if (data?.error) return data.error;
    if (data?.message) return data.message;

    // Fallback based on status code, if the backend sent nothing readable
    switch (err.response.status) {
      case 400: return "Something about your request wasn't valid. Please check and try again.";
      case 401: return "You're not logged in, or your session has expired. Please log in again.";
      case 403: return "You don't have permission to do that.";
      case 404: return "We couldn't find what you were looking for.";
      case 500: return "Something went wrong on our end. Please try again in a moment.";
      default: return "Something went wrong. Please try again.";
    }
  }

  // Case 2: Request never reached the server at all (server down, no internet, CORS blocked)
  if (err.request) {
    return "Couldn't reach the server. Please check your internet connection and try again.";
  }

  // Case 3: Something failed before the request was even sent (rare, usually a coding bug)
  return "Something unexpected happened. Please try again.";
}