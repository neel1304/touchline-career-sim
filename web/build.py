#!/usr/bin/env python3
"""Builds the public website in this folder from the game's source one level up.

The claude.ai artifact and the website share index.html, data.js, engine.js and ui.js. This script copies the
scripts here and writes a standalone index.html: a real <head> with the share-card tags for X/Twitter and
other sites, plus Firebase and tl-firebase.js loaded before the game, so leaderboards and friends leagues
work off claude.ai.

    python3 web/build.py                                   # site address defaults to SITE below
    python3 web/build.py https://your-name.vercel.app      # once you know the real address
"""
import html, pathlib, shutil, sys

SITE = (sys.argv[1] if len(sys.argv) > 1 else 'https://playtouchline.app').rstrip('/')
FIREBASE = '10.12.2'
TITLE = 'Touchline Career Sim'
DESC = ('A football manager career in your browser. Real 2026/27 squads, live matches where tactics really matter, '
        'transfers and deadline day, and private leagues with your friends. Free, no download.')

web = pathlib.Path(__file__).resolve().parent
src = web.parent
for f in ('data.js', 'engine.js', 'ui.js'):
    shutil.copyfile(src / f, web / f)

page = (src / 'index.html').read_text(encoding='utf-8')
cut = page.index('<div class="wrap" id="app">')
head, body = page[:cut], page[cut:]
head = head.replace('<title>Touchline Career Sim</title>', '')
fb = ''.join(f'<script src="https://www.gstatic.com/firebasejs/{FIREBASE}/firebase-{m}-compat.js"></script>\n' for m in ('app', 'auth', 'firestore'))
body = body.replace('<script src="data.js"></script>', fb + '<script src="firebase-config.js"></script>\n<script src="tl-firebase.js"></script>\n<script src="tl-analytics.js"></script>\n<script src="tl-music.js"></script>\n<script src="data.js"></script>', 1)

t, d, img = html.escape(TITLE), html.escape(DESC), SITE + '/og.jpg?v=2'
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230a0d12'/%3E"
        "%3Cpath d='M14 18h36v6H35v24h-6V24H14z' fill='%23f4f6f9'/%3E%3Crect x='14' y='50' width='36' height='4' fill='%231d5fc8'/%3E%3C/svg%3E")
meta = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{t}</title>
<meta name="description" content="{d}">
<meta name="theme-color" content="#0a0d12">
<link rel="icon" href="{icon}">
<link rel="canonical" href="{SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{t}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{SITE}/">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{img}">
{head.strip()}
<link rel="preload" as="image" href="img/stadium.webp" media="(min-width:701px)">
<link rel="preload" as="image" href="img/stadium-m.jpg" media="(max-width:700px)">
<link rel="stylesheet" href="tl-skin.css">
</head>
<body>
'''
(web / 'index.html').write_text(meta + body.rstrip() + '\n<p class="note" style="text-align:center;padding:0 16px 28px">Unofficial fan-made game. Not affiliated with or endorsed by EA, any league, club or player. <a href="#" id="tl-privacy" style="color:inherit">Analytics settings</a><br>Music: \u201cChill Wave\u201d, \u201cDream Culture\u201d, \u201cWallpaper\u201d, \u201cLocal Forecast - Elevator\u201d, \u201cBackbay Lounge\u201d and \u201cEasy Lemon\u201d by Kevin MacLeod (<a href="https://incompetech.com" style="color:inherit">incompetech.com</a>). Licensed under Creative Commons: By Attribution 4.0 (<a href="https://creativecommons.org/licenses/by/4.0/" style="color:inherit">creativecommons.org/licenses/by/4.0</a>).</p>\n</body>\n</html>\n', encoding='utf-8')
if not (web / 'firebase-config.js').exists():
    (web / 'firebase-config.js').write_text('// Paste your Firebase web app config here (Project settings > Your apps). Leave as null to run single-player.\nwindow.TL_FIREBASE = null;\n', encoding='utf-8')
print('Built', web, 'for', SITE)
