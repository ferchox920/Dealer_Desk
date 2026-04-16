function sendErrorResponse(res, {
  statusCode = 500,
  message = 'Unexpected error.',
  code = 'UNEXPECTED_ERROR',
} = {}) {
  return res.status(statusCode).json({
    status: statusCode,
    error: message,
    code,
  });
}

function sendHealthResponse(res, data = {}) {
  return res.status(200).json({
    status: 200,
    data: {
      ok: true,
      ...data,
    },
  });
}

export {
  sendErrorResponse,
  sendHealthResponse,
};
