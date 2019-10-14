import * as d3 from 'd3';

import * as utils from './scripts/utils.js';
import * as oneOff from './scripts/oneOffHelpers.js';

import mapJSON from './data/map/lb_2009_administrative_districts.geojson';
import { url as locJSON } from './data/map/locations.json';
import { data as respondentsJSON } from './data/respondents.json';

const SVG_WIDTH = 600;
const SVG_HEIGHT = 600;

const MIN_RAD = 4;
const MAX_RAD = 10;

const respondentQuery = utils.makeQueryFunc(respondentsJSON);

const mapSVG = d3.select('body').append('svg')
  .attr('id', 'map')
  .attr('width', SVG_WIDTH)
  .attr('height', SVG_HEIGHT);
const chartSVG = d3.select('body').append('svg')
  .attr('id', 'chart');

const PATH_GROUP = mapSVG.append('g').attr('id', 'path-group');
const CIRCLE_GROUP = mapSVG.append('g').attr('id', 'circle-group');
const MOUSED_OVER = new Set();  // for removal in O(1) (or at least sublinear time, as mandated by spec)

Promise.all([
    d3.json(mapJSON),
    d3.json(locJSON)
]).then(function([mapJSON, locJSON]) {
    const projection = utils.customScaledProjection(1.1, 1, d3.geoMercatorRaw)
      .fitSize([SVG_WIDTH, SVG_HEIGHT], mapJSON);
    const path = d3.geoPath(projection);

    PATH_GROUP.selectAll('path')
      .data(mapJSON.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('id', function(d) { return utils.toID('path', d.properties.DISTRICT); })
      .on('click', function() {  const el = d3.select(this); el.classed('clicked', !el.classed('clicked')); })
      // class .hover rather pseudo :hover required because Firefox is lame
      .on('mouseover', function() {
          const el = d3.select(this);
          MOUSED_OVER.add(el);
          el.raise().classed('hover', true);
      })
      .on('mouseout', function() { 
          const el = d3.select(this);
          MOUSED_OVER.delete(el);
          el.classed('hover', false);
      });
    
    CIRCLE_GROUP.selectAll('circle')
      .data(d3.values(locJSON), function(o) { return o.name; })
      .enter()
      .append('circle')
      .attr('cx', place => projection(place.location)[0])
      .attr('cy', place => projection(place.location)[1])
      .attr('r', place => oneOff.countLocationNormalized(place.name, respondentQuery, MIN_RAD, MAX_RAD))
      .on('mouseover', place => {
          d3.select(utils.toID('path', place.district, true)).dispatch('mouseover');
      })
      // Instead of selecting the specific location's region and dispatching mouseout on it,
      // do it for all potentially moused-over elements so that no region stays hovered over
      // if the mouse leaves via a circle rather than via the region itself
      .on('mouseout', () => oneOff.clearMousedOvers(MOUSED_OVER))
      .on('click', place => console.log(respondentQuery('SELECT * from $0 WHERE location = $1', place.name)));
});
