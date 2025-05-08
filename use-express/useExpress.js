import { props, response } from '../core';
// import makeCompressionMiddleware from 'compression';
// import { json as makeJsonMiddleware } from 'express';
import { sift, try as tryit } from 'radash';

/**
 * @typedef {Object} ExpressMiddlewareFunc
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */

/**
 * @typedef {Object} InvertedMiddlewareFunc
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<import('express').Request>}
 */

/**
 * @typedef {Object} ExpressFramework
 * @property {import('express').Request} req
 * @property {import('express').Response} res
 */

/**
 * @typedef {Object} UseExpressOptions
 * @property {boolean} [skipJson]
 * @property {boolean} [skipCompression]
 */

const applyJson = false
const applyCompression = false

const makeMiddleware = (options) => {
  return sift([
    !options.skipJson && applyJson,
    !options.skipCompression && applyCompression
  ]);
}

export async function withExpress(func, options, req, res) {
  const middleware = composeMiddleware(...makeMiddleware(options));

  const [error, result] = await tryit(async () => {
    const requestAfterMiddlware = await middleware(req, res);
    return await func({
      ...props(makeRequest(requestAfterMiddlware)),
      framework: {
        req,
        res
      }
    });
  })();

  if (error) {
    console.error(error);
  }
  const finalResponse = response(error, result);
  setResponse(res, finalResponse);
  return finalResponse;
}

/**
 * @param {import('lumora/core').NextFunc} func
 * @returns {Function}
 */
export const useExpress = (options = {}) => (func) => (req, res) =>
  withExpress(func, options, req, res);

function setResponse(res, { status, headers, body }) {
  res.status(status);
  for (const [key, val] of Object.entries(headers)) {
    res.set(key, val);
  }
  res.json(body);
}

const makeRequest = (req) => ({
  headers: req.headers,
  url: req.originalUrl,
  path: req.path,
  body: req.body,
  method: req.method,
  query: req.query,
  ip: `${req.socket?.remoteAddress}`,
  startedAt: Date.now(),
  protocol: req.protocol,
  httpVersion: req.httpVersion,
  params: req.params
});

/**
 * Middleware functions. Special helpers needed to get
 * express middleware functions inline to play in the
 * fait way. Express middleware functions run async
 * and when they are done they return nothing, they
 * just modify the request. These help us process that
 * and then combine them.
 */
function invertMiddleware(middleware) {
  return async (req, res) => {
    return await new Promise((resolve, reject) => {
      const next = (err) => {
        if (err) reject(err);
        else resolve(req);
      };
      middleware(req, res, next);
    });
  };
}

function composeMiddleware(...funcs) {
  return async (req, res) => {
    let r = req;
    for (const func of funcs) {
      r = await func(r, res);
    }
    return r;
  };
}
