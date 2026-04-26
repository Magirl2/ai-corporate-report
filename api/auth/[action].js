import loginHandler from '../_lib/handlers/auth/login.js';
import logoutHandler from '../_lib/handlers/auth/logout.js';
import meHandler from '../_lib/handlers/auth/me.js';
import signupHandler from '../_lib/handlers/auth/signup.js';
import { createErrorResponse, ErrorCategory } from '../_lib/errors.js';

export default async function handler(req, res) {
  const { action } = req.query;
  switch (action) {
    case 'login': return loginHandler(req, res);
    case 'logout': return logoutHandler(req, res);
    case 'me': return meHandler(req, res);
    case 'signup': return signupHandler(req, res);
    default:
      return res.status(404).json(createErrorResponse(ErrorCategory.VALIDATION, 'NOT_FOUND', `Unknown auth action: ${action}`));
  }
}
