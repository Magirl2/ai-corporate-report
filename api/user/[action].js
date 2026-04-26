import upgradeHandler from '../_lib/handlers/user/upgrade.js';
import usageHandler from '../_lib/handlers/user/usage.js';
import { createErrorResponse, ErrorCategory } from '../_lib/errors.js';

export default async function handler(req, res) {
  const { action } = req.query;
  switch (action) {
    case 'upgrade': return upgradeHandler(req, res);
    case 'usage': return usageHandler(req, res);
    default:
      return res.status(404).json(createErrorResponse(ErrorCategory.VALIDATION, 'NOT_FOUND', `Unknown user action: ${action}`));
  }
}
