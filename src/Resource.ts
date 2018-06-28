import axios, { AxiosInstance } from "axios"

export interface ResourceAction {
  requestFn: Function
  onSuccess: Function
  onError: Function
  property: string
  dispatchString: string
  commitString: string
  axios: AxiosInstance
  autoCommit: boolean
}

export interface ResourceActionMap {
  [action: string]: ResourceAction
}

export interface ShorthandResourceActionOptions {
  action: string
  property?: string
  path: Function | string
  onSuccess?: Function
  onError?: Function
  requestConfig?: Object
  queryParams?: Boolean
  autoCommit?: boolean
}

export interface ResourceActionOptions extends ShorthandResourceActionOptions {
  method: string
}

export interface ResourceOptions {
  baseURL?: string,
  state?: Object,
  axios?: AxiosInstance,
  queryParams?: Boolean
}

export class Resource {
  private baseURL: string
  private readonly HTTPMethod: Array<string> = ["get", "delete", "head", "options", "post", "put", "patch"]
  public actions: ResourceActionMap = {}
  public state: Object
  public axios: AxiosInstance
  private queryParams: Boolean

  constructor(options: ResourceOptions) {
    this.baseURL = options.baseURL
    this.actions = {}
    this.state = options.state || {}
    this.axios = options.axios || axios
    this.queryParams = options.queryParams || false
  }

  add(options: ResourceActionOptions): Resource {
    options.method = options.method || "get"
    options.requestConfig = options.requestConfig || {}
    options.property = options.property || null

    if (this.HTTPMethod.indexOf(options.method) === -1) {
      const methods = this.HTTPMethod.join(", ")
      throw new Error(`Illegal HTTP method set. Following methods are allowed: ${methods}. You chose "${options.method}".`)
    }

    let urlFn: Function
    if (typeof options.path === "function") {
      const pathFn: Function = options.path
      urlFn = (params: Object) => pathFn(params)
    } else {
      urlFn = () => options.path
    }

    this.actions[options.action] = {
      requestFn: (params: Object = {}, data: Object = {}) => {

        let queryParams
        // use action specific queryParams if set
        if (options.queryParams !== undefined) {
          queryParams = options.queryParams
          // otherwise use Resource-wide queryParams
        } else {
          queryParams = this.queryParams
        }

        const requestConfig = Object.assign({}, options.requestConfig)
        const paramsSerializer = options.requestConfig["paramsSerializer"] !== undefined ||
          this.axios.defaults.paramsSerializer !== undefined
        if (queryParams || paramsSerializer) {
          requestConfig["params"] = params
        }

        // This is assignment is made to respect the priority of the base URL
        // It is as following: baseURL > axios instance base URL > request config base URL
        const requestConfigWithProperBaseURL = Object.assign({
          baseURL: this.normalizedBaseURL
        }, requestConfig)

        if (["post", "put", "patch"].indexOf(options.method) > -1) {
          return this.axios[options.method](urlFn(params), data, requestConfigWithProperBaseURL)
        } else {
          return this.axios[options.method](urlFn(params), requestConfigWithProperBaseURL)
        }
      },
      property: options.property,
      onSuccess: options.onSuccess,
      onError: options.onError,
      dispatchString: this.getDispatchString(options.action),
      commitString: this.getCommitString(options.action),
      axios: this.axios,
      autoCommit: options.autoCommit
    }

    return this
  }

  private get normalizedBaseURL(): string {
    return this.baseURL || this.axios.defaults.baseURL || ""
  }

  private getDispatchString(action: string): string {
    return action
  }

  private getCommitString(action: string): string {
    const capitalizedAction: string = action.replace(/([A-Z])/g, "_$1").toUpperCase()
    return capitalizedAction
  }
}

export default Resource
