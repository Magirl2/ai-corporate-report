import searchHandler from '../_lib/handlers/report/search.js';
import outputHandler from '../_lib/handlers/report/output.js';
import compareHandler from '../_lib/handlers/report/compare.js';
import cacheHandler from '../_lib/handlers/report/cache.js';
import { createErrorResponse, ErrorCategory } from '../_lib/errors.js';

export default async function handler(req, res) {
  const { action } = req.query;
  switch (action) {
    case 'search': return searchHandler(req, res);
    case 'output': return outputHandler(req, res);
    case 'compare': return compareHandler(req, res);
    case 'cache': return cacheHandler(req, res);
    default:
      return res.status(404).json(createErrorResponse(ErrorCategory.VALIDATION, 'NOT_FOUND', `Unknown report action: ${action}`));
  }
}
