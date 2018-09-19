import http from "./http.js"
import { host } from "./../config.js"
export default {
  // 认证接口
  auth: (data, cb, errcb) => http(host + 'weapp/v1/auth', data, 'GET', cb)
}