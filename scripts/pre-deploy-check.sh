#!/bin/bash
echo "================================"
echo "🚀 Pre-Deployment Checks"
echo "================================"
echo ""
echo "1️⃣  Checking TypeScript compilation..."
npx tsc --noEmit && echo "   ✅ TypeScript: PASS" || (echo "   ❌ TypeScript: FAIL"; exit 1)
echo ""
echo "2️⃣  Running ESLint..."
npm run lint && echo "   ✅ Linting: PASS" || (echo "   ❌ Linting: FAIL"; exit 1)
echo ""
echo "3️⃣  Checking API REST patterns..."
bash scripts/check-api-patterns.sh && echo "   ✅ API Patterns: PASS" || (echo "   ❌ API Patterns: FAIL"; exit 1)
echo ""
echo "================================"
echo "✅ Pre-deployment checks passed!"
echo "================================"
