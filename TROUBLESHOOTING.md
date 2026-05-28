# Protein Mechanism Feature - Troubleshooting

## Issue: Page Stuck on "Loading..."

### Root Cause
The Content Security Policy (CSP) was blocking Three.js from loading from CDN sources.

### Solution Applied
Updated `server.js` CSP headers to allow:
- `https://cdnjs.cloudflare.com` (Three.js library)
- `https://cdn.jsdelivr.net` (OrbitControls)

### Changes Made

1. **Fixed CSP in server.js**
   - Added CDN domains to `script-src` directive

2. **Added Mock Data Support**
   - `agents/agents/protein-mechanism.js` now works without API key
   - Uses mock mechanism explanations for demo purposes
   - Mock protein structures for visualization

3. **Improved Error Handling**
   - Better console logging in `medication-mechanism.html`
   - Graceful fallbacks in `protein-viewer.js`
   - Clear error messages for users

4. **Added Test Page**
   - `public/test-protein.html` for debugging
   - Tests API endpoint and Three.js loading

## How to Test

### 1. Test Page
Visit: `http://localhost:3001/test-protein.html`
- Verify API is working
- Verify Three.js loads
- Click links to test each medication

### 2. Direct Links
- Lisinopril: `http://localhost:3001/medication-mechanism.html?medication=lisinopril`
- Atorvastatin: `http://localhost:3001/medication-mechanism.html?medication=atorvastatin`
- Metformin: `http://localhost:3001/medication-mechanism.html?medication=metformin`
- Omeprazole: `http://localhost:3001/medication-mechanism.html?medication=omeprazole`

### 3. From Results Page
1. Upload a prescription
2. View results
3. Click "🧬 View 3D Protein Mechanism" on any medication card

## Expected Behavior

When working correctly:
1. Page loads with medication name
2. Shows mechanism explanation (binding site, effect)
3. Displays rotating 3D protein structure
4. Green sphere highlights binding site
5. Can rotate/zoom with mouse

## Common Issues

### Three.js Not Loading
**Symptom:** Console error "THREE is not defined"
**Fix:** Check CSP allows CDN domains

### API Returns No Data
**Symptom:** "Protein target data not available"
**Fix:** Medication not in DRUG_TARGETS database - add it to `agents/agents/protein-mechanism.js`

### 3D Viewer Blank
**Symptom:** White/gray box, no protein
**Fix:** Check browser console for WebGL errors

## Browser Console Commands

Test API directly:
```javascript
fetch('/api/protein-mechanism', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ medication: 'lisinopril' })
}).then(r => r.json()).then(console.log)
```

Check Three.js:
```javascript
console.log(typeof THREE !== 'undefined' ? 'THREE loaded' : 'THREE not loaded')
```

## Server Restart Required

After changes to:
- `server.js`
- `agents/agents/protein-mechanism.js`

Restart server:
```bash
npm start
```

## Mock vs Real Data

Currently using **mock data** for:
- Protein structures (MOCK_PDB_DATA)
- Mechanism explanations (when no API key)

To use real ESMFold:
1. Get NVIDIA NIM API key
2. Update `predictProteinStructure()` in `agents/agents/protein-mechanism.js`
3. Uncomment ESMFold API call

## Adding New Medications

Edit `agents/agents/protein-mechanism.js`:

```javascript
const DRUG_TARGETS = {
  "your-drug": { 
    protein: "Target Protein Name", 
    sequence: "AMINO_ACID_SEQUENCE..." 
  }
};

// Also add to getMockMechanism()
function getMockMechanism(medication, targetProtein) {
  const mechanisms = {
    "your-drug": {
      mechanism: "How it works...",
      bindingSite: "Where it binds...",
      effect: "What happens..."
    }
  };
}
```

## Success Indicators

✓ Test page shows "THREE.js loaded successfully"
✓ API test returns JSON with mechanism data
✓ Medication page shows rotating 3D structure
✓ No CSP errors in browser console
✓ Can interact with 3D viewer (rotate, zoom)

---

**Status:** Fixed and working with mock data
**Next Steps:** Add real ESMFold integration when API access available
