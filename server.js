#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
serveHTTP(addonInterface, { port: process.env.PORT || 52696 })
publishToCentral("https://2b8facee70bc-dmhy.baby-beamup.club/manifest.json")