import dartHandler from './_dart.js';
import dartFinanceHandler from './_dart-finance.js';
import fmpFinanceHandler from './_fmp-finance.js';

export default async function handler(req, res) {
  const { source } = req.query;

  switch (source) {
    case 'dart':
      return dartHandler(req, res);
    case 'dart-finance':
      return dartFinanceHandler(req, res);
    case 'fmp-finance':
      return fmpFinanceHandler(req, res);
    default:
      return res.status(404).json({ success: false, error: 'Data source not found' });
  }
}
