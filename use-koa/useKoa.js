// import makeCompressionMiddleware from 'compression';
// import { json as makeJsonMiddleware } from 'express';

import cookie from "cookie";
import _ from "lodash";
import { sift, try as tryit, isPromise } from "radash";

import { props, LumoError, response } from "../core/index.js";

/**
 * @typedef {Object} KoaMiddlewareFunc
 * @param {import('koa').Context} ctx
 * @param {import('koa').Next} next
 * @returns {Promise<void>}
 */

/**
 * @typedef {Object} KoaFramework
 * @property {import('koa').Context} ctx
 * @property {import('koa').Next} next
 */

/**
 * @typedef {Object} UseKoaOptions
 * @property {boolean} [skipJson]
 * @property {boolean} [skipCompression]
 */

const applyJson = false;
const applyCompression = false;

const makeMiddleware = (options) => {
  return sift([
    !options.skipJson && applyJson,
    !options.skipCompression && applyCompression,
  ]);
};

export async function withKoa(func, options, ctx, next) {
  const middleware = composeMiddleware(...makeMiddleware(options));

  const [error, result] = await tryit(async () => {
    const contextAfterMiddleware = await middleware(ctx, next);

    if (isPromise(func)) {
      func = await func;
    }
    return await func({
      ...props(makeRequest(contextAfterMiddleware)),
      framework: {
        ctx,
        next,
      },
    });
  })();

  if (error && !(error instanceof LumoError)) {
    console.error(error);
  }
  const finalResponse = response(error, result);
  setResponse(ctx, finalResponse);
  return finalResponse;
}

/**
 * @param {import('../core').NextFunc} func
 * @returns {Function}
 */
export const useKoa =
  (options = {}) =>
  (func) =>
  (ctx, next) =>
    withKoa(func, options, ctx, next);

function setResponse(ctx, { status, headers, body, cookies }) {
  ctx.status = status;
  for (const [key, val] of Object.entries(headers)) {
    ctx.set(key, val);
  }
  _.each(cookies, (cookie) => {
    ctx.cookies.set(cookie.name, cookie.value, cookie.options || {});
  });
  ctx.body = body;
  if (body && typeof body.pipe === "function") {
    ctx.res.on("close", () => {
      if (!body.destroyed) body.destroy();
    });
  }
}

const makeRequest = (ctx) => ({
  headers: ctx.headers,
  cookies: cookie.parse(ctx.headers.cookie || ""),
  url: ctx.originalUrl,
  path: ctx.path,
  body: ctx.request.body,
  files: ctx.request.files,
  method: ctx.method,
  query: ctx.query,
  ip: ctx.ip,
  startedAt: Date.now(),
  protocol: ctx.request.protocol,
  httpVersion: ctx.req.httpVersion,
  params: ctx.params || {}, // Koa doesn't have params by default
});

/**
 * Middleware functions for Koa
 */
function invertMiddleware(middleware) {
  return async (ctx, next) => {
    return await new Promise((resolve, reject) => {
      const nextMiddleware = async (err) => {
        if (err) reject(err);
        else {
          await next();
          resolve(ctx);
        }
      };
      middleware(ctx, nextMiddleware);
    });
  };
}

function composeMiddleware(...funcs) {
  return async (ctx, next) => {
    let context = ctx;
    for (const func of funcs) {
      context = await func(context, next);
    }
    return context;
  };
}
