
function newInstance() {
  const config = {
    shareablyAccessToken: 'SHAREABLY_SECRET_TOKEN',
    startDate: '2019-01-25',
    endDate: '2019-01-31',
    metrics: [
      'spend',
      'revenue',
      'impressions',
      'clicks'
    ]
  }

  return config;
}

module.exports = {
  newInstance
};