export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify({
      status: 'OK',
      service: 'API BMC FIPE',
      platform: 'Netlify Functions',
      timestamp: new Date().toISOString(),
      version: '1.0.0-netlify'
    })
  }
}