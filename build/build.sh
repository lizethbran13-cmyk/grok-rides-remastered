#!/bin/bash
cd "$(dirname "$0")"
NODE_PATH=$(pwd)/node_modules ./node_modules/.bin/esbuild ../src/main.js --bundle --format=iife --target=es2020,safari15 --minify --legal-comments=none --outfile=../game.js "$@"
