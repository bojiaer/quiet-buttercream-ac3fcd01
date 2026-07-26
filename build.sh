#!/bin/bash
# Vercel build: copy static files to public/
mkdir -p .vercel/output/static
cp -r css js hardware software system assets .vercel/output/static/ 2>/dev/null || true
cp index.html .vercel/output/static/ 2>/dev/null || true
