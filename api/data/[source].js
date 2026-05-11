import dartHandler from '../_lib/handlers/data/dart.js';
import dartFinanceHandler from '../_lib/handlers/data/dart-finance.js';
import fmpFinanceHandler from '../_lib/handlers/data/fmp-finance.js';
import { createErrorResponse, ErrorCategory } from '../_lib/errors.js';

export default async function handler(req, res) {
  const { source } = req.query;
  switch (source) {
    case 'dart': return dartHandler(req, res);
    case 'dart-finance': return dartFinanceHandler(req, res);
    case 'fmp-finance': return fmpFinanceHandler(req, res);
    default:
      return res.status(404).json(createErrorResponse(ErrorCategory.VALIDATION, 'NOT_FOUND', `Unknown data source: ${source}`));
  }
}
