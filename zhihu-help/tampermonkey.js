// ==UserScript==
// @name         zhihu-help-lan
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       lan
// @match        https://zhuanlan.zhihu.com/*
// @match        https://www.zhihu.com/column/*
// @require https://unpkg.com/react@17/umd/react.production.min.js
// @require https://unpkg.com/react-dom@17/umd/react-dom.production.min.js
// ==/UserScript==

;(function () {
  'use strict'
  if (location.href === 'http://localhost:8080/') return
  var script = document.createElement('script')
  script.src = 'http://localhost:8080/app.bundle.js'
  document.body.appendChild(script)
})()
