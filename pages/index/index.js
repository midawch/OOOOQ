//index.js
import {host,hostObj,state} from "./../../config.js"
import fetch from "./../../fetch/index.js"
//获取应用实例
const app = getApp()
Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    gameInfo: {},
    openid: 0
  },
  onLoad: function () {
    let that = this
    this.getAuth()

  },
  getAuth: function(){
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
            that.getGameInfo(res.data.data.result.openid)
          }
        })
      }
    })
  },
  //获取对战信息
  getGameInfo: function(id){
    let that = this
    wx.request({
      url: hostObj.record + "uid=" + id,
      method: 'GET',
      success: (res)=>{
        if(res.data.data){
          let winP = ((res.data.data.win_times / res.data.data.times) * 100).toFixed(0) + '%'
          res.data.data.winP = winP
        }else{
          res.data.data = {
            times: 0,
            win_times: 0,
            winP: '0%'
          }
        }
        that.setData({
          gameInfo: res.data.data
        })
      }
    })
  },
  playGame: function(){

  },
  onGotUserInfo: function(e) {
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
      url: './../../pages/pk/pk'
    })
  },
})
