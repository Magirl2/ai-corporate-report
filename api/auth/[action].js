import loginHandler from './_login.js';
import logoutHandler from './_logout.js';
import meHandler from './_me.js';
import signupHandler from './_signup.js';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'login':
      return loginHandler(req, res);
    case 'logout':
      return logoutHandler(req, res);
    case 'me':
      return meHandler(req, res);
    case 'signup':
      return signupHandler(req, res);
    default:
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
}
