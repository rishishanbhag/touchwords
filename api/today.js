import { getPuzzle } from '../server/puzzle.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(getPuzzle({ solution: req.query.jawaab === '1' }));
}
