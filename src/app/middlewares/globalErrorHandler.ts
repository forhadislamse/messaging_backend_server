import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import handleZodError from "../../errors/handleZodError";
import parsePrismaValidationError from "../../errors/parsePrismaValidationError";
import ApiError from "../../errors/ApiError";

import logger from "../../shared/logger";
import config from "../../config";

const GlobalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: any = httpStatus.INTERNAL_SERVER_ERROR;
  let message = err.message || "Something went wrong!";
  let errorSources = [];
  let errorDetails = err || null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  }
  // Handle Custom ApiError
  else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [{ type: "ApiError", details: err.message }];
  }
  // Generic Error Handling (e.g., JavaScript Errors)
  else if (err instanceof SyntaxError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Syntax error in the request. Please verify your input.";
    errorSources.push("Syntax Error");
  } else if (err instanceof TypeError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Type error in the application. Please verify your input.";
    errorSources.push("Type Error");
  } else if (err instanceof ReferenceError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Reference error in the application. Please verify your input.";
    errorSources.push("Reference Error");
  }
  // Catch any other error type
  else {
    message = "An unexpected error occurred!";
    errorSources.push("Unknown Error");
  }

  if (statusCode >= 500) {
    logger.error(err);
  } else {
    logger.warn({ message, path: req.originalUrl }, 'Client error');
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    err,
    stack: config.env === "development" ? err?.stack : null,
  });
};

export default GlobalErrorHandler;
