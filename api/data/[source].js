import dartHandler from '../_lib/handlers/data/dart.js';
import dartFinanceHandler from '../_lib/handlers/data/dart-finance.js';
import fmpFinanceHandler from '../_lib/handlers/data/fmp-finance.js';

export default async function handler(req, res) {
  const { source } = req.query;
  switch (source) {
    case 'dart': return dartHandler(req, res);
    case 'dart-finance': return dartFinanceHandler(req, res);
    case 'fmp-finance': return fmpFinanceHandler(req, res);
    default:
      return res.status(404).json({ error: `Unknown data source: ${source}` });
  }
}
