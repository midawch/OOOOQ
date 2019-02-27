//user.js
import {host,hostObj,state} from "./../../config.js"
//获取应用实例
const app = getApp()
Page({
  data: {
    userInfo: {},
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    openid: 0
  },
  onLoad: function () {
    let that = this
    wx.login({
      success: (res) =>{
        wx.request({
          url: hostObj.auth + "code="+ res.code + '&state=' + state,
          method: 'GET',
          success: (res)=>{
            that.setData({
              openid: res.data.data.result.openid
            })
          }
        })
      }
    })
  },
  getUserInfoAgain: function(e){
    let that = this
    let userInfo = e.detail.userInfo
    wx.setStorage({
      key: "userInfo",
      data: {
        userId : that.data.openid,
        // userId : that.data.openid + new Date().getTime(),
        name: userInfo.nickName,
        avatar: userInfo.avatarUrl
      }
    })
    wx.navigateTo({
      url: './../../pages/user/user'
    })
  }
})
