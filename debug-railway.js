#!/usr/bin/env node

// Simple debug script to check Railway environment
console.log('🔧 Railway Debug Information:')
console.log('================================')
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT_SET')
console.log('PORT:', process.env.PORT || 'NOT_SET')

// Check DATABASE_URL (mask password)
const dbUrl = process.env.DATABASE_URL
if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':***@')
  console.log('DATABASE_URL:', maskedUrl)

  // Parse URL to check components
  try {
    const url = new URL(dbUrl)
    console.log('DB Host:', url.hostname)
    console.log('DB Port:', url.port)
    console.log('DB Name:', url.pathname.substring(1))
    console.log('DB User:', url.username)
  } catch (e) {
    console.log('❌ Invalid DATABASE_URL format:', e.message)
  }
} else {
  console.log('❌ DATABASE_URL: NOT_SET')
}

console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : 'NOT_SET')
console.log('API_FIPE_PATH:', process.env.API_FIPE_PATH || 'NOT_SET')

// Test basic connection attempt
console.log('\n🔌 Testing basic networking...')
const { execSync } = require('child_process')

// Check if we can resolve DNS
try {
  execSync('nslookup google.com', { timeout: 5000 })
  console.log('✅ DNS resolution working')
} catch (e) {
  console.log('❌ DNS resolution failed:', e.message)
}

console.log('\n🏁 Debug complete')
process.exit(0)