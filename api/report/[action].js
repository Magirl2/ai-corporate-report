import generateHandler from './_generate.js';
import compareHandler from './_compare.js';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'generate':
      return generateHandler(req, res);
    case 'compare':
      return compareHandler(req, res);
    default:
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
}
