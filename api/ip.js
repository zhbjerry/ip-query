const { queryIP } = require('../lib/ip-query');

module.exports = async (req, res) => {
  const ip = req.query.ip || '';
  
  const result = await queryIP(ip);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(result.success ? 200 : 500).json(result);
};
