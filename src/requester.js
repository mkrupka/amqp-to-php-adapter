/**
 * Created by sbanas on 14.04.2017.
 */
'use strict';

const _ = require('lodash');
const url = require('url');
const Promise = require('promise');
const hydrate = require('./../src/util').hydrate;

const defaultClientProperties = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

function Requester(url, logger) {
    this.url = url;
    this.logger = logger;
}

_.extend(Requester.prototype, {

    /**
     * Execute http request for given message and return response
     *
     * @param message
     * @returns {*|Promise}
     */
    execute: function (message) {
        const postData = this.createPostData(message);
        const httpOptions = this.createHttpOptions(postData);
        const http = require(httpOptions.protocol === 'https:' ? 'https' : 'http');

        return new Promise((resolve, reject) => {
            this.logger.info('Executing request: %s', this.url);

            const request = http.request(httpOptions, (response) => {
                //noinspection JSUnresolvedFunction
                response.setEncoding('UTF-8');

                let body = '';
                //another chunk of data has been received, so append it to `body`
                response.on('data', (chunk) => {
                    body += chunk;
                });

                //the whole response has been received
                response.on('end', () => {
                    this.logger.info('Request finished with status %d', response.statusCode);
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: body
                    });
                });
            });

            request.on('error', (e) => {
                reject(e);
            });

            request.write(postData);
            request.end();
        });
    },

    /**
     * Create post payload
     *
     * @param message
     * @returns {*}
     */
    createPostData: function (message) {
        const {
            properties: { headers },
            content
        } = message;

        return JSON.stringify({
            headers,
            payload: content.toString(),
        });
    },

    /**
     * Create http headers for given post data
     *
     * @param postData
     * @returns {Object}
     */
    createHttpOptions: function (postData) {
        let parsed = hydrate(url.parse(this.url));
        let httpOptions = _.extendWith(parsed, defaultClientProperties, (objValue, srcValue) => {
            return _.isNull(objValue) ? srcValue : objValue;
        });
        httpOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        return httpOptions;
    }

});

module.exports = Requester;
