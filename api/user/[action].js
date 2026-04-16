import usageHandler from './_usage.js';
import upgradeHandler from './_upgrade.js';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'usage':
      return usageHandler(req, res);
    case 'upgrade':
      return upgradeHandler(req, res);
    default:
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
}
