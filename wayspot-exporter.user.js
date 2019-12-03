// ==UserScript==
// @id          wayspot-exporter@pogohwh
// @name        IITC Plugin: Wayspot Exporter
// @category    Information
// @version     1.0
// @namespace   https://github.com/PoGOHWH/iitc-wayspot-exporter
// @downloadURL https://github.com/PoGOHWH/iitc-wayspot-exporter/master/wayspot-exporter.user.js
// @supportURL  https://github.com/PoGOHWH/iitc-wayspot-exporter
// @description Exports Wayspots in a game-agnostic manner.
// @include     https://www.ingress.com/intel*
// @include     http://www.ingress.com/intel*
// @include     https://ingress.com/intel*
// @include     http://ingress.com/intel*
// @include     https://intel.ingress.com/intel*
// @include     http://intel.ingress.com/intel*
// @match       https://www.ingress.com/intel*
// @match       http://www.ingress.com/intel*
// @match       https://ingress.com/intel*
// @match       http://ingress.com/intel*
// @grant       none
// ==/UserScript==
/* global       $:false */
/* global       L:false */

// jakearchibald/idb
// 20191203184436
// https://unpkg.com/idb@4.0.5/build/iife/index-min.js
/* eslint-disable */
window.idb = (function(e){"use strict";const t=(e,t)=>t.some(t=>e instanceof t);let n,r;const o=new WeakMap,s=new WeakMap,a=new WeakMap,i=new WeakMap,c=new WeakMap;let u={get(e,t,n){if(e instanceof IDBTransaction){if("done"===t)return s.get(e);if("objectStoreNames"===t)return e.objectStoreNames||a.get(e);if("store"===t)return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return p(e[t])},has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function d(e){return e!==IDBDatabase.prototype.transaction||"objectStoreNames"in IDBTransaction.prototype?(r||(r=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(e)?function(...t){return e.apply(l(this),t),p(o.get(this))}:function(...t){return p(e.apply(l(this),t))}:function(t,...n){const r=e.call(l(this),t,...n);return a.set(r,t.sort?t.sort():[t]),p(r)}}function f(e){return"function"==typeof e?d(e):(e instanceof IDBTransaction&&function(e){if(s.has(e))return;const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",s),e.removeEventListener("abort",s)},o=()=>{t(),r()},s=()=>{n(e.error),r()};e.addEventListener("complete",o),e.addEventListener("error",s),e.addEventListener("abort",s)});s.set(e,t)}(e),t(e,n||(n=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]))?new Proxy(e,u):e)}function p(e){if(e instanceof IDBRequest)return function(e){const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("success",o),e.removeEventListener("error",s)},o=()=>{t(p(e.result)),r()},s=()=>{n(e.error),r()};e.addEventListener("success",o),e.addEventListener("error",s)});return t.then(t=>{t instanceof IDBCursor&&o.set(t,e)}).catch(()=>{}),c.set(t,e),t}(e);if(i.has(e))return i.get(e);const t=f(e);return t!==e&&(i.set(e,t),c.set(t,e)),t}const l=e=>c.get(e);const D=["get","getKey","getAll","getAllKeys","count"],v=["put","add","delete","clear"],B=new Map;function I(e,t){if(!(e instanceof IDBDatabase)||t in e||"string"!=typeof t)return;if(B.get(t))return B.get(t);const n=t.replace(/FromIndex$$/,""),r=t!==n,o=v.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!o&&!D.includes(n))return;const s=async function(e,...t){const s=this.transaction(e,o?"readwrite":"readonly");let a=s.store;r&&(a=a.index(t.shift()));const i=a[n](...t);return o&&await s.done,i};return B.set(t,s),s}return u=(e=>({get:(t,n,r)=>I(t,n)||e.get(t,n,r),has:(t,n)=>!!I(t,n)||e.has(t,n)}))(u),e.openDB=function(e,t,{blocked:n,upgrade:r,blocking:o}={}){const s=indexedDB.open(e,t),a=p(s);return r&&s.addEventListener("upgradeneeded",e=>{r(p(s.result),e.oldVersion,e.newVersion,p(s.transaction))}),n&&s.addEventListener("blocked",()=>n()),o&&a.then(e=>e.addEventListener("versionchange",o)).catch(()=>{}),a},e.deleteDB=function(e,{blocked:t}={}){const n=indexedDB.deleteDatabase(e);return t&&n.addEventListener("blocked",()=>t()),p(n).then(()=>void 0)},e.unwrap=l,e.wrap=p,e}({}));

const run = async f => f()

function wrapper () {
  run(async () => {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== 'function') {
      window.plugin = function () {}
    }

    // base context for plugin
    window.plugin.wayspot_exporter = function () {}
    const self = window.plugin.wayspot_exporter

    // Open IndexedDB database and create store
    self.idb = await window.idb.openDB('wayspot-exporter', 1, {
      upgrade (db) {
        db.createObjectStore('wayspots', { keyPath: 'guid' })
      },
    })

    self.wayspots = (await self.idb.getAll('wayspots')).reduce((wayspots, wayspot) => ({...wayspots, [wayspot.guid]: wayspot }), {})
    self.enabled = false
    self.scraped = false

    self.recordWayspots = function (wayspot) {
      const oldWayspot = self.wayspots[wayspot.guid] ? self.wayspots[wayspot.guid] : {}
      self.wayspots[wayspot.guid] = { ...oldWayspot, ...wayspot }
      self.updateTotalScrapedCount()
    }

    self.updateTotalScrapedCount = function () {
      $('#totalScrapedPortals').html(Object.keys(self.wayspots).length)
    }

    self.processPortals = function () {
      Object.keys(window.portals).map(guid => {
        const marker = window.portals[guid]
        const wayspot = {
          guid,
          lat: marker._latlng.lat,
          lng: marker._latlng.lng,
        }
        if (marker.options.data.image) wayspot.image = marker.options.data.image
        if (marker.options.data.title) wayspot.title = marker.options.data.title
        return wayspot
      }).forEach(self.recordWayspots)
      Object.values(self.wayspots).forEach(wayspot => self.idb.put('wayspots', wayspot))
    }

    self.download = function () {
      const link = document.createElement('a')
      link.download = `wayspot-export.${new Date().toISOString().slice(0, 10)}.json`
      link.href = `data:application/json,${JSON.stringify(self.wayspots, null, '  ')}`
      link.click()
    }

    self.view = function view () {
      const payload = JSON.stringify(self.wayspots, null, '  ')

      const data = `
        <form name='maxfield' action='#' method='post' target='_blank'>
            <div class="row">
                <div id='form_area' class="column" style="float:left;width:100%;box-sizing: border-box;padding-right: 5px;">
                    <textarea class='form_area'
                        name='portal_list_area'
                        rows='30'
                        placeholder='Zoom level must be 15 or higher for Wayspot data to load'
                        style="width: 100%; white-space: nowrap;">${payload}</textarea>
                </div>
            </div>
        </form>
        `

      const dialog = window.dialog({
        title: 'Wayspot Exporter',
        html: data
      }).parent()
      $('.ui-dialog-buttonpane', dialog).remove()
      dialog.css('width', '600px').css('top', ($(window).height() - dialog.height()) / 2).css('left', ($(window).width() - dialog.width()) / 2)
    }

    self.setZoomLevel = function () {
      window.map.setZoom(15)
      $('#currentZoomLevel').html('15')
      self.updateZoomStatus()
    }

    self.updateZoomStatus = function () {
      const zoomLevel = window.map.getZoom()
      $('#currentZoomLevel').html(window.map.getZoom())
      if (zoomLevel < 15) {
        self.scraped = false
        $('#currentZoomLevel').css('color', 'red')
        if (self.enabled) $('#scraperStatus').html('Invalid Zoom Level').css('color', 'yellow')
      } else $('#currentZoomLevel').css('color', 'green')
    }

    self.tick = function () {
      self.updateZoomStatus()
      if (self.enabled) {
        if (window.map.getZoom() >= 15) {
          if ($('#innerstatus > span.map > span').html() === 'done') {
            if (!self.scraped) {
              self.processPortals()
              self.scraped = true
              $('#scraperStatus').html('Running').css('color', 'green')
              let bounds = window.map.getBounds()
              bounds = [[bounds._southWest.lat, bounds._southWest.lng], [bounds._northEast.lat, bounds._northEast.lng]]
              L.rectangle(bounds, { weight: 0, fillOpacity: 0.1, fillColor: '#00ff99' }).addTo(window.map)
            } else {
              $('#scraperStatus').html('Area Scraped').css('color', 'green')
            }
          } else {
            self.scraped = false
            $('#scraperStatus').html('Waiting For Map Data').css('color', 'yellow')
          }
        }
      }
    }

    self.panMap = function () {
      window.map.getBounds()
      window.map.panTo({ lat: 40.974379, lng: -85.624982 })
    }

    self.toggleStatus = function () {
      if (self.enabled) {
        self.enabled = false
        $('#scraperStatus').html('Stopped').css('color', 'red')
        $('#startScraper').show()
        $('#stopScraper').hide()
        // $('#exporterControlsBox').hide()
        // $('#totalPortals').hide()
      } else {
        self.enabled = true
        $('#scraperStatus').html('Running').css('color', 'green')
        $('#startScraper').hide()
        $('#stopScraper').show()
        $('#exporterControlsBox').show()
        $('#totalPortals').show()
        self.updateTotalScrapedCount()
      }
    }

    // setup function called by IITC
    self.setup = function () {
      // add controls to toolbox
      const link = $('')
      $('#toolbox').append(link)

      const exporterToolbox = `
        <div id="exporterToolbox" style="position: relative;">
            <p style="margin: 5px; font-weight: bold;">Wayspot Exporter</p>

            <a id="startScraper" style="margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.toggleStatus();" title="Start the portal data scraper">Start</a>
            <a id="stopScraper" style="display: none; margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.toggleStatus();" title="Stop the Wayspot data scraper">Stop</a>

            <div class="zoomControlsBox" style="padding: 5px 0 5px 5px;">
                Current Zoom Level: <span id="currentZoomLevel">0</span>
                <a style="margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.setZoomLevel();" title="Set zoom level to enable Wayspot data download.">Set Zoom Level</a>
            </div>

            <p style="margin:0 0 0 5px;">Scraper Status: <span style="color: red;" id="scraperStatus">Stopped</span></p>
            <p id="totalPortals" style="margin:0 0 0 5px;">Total Wayspots Scraped: <span id="totalScrapedPortals">0</span></p>
            <p id="exporterControlsBox" style="margin: 5px;"><a onclick="window.plugin.wayspot_exporter.download();" title="Download the scraped data.">Download Wayspots</a></p>

        </div>
        `

      $(exporterToolbox).insertAfter('#toolbox')

      self.tickIntervalID = window.setInterval(self.tick, 500)
      self.updateTotalScrapedCount()

      // delete self to ensure init can't be run again
      delete self.setup
    }

    // IITC plugin setup
    if (window.iitcLoaded && typeof self.setup === 'function') {
      self.setup()
    } else if (window.bootPlugins) {
      window.bootPlugins.push(self.setup)
    } else {
      window.bootPlugins = [self.setup]
    }
  })
}

// inject plugin into page
const script = document.createElement('script')
script.appendChild(document.createTextNode('(' + wrapper + ')();'));
(document.body || document.head || document.documentElement)
  .appendChild(script)
