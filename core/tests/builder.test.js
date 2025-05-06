import { describe, expect, test } from '@jest/globals';
import lumo from '../index.js';

/**
 * @typedef {Object} Database
 * @property {() => Promise<void>} connect
 */

/**
 * @typedef {Object} Args
 * @property {string} message
 */

/**
 * @typedef {Object} Services
 * @property {Database} database
 */

/**
 * @typedef {Object} AWSFramework
 * @property {AWSLambda.APIGatewayProxyEvent} event
 * @property {AWSLambda.Context} context
 */

/**
 * @param {import('../types.js').Props<Args & { id: string }, Services & { logger: { name: string } }, TokenAuth, import('../types.js').Request, AWSFramework>} props
 * @returns {Promise<import('../types.js').Props<Args & { id: string }, Services & { logger: { name: string } }, TokenAuth, import('../types.js').Request, AWSFramework>>}
 */
const addTweet = async (props) => props;

/**
 * @template T
 * @template Value
 * @typedef {{ [P in keyof T]: Value }} KeyOfType
 */

/**
 * @param {any} [options]
 * @returns {(func: (props: import('../types.js').Props<{}, {}, {}, import('../types.js').Request, AWSFramework>) => Promise<any>) => (event: AWSLambda.APIGatewayEvent, context: AWSLambda.Context) => Promise<any>}
 */
const useLambda = (options) => (func) => async (event, context) => {
  return await func({
    args: {},
    services: {},
    auth: {},
    response: {},
    request: {},
    framework: {
      event,
      context
    }
  });
};

/**
 * @template TArgs
 * @template TGivenArgs
 * @template TGivenServices
 * @template TGivenAuth
 * @template TGivenRequest
 * @template TGivenFramework
 * @param {(yup: any) => KeyOfType<TArgs, any>} shapeMaker
 * @returns {(func: (props: import('../types.js').Props<TArgs & TGivenArgs, TGivenServices, TGivenAuth, TGivenRequest, TGivenFramework>) => Promise<any>) => (props: import('../types.js').Props<TGivenArgs, TGivenServices, TGivenAuth, TGivenRequest, TGivenFramework>) => Promise<any>}
 */
const useJsonArgs = (shapeMaker) => (func) => async (props) => {
  return await func({
    ...props,
    args: {
      ...props.args,
      ...shapeMaker({})
    }
  });
};

/**
 * @typedef {Object} TokenAuth
 * @property {{ iss: string }} token
 */

/**
 * @template TGivenServices
 * @template TGivenArgs
 * @template TGivenAuth
 * @template TGivenRequest
 * @template TGivenFramework
 * @returns {(func: (props: import('../types.js').Props<TGivenArgs, TGivenServices, TGivenAuth & TokenAuth, TGivenRequest, TGivenFramework>) => Promise<any>) => (props: import('../types.js').Props<TGivenArgs, TGivenServices, TGivenAuth, TGivenRequest, TGivenFramework>) => Promise<any>}
 */
const useAuth = () => (func) => async (props) => {
  return await func({
    ...props,
    auth: {
      ...props.auth,
      token: {
        iss: 'token.iss.mock'
      }
    }
  });
};

/**
 * @returns {(func: (...args: any[]) => Promise<any>) => (...args: any[]) => Promise<any>}
 */
const useConsoleIntercept = () => (func) => async (...args) => {
  // override console.log
  return await func(...args);
};

/**
 * @template TServices
 * @template TGivenArgs
 * @template TGivenServices
 * @template TGivenAuth
 * @template TRequest
 * @template TFramework
 * @param {TServices} services
 * @returns {(func: (props: import('../types.js').Props<TGivenArgs, TServices & TGivenServices, TGivenAuth, TRequest, TFramework>) => Promise<any>) => (props: import('../types.js').Props<TGivenArgs, TGivenServices, TGivenAuth, TRequest, TFramework>) => Promise<any>}
 */
const useServices = (services) => (func) => async (props) => {
  return await func({
    ...props,
    services: {
      ...props.services,
      ...services
    }
  });
};

/**
 * @template TGivenFramework
 * @template TGivenArgs
 * @template TGivenServices
 * @template TGivenAuth
 * @template TGivenRequest
 * @param {string} name
 * @returns {(func: (props: import('../types.js').Props<TGivenArgs, TGivenServices & { logger: { name: string } }, TGivenAuth, TGivenRequest, TGivenFramework>) => Promise<any>) => (props: import('../types.js').Props<TGivenArgs, TGivenServices, TGivenAuth, TGivenRequest, TGivenFramework>) => Promise<any>}
 */
const useLambdaLogger = (name) => (func) => async (props) => {
  return await func({
    ...props,
    services: {
      ...props.services,
      logger: {
        name
      }
    }
  });
};

describe('lumo function builder', () => {
  test('fully built function builds correct types', async () => {
    const handler = lumo()
      .init(useConsoleIntercept())
      .root(useLambda())
      .hook(useLambdaLogger('lambda.logger'))
      .hook(
        useJsonArgs((yup) => ({
          message: 'hello'
        }))
      )
      .hook(
        useJsonArgs((yup) => ({
          id: 't.user.w91f0s2lsav7amo2'
        }))
      )
      .hook(
        useServices({
          database: 'database'
        })
      )
      .hook(useAuth())
      .endpoint(addTweet);

    const result = await handler(
      {
        id: 'aws.api-gateway.proxy.event'
      },
      { id: 'aws.context' }
    );

    expect(result).toBeDefined();
  });
}); 