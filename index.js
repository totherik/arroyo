'use strict';

var util = require('util');
var Wreck = require('wreck');
var through = require('through2');
var parseLink = require('parse-link-header');
var pkg = require('./package');


module.exports = function (options) {
    var lastEventId, stream, queue, timeout;

    options = options || {};
    options.url = options.url || 'https://api.github.com/events';
    options.headers = options.headers || {};

    lastEventId = options.lastEventId;

    stream = through({ objectMode: true });
    stream.on('end', function () {
        // TODO: Fix. This doesn't cover all cases.
        clearTimeout(timeout);
    });

    queue = [];

    (function fetch(url, etag) {
        var headers, interval;

        headers = util._extend({
            'User-Agent': pkg.name + '/' + pkg.version,
            'Accept': 'application/vnd.github.v3+json',
            'If-None-Match': etag
        }, options.headers);

        Wreck.get(url, { json: true, headers: headers }, function (err, response, payload) {
            var i, len, found, link;

            if (err) {
                stream.emit('error', err);
                return;
            }

            if (Array.isArray(payload)) {

                // Look through the current payload for the last observed event.
                // If found, slice the payload down to unobserved events.
                for (i = 0, len = payload.length; i < len; i++) {
                    if (found = (payload[i].id === lastEventId)) {
                        payload = payload.slice(0, i);
                        break;
                    }
                }

                queue = queue.concat(payload);

                // If no last event is found we need to fill out our queue
                // so follow link headers back as far as they'll take us.
                if (!found && response.headers.link) {
                    link = parseLink(response.headers.link);
                    if (link && link.next) {
                        fetch(link.next.url);
                        return;
                    }
                }

                // Hang on to newest event id and flush all queued events.
                lastEventId = queue.length && queue[0].id;
                while (queue.length) {
                    stream.write(queue.pop());
                }

            }

            interval = parseInt(response.headers['x-poll-interval'], 10);
            interval = isNaN(interval) ? 60000 : interval * 1000;

            timeout = setTimeout(fetch, interval, options.url, response.headers.etag);
        });
    })(options.url);

    return stream;
};
