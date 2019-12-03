// ==UserScript==
// @id          wayspot-exporter@pogohwh
// @name        IITC Plugin: Wayspot Exporter
// @category    Information
// @version     0.1
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

function wrapper () {
  // in case IITC is not available yet, define the base plugin object
  if (typeof window.plugin !== 'function') {
    window.plugin = function () {}
  }

  // base context for plugin
  window.plugin.wayspot_exporter = function () {}
  const self = window.plugin.wayspot_exporter

  // TODO: Read IDB

  window.record = {}
  self.enabled = false
  self.scraped = false

  self.recordWayspot = function (wayspot) {
    const oldWayspot = window.record[wayspot.guid] ? window.record[wayspot.guid] : {}
    window.record[wayspot.guid] = { ...oldWayspot, ...wayspot }
    self.updateTotalScrapedCount()
  }

  self.updateTotalScrapedCount = function () {
    $('#totalScrapedPortals').html(Object.keys(window.record).length)
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
    }).forEach(self.recordWayspot)
  }

  self.download = function () {
    const link = document.createElement('a')
    link.download = `wayspot-export.${new Date().toISOString().slice(0, 10)}.json`
    link.href = `data:application/json,${JSON.stringify(window.record, null, '  ')}`
    link.click()
  }

  self.view = function view () {
    const payload = JSON.stringify(window.record, null, '  ')

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

    const dia = window.dialog({
      title: 'Wayspot Exporter',
      html: data
    }).parent()
    $('.ui-dialog-buttonpane', dia).remove()
    dia.css('width', '600px').css('top', ($(window).height() - dia.height()) / 2).css('left', ($(window).width() - dia.width()) / 2)
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
            // TODO: Write IDB
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
      $('#exporterControlsBox').hide()
      $('#totalPortals').hide()
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
          <p style="margin: 5px 0 5px 0; text-align: center; font-weight: bold;">Wayspot Exporter</p>
          <a id="startScraper" style="position: absolute; top: 0; left: 0; margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.toggleStatus();" title="Start the portal data scraper">Start</a>
          <a id="stopScraper" style="position: absolute; top: 0; left: 0; display: none; margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.toggleStatus();" title="Stop the Wayspot data scraper">Stop</a>

          <div class="zoomControlsBox" style="margin-top: 5px; padding: 5px 0 5px 5px;">
              Current Zoom Level: <span id="currentZoomLevel">0</span>
              <a style="margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.setZoomLevel();" title="Set zoom level to enable Wayspot data download.">Set Zoom Level</a>
          </div>

          <p style="margin:0 0 0 5px;">Scraper Status: <span style="color: red;" id="scraperStatus">Stopped</span></p>
          <p id="totalPortals" style="display: none; margin:0 0 0 5px;">Total Wayspots Scraped: <span id="totalScrapedPortals">0</span></p>

          <div id="exporterControlsBox" style="display: none; margin-top: 5px; padding: 5px 0 5px 5px; border-top: 1px solid #20A8B1;">
              <a style="margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.view();" title="View scraped data.">View Data</a>
              <a style="margin: 0 5px 0 5px;" onclick="window.plugin.wayspot_exporter.download();" title="Download the scraped data.">Download Data</a>
          </div>
      </div>
      `

    $(exporterToolbox).insertAfter('#toolbox')

    self.tickIntervalID = window.setInterval(self.tick, 500)

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
}

// inject plugin into page
const script = document.createElement('script')
script.appendChild(document.createTextNode('(' + wrapper + ')();'));
(document.body || document.head || document.documentElement)
  .appendChild(script)
