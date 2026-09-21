import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

const validate = (validations) => async (req, _res, next) => {
  await Promise.all(validations.map((validator) => validator.run(req)));

  const errors = validationResult(req);

  if (errors.isEmpty()) return next();

  next(ApiError(400, errors.array()[0].msg));
};

export default validate;
